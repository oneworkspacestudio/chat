package workspace

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/tinode/chat/server/store"
	"github.com/tinode/chat/server/store/types"
)

type DirectoryUser struct {
	Subject  string `json:"subject"`
	Username string `json:"username"`
	Name     string `json:"name"`
	Email    string `json:"email,omitempty"`
	Disabled bool   `json:"disabled,omitempty"`
	Topic    string `json:"topic,omitempty"`
}
type DirectorySnapshot struct {
	Issuer string          `json:"issuer"`
	Users  []DirectoryUser `json:"users"`
}

// This engine route is private to the gateway, never forwarded from a browser.
// A separate per-installation HMAC authenticates the entire bounded snapshot.
func RegisterDirectory(mux *http.ServeMux) {
	mux.HandleFunc("POST /internal/workspace/directory", func(w http.ResponseWriter, r *http.Request) {
		a := managedAuthenticator
		body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 8<<20))
		if err != nil {
			http.Error(w, "Directory too large", 413)
			return
		}
		signature, err := hex.DecodeString(r.Header.Get("X-Workspace-Directory"))
		mac := hmac.New(sha256.New, a.key)
		mac.Write(body)
		if err != nil || len(a.key) < 32 || !hmac.Equal(signature, mac.Sum(nil)) {
			http.Error(w, "Unauthorized", 401)
			return
		}
		var snapshot DirectorySnapshot
		if json.Unmarshal(body, &snapshot) != nil || snapshot.Issuer == "" || len(snapshot.Users) > 10000 {
			http.Error(w, "Invalid directory", 400)
			return
		}
		seen := map[string]bool{}
		for _, u := range snapshot.Users {
			if u.Subject == "" || u.Username == "" || len(u.Subject) > 512 || len(u.Name) > 512 || seen[u.Subject] {
				http.Error(w, "Invalid directory member", 400)
				return
			}
			seen[u.Subject] = true
		}
		a.mu.Lock()
		defer a.mu.Unlock()
		result := []DirectoryUser{}
		for _, u := range snapshot.Users {
			if u.Disabled {
				sum := sha256.Sum256([]byte(snapshot.Issuer + "\x00" + u.Subject))
				unique := identityKey(sum)
				uid, _, fingerprint, _, e := store.Users.GetAuthUniqueRecord(a.name, unique)
				if e != nil {
					http.Error(w, "Directory update unavailable", 503)
					return
				}
				if !uid.IsZero() {
					if !hmac.Equal(fingerprint, []byte(hex.EncodeToString(sum[:]))) {
						http.Error(w, "Identity conflict", 409)
						return
					}
					user, e := store.Users.Get(uid)
					if e != nil {
						http.Error(w, "Directory update unavailable", 503)
						return
					}
					if user != nil && user.State == types.StateOK {
						if store.Users.UpdateState(uid, types.StateSuspended) != nil {
							http.Error(w, "Directory update unavailable", 503)
							return
						}
					}
				}
				continue
			}
			u.Name = strings.TrimSpace(u.Name)
			if u.Name == "" {
				u.Name = u.Username
			}
			uid, e := a.ensureUser(Ticket{Issuer: snapshot.Issuer, Subject: u.Subject, Name: u.Name, Email: u.Email, Username: u.Username}, true)
			if e != nil {
				http.Error(w, "Directory update unavailable", 503)
				return
			}
			u.Topic = uid.UserId()
			result = append(result, u)
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		json.NewEncoder(w).Encode(map[string]any{"users": result})
	})
}
