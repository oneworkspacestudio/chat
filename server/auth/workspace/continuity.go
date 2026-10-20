package workspace

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"github.com/tinode/chat/server/store"
	"github.com/tinode/chat/server/store/types"
	"net/http"
	"regexp"
)

var continuityClientID = regexp.MustCompile(`^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$`)

// Only the authenticated gateway can call this engine route. Browser-selected
// UIDs never determine the caller. No membership or conversation is created here.
func registerContinuity(mux *http.ServeMux) {
	mux.HandleFunc("POST /internal/workspace/continuity", func(w http.ResponseWriter, r *http.Request) {
		uid, err := BoundGatewayUser(r)
		if err != nil {
			http.Error(w, "Unauthorized", 401)
			return
		}
		var request struct {
			Peer string   `json:"peer"`
			IDs  []string `json:"ids"`
		}
		if json.NewDecoder(http.MaxBytesReader(w, r.Body, 2048)).Decode(&request) != nil || len(request.IDs) > 32 {
			http.Error(w, "Invalid peer", 400)
			return
		}
		peer := types.ParseUserId(request.Peer)
		for _, id := range request.IDs {
			if !continuityClientID.MatchString(id) {
				http.Error(w, "Invalid message ID", 400)
				return
			}
		}
		if peer.IsZero() || peer == uid {
			http.Error(w, "Invalid peer", 400)
			return
		}
		epoch, err := ContinuityEpoch(uid, peer)
		if err != nil {
			code := 503
			if err == types.ErrPermissionDenied {
				code = 403
			}
			http.Error(w, "Both people must have an active readable and writable conversation", code)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		receipts := map[string]int{}
		for _, id := range request.IDs {
			seq, _, err := store.ClientMessageReceipt(uid.P2PName(peer), peer.String(), id)
			if err != nil && err != types.ErrNotFound {
				http.Error(w, "Receipts unavailable", 503)
				return
			}
			if seq > 0 {
				messages, err := store.Messages.GetAll(uid.P2PName(peer), uid, &types.QueryOpt{Since: seq, Before: seq + 1, Limit: 1})
				if err != nil {
					http.Error(w, "Receipts unavailable", 503)
					return
				}
				if len(messages) == 0 {
					seq = -1
				}
			}
			receipts[id] = seq
		}
		json.NewEncoder(w).Encode(map[string]any{"uid": uid.UserId(), "epoch": epoch, "receipts": receipts})
	})
}

// ContinuityEpoch also fences delayed outbox publication against deleted and
// recreated conversations. Ordinary clients cannot bypass this on reconnect.
func ContinuityEpoch(uid, peer types.Uid) (string, error) {
	if uid.IsZero() || peer.IsZero() || uid == peer {
		return "", types.ErrPermissionDenied
	}
	topic := uid.P2PName(peer)
	first, e1 := store.Subs.Get(topic, uid, false)
	second, e2 := store.Subs.Get(topic, peer, false)
	user, eu := store.Users.Get(peer)
	if e1 != nil {
		return "", e1
	}
	if e2 != nil {
		return "", e2
	}
	if eu != nil {
		return "", eu
	}
	allowed := func(s *types.Subscription) bool {
		return s != nil && s.DeletedAt == nil && (s.ModeWant&s.ModeGiven)&(types.ModeJoin|types.ModeRead|types.ModeWrite) == (types.ModeJoin|types.ModeRead|types.ModeWrite)
	}
	if user == nil || user.State != types.StateOK || !allowed(first) || !allowed(second) {
		return "", types.ErrPermissionDenied
	}
	if uid.Compare(peer) > 0 {
		first, second = second, first
	}
	epoch := sha256.Sum256([]byte(topic + "\x00" + first.CreatedAt.String() + "\x00" + second.CreatedAt.String()))
	return hex.EncodeToString(epoch[:]), nil
}
