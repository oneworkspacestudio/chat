//go:build windows

package workspace

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

type continuitySignal struct {
	From string `json:"from"`
	Type string `json:"type"`
	SDP  string `json:"sdp"`
}
type continuityDevice struct {
	Session          *loginSession
	UID, Peer, Epoch string
	Expires          time.Time
	Seen             time.Time
	Queue            []continuitySignal
}
type continuityICE struct {
	URLs       []string `json:"urls"`
	Username   string   `json:"username,omitempty"`
	Credential string   `json:"credential,omitempty"`
}

var continuityID = regexp.MustCompile(`^[a-f0-9-]{36}$`)
var continuityUID = regexp.MustCompile(`^usr[A-Za-z0-9_-]{11}$`)

func (g *Gateway) continuity(w http.ResponseWriter, r *http.Request, s *loginSession) {
	if r.Method != "POST" {
		w.WriteHeader(405)
		return
	}
	if !g.sameOrigin(r) {
		http.Error(w, "Chat request origin rejected", 403)
		return
	}
	var input struct {
		Action, Device, Peer, Target, Type, SDP string
		IDs                                     []string
		PublicKey                               *continuityPublicKey
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10))
	decoder.DisallowUnknownFields()
	if decoder.Decode(&input) != nil || !continuityID.MatchString(input.Device) || !continuityUID.MatchString(input.Peer) || len(input.IDs) > 32 {
		http.Error(w, "Invalid direct connection request", 400)
		return
	}
	if input.PublicKey != nil && !input.PublicKey.valid() {
		http.Error(w, "Invalid device identity", 400)
		return
	}
	if input.Action != "poll" && input.Action != "signal" && input.Action != "join" && input.Action != "leave" && input.Action != "receipts" {
		http.Error(w, "Unknown direct connection action", 400)
		return
	}
	// Recheck both memberships while online, including block/delete/suspension.
	// A failed engine is an outage, not an instruction to trust a new connection.
	body, _ := json.Marshal(map[string]any{"peer": input.Peer, "ids": input.IDs})
	request, _ := http.NewRequestWithContext(r.Context(), "POST", g.engine+"/internal/workspace/continuity", bytes.NewReader(body))
	request.Header.Set("X-Workspace-Gateway", g.signedTicket(s))
	response, err := (&http.Client{Timeout: 5 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}).Do(request)
	if err != nil {
		http.Error(w, "Direct connection authorization is reconnecting", 503)
		return
	}
	defer response.Body.Close()
	var binding struct {
		UID      string         `json:"uid"`
		Epoch    string         `json:"epoch"`
		Receipts map[string]int `json:"receipts"`
	}
	if response.StatusCode != 200 || json.NewDecoder(io.LimitReader(response.Body, 4096)).Decode(&binding) != nil || !continuityUID.MatchString(binding.UID) || len(binding.Epoch) != 64 {
		code := 503
		if response.StatusCode == 403 || response.StatusCode == 401 {
			code = 403
		}
		http.Error(w, "Direct fallback requires an existing conversation with both people's permission", code)
		return
	}
	if input.Action == "receipts" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(binding)
		return
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.continuityDevices == nil {
		g.continuityDevices = map[string]*continuityDevice{}
	}
	now := time.Now()
	for id, device := range g.continuityDevices {
		if now.After(device.Expires) || now.Sub(device.Seen) > 2*time.Minute || device.Session.Context != nil && device.Session.Context.Err() != nil {
			delete(g.continuityDevices, id)
		}
	}
	device := g.continuityDevices[input.Device]
	if device != nil && (device.Session != s || device.Peer != input.Peer) {
		http.Error(w, "Device binding rejected", 403)
		return
	}
	if input.Action == "leave" {
		delete(g.continuityDevices, input.Device)
		w.WriteHeader(204)
		return
	}
	if input.Action == "join" && device == nil {
		count := 0
		for _, d := range g.continuityDevices {
			if d.UID == binding.UID {
				count++
			}
		}
		if len(g.continuityDevices) >= 128 || count >= 8 {
			http.Error(w, "Close an unused direct connection first", 429)
			return
		}
		expires := now.Add(2 * time.Hour)
		if s.Expires.Before(expires) {
			expires = s.Expires
		}
		device = &continuityDevice{Session: s, UID: binding.UID, Peer: input.Peer, Epoch: binding.Epoch, Expires: expires, Queue: []continuitySignal{}}
		g.continuityDevices[input.Device] = device
	}
	if device == nil {
		http.Error(w, "Direct session expired; enable it again", 410)
		return
	}
	if device.Epoch != binding.Epoch {
		delete(g.continuityDevices, input.Device)
		http.Error(w, "Conversation changed; enable fallback again", 403)
		return
	}
	device.Seen = now
	// Successful authoritative checks renew an active lease. Offline clients
	// cannot extend it themselves, including at the independent rendezvous.
	device.Expires = now.Add(2 * time.Hour)
	if s.Expires.Before(device.Expires) {
		device.Expires = s.Expires
	}
	if input.Action == "signal" {
		target := g.continuityDevices[input.Target]
		if target == nil || target.Peer != device.UID || target.UID != device.Peer || target.Epoch != device.Epoch || now.After(target.Expires) {
			http.Error(w, "Other person has not enabled direct fallback", 409)
			return
		}
		if (input.Type != "offer" && input.Type != "answer") || len(input.SDP) < 20 || len(input.SDP) > 48<<10 || len(target.Queue) >= 4 {
			http.Error(w, "Invalid or excessive signaling", 400)
			return
		}
		target.Queue = append(target.Queue, continuitySignal{input.Device, input.Type, input.SDP})
	}
	peers := []map[string]any{}
	for id, d := range g.continuityDevices {
		if d.Peer == device.UID && d.UID == device.Peer && d.Epoch == device.Epoch {
			peers = append(peers, map[string]any{"device": id, "expires": d.Expires.UnixMilli()})
		}
	}
	queue := device.Queue
	device.Queue = []continuitySignal{}
	// Public discovery uses a free STUN endpoint for address discovery. Private
	// ICE configuration can replace this, including authenticated TURN if needed.
	ice := []continuityICE{}
	if input.PublicKey != nil {
		ice = []continuityICE{{URLs: []string{"stun:stun.cloudflare.com:3478"}}}
	}
	if raw, e := os.ReadFile(filepath.Join(g.config.Data, "continuity-ice.json")); e == nil && len(raw) < 8192 {
		var candidate []continuityICE
		valid := json.Unmarshal(raw, &candidate) == nil && len(candidate) <= 8
		for _, item := range candidate {
			if len(item.URLs) == 0 || len(item.URLs) > 4 || len(item.Username) > 512 || len(item.Credential) > 1024 {
				valid = false
			}
			for _, url := range item.URLs {
				if len(url) > 512 || !(strings.HasPrefix(url, "stun:") || strings.HasPrefix(url, "stuns:") || strings.HasPrefix(url, "turn:") || strings.HasPrefix(url, "turns:")) {
					valid = false
				}
			}
		}
		if valid {
			ice = candidate
		}
	}
	discovery, err := g.continuityDiscoveryGrant(device, input.PublicKey)
	if err != nil {
		http.Error(w, "Device connection permission could not be prepared; messages remain available through Chat", 503)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"uid": device.UID, "epoch": device.Epoch, "expires": device.Expires.UnixMilli(), "peers": peers, "signals": queue, "iceServers": ice, "relay": g.continuityRelayGrant(device), "discovery": discovery})
}
