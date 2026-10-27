//go:build windows

package workspace

import (
	"bytes"
	"crypto/hmac"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"time"
)

func (g *Gateway) privateRequest(r *http.Request) bool {
	host, _, _ := net.SplitHostPort(r.RemoteAddr)
	return net.ParseIP(host) != nil && net.ParseIP(host).IsLoopback() && len(g.config.DirectoryToken) >= 32 && hmac.Equal([]byte(r.Header.Get("Authorization")), []byte("Bearer "+g.config.DirectoryToken))
}

// A browser cookie from another hostname is neither required nor forwarded.
// Revocation is scoped to a verified immutable MyAccounts identity.
func (g *Gateway) revokeSessions(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" || !g.privateRequest(r) {
		http.Error(w, "Private Workspace integration", 403)
		return
	}
	var identity struct {
		Issuer  string `json:"issuer"`
		Subject string `json:"subject"`
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096))
	decoder.DisallowUnknownFields()
	if decoder.Decode(&identity) != nil || identity.Issuer != g.config.Issuer || identity.Subject == "" || decoder.Decode(new(any)) != io.EOF {
		http.Error(w, "Invalid identity", 400)
		return
	}
	g.mu.Lock()
	for id, session := range g.sessions {
		if session.Ticket.Issuer == identity.Issuer && session.Ticket.Subject == identity.Subject {
			session.Cancel()
			delete(g.sessions, id)
		}
	}
	g.mu.Unlock()
	if g.revokeNativeIdentity(identity.Subject) != nil {
		http.Error(w, "Linked device revocation could not be saved; retry", 503)
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(204)
}

func (g *Gateway) workspaceApps(w http.ResponseWriter, r *http.Request, session *loginSession) {
	if r.Method != "GET" {
		w.WriteHeader(405)
		return
	}
	if g.config.CatalogURL == "" {
		http.Error(w, "Standalone Chat has no connected Workspace catalog", 404)
		return
	}
	body, _ := json.Marshal(map[string]string{"issuer": session.Ticket.Issuer, "subject": session.Ticket.Subject})
	request, err := http.NewRequestWithContext(r.Context(), "POST", g.config.CatalogURL, bytes.NewReader(body))
	if err != nil {
		http.Error(w, "Workspace navigation unavailable", 503)
		return
	}
	request.Header.Set("Authorization", "Bearer "+g.config.DirectoryToken)
	request.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 5 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	response, err := client.Do(request)
	if err != nil {
		http.Error(w, "Workspace navigation is reconnecting. Your conversation remains open.", 503)
		return
	}
	defer response.Body.Close()
	if response.StatusCode != 200 {
		http.Error(w, "Workspace navigation unavailable", 503)
		return
	}
	data, err := io.ReadAll(io.LimitReader(response.Body, 1<<20))
	if err != nil || !json.Valid(data) {
		http.Error(w, "Workspace navigation unavailable", 503)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}
