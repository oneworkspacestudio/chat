//go:build windows

package workspace

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"sort"
	"strings"
	"time"

	workspaceauth "github.com/tinode/chat/server/auth/workspace"
)

func (g *Gateway) syncDirectory(w http.ResponseWriter, r *http.Request) {
	host, _, _ := net.SplitHostPort(r.RemoteAddr)
	if r.Method != "POST" || net.ParseIP(host) == nil || !net.ParseIP(host).IsLoopback() || len(g.config.DirectoryToken) < 32 || !hmac.Equal([]byte(r.Header.Get("Authorization")), []byte("Bearer "+g.config.DirectoryToken)) {
		http.Error(w, "Directory synchronization is private to Workspace.", 403)
		return
	}
	var snapshot workspaceauth.DirectorySnapshot
	if json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<20)).Decode(&snapshot) != nil || len(snapshot.Users) > 10000 {
		http.Error(w, "Invalid member directory", 400)
		return
	}
	// The external request cannot select another issuer or native user ID.
	snapshot.Issuer = g.config.Issuer
	for i := range snapshot.Users {
		snapshot.Users[i].Topic = ""
	}
	body, _ := json.Marshal(snapshot)
	request, err := http.NewRequestWithContext(r.Context(), "POST", g.engine+"/internal/workspace/directory", bytes.NewReader(body))
	if err != nil {
		http.Error(w, "Chat directory is unavailable", 503)
		return
	}
	mac := hmac.New(sha256.New, g.key)
	mac.Write(body)
	request.Header.Set("X-Workspace-Directory", hex.EncodeToString(mac.Sum(nil)))
	client := &http.Client{Timeout: 60 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	response, err := client.Do(request)
	if err != nil {
		http.Error(w, "Chat directory is reconnecting", 503)
		return
	}
	defer response.Body.Close()
	var result struct {
		Users []workspaceauth.DirectoryUser `json:"users"`
	}
	if response.StatusCode != 200 || json.NewDecoder(io.LimitReader(response.Body, 8<<20)).Decode(&result) != nil {
		http.Error(w, "Chat could not update its member directory", 503)
		return
	}
	active := map[string]bool{}
	for _, u := range result.Users {
		active[u.Subject] = true
	}
	g.mu.Lock()
	g.directoryUsers = result.Users
	g.directoryReady = true
	for key, session := range g.sessions {
		if !active[session.Ticket.Subject] {
			session.Cancel()
			delete(g.sessions, key)
		}
	}
	g.mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	json.NewEncoder(w).Encode(map[string]any{"members": len(result.Users)})
}

func (g *Gateway) findPeople(w http.ResponseWriter, r *http.Request, s *loginSession) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if len(q) < 2 || len(q) > 200 {
		http.Error(w, "Enter at least two characters of a name, username, email or Chat ID.", 400)
		return
	}
	g.mu.Lock()
	ready := g.directoryReady
	users := append([]workspaceauth.DirectoryUser{}, g.directoryUsers...)
	g.mu.Unlock()
	if !ready {
		http.Error(w, "The member directory is connecting to MyAccounts. Please try again shortly.", 503)
		return
	}
	q = strings.ToLower(q)
	sort.Slice(users, func(i, j int) bool { return strings.ToLower(users[i].Name) < strings.ToLower(users[j].Name) })
	results := []map[string]any{}
	for _, u := range users {
		if u.Subject == s.Ticket.Subject {
			continue
		}
		if strings.Contains(strings.ToLower(u.Name), q) || strings.Contains(strings.ToLower(u.Username), q) || (u.Email != "" && strings.Contains(strings.ToLower(u.Email), q)) || strings.ToLower(u.Topic) == q || strings.ToLower(u.Subject) == q {
			results = append(results, map[string]any{"topic": u.Topic, "user": u.Topic, "public": map[string]any{"fn": u.Name}, "private": map[string]any{"comment": u.Username}})
			if len(results) == 50 {
				break
			}
		}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"users": results})
}
