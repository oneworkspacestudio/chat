//go:build windows

package workspace

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	auth "github.com/tinode/chat/server/auth/workspace"
)

func TestDedicatedOriginRequiresDifferentCookieHostname(t *testing.T) {
	for _, origin := range []string{"https://workspace.example.test/chat", "https://workspace.example.test:8443/chat"} {
		if validate(Config{Listen: "127.0.0.1:9006", Origin: origin, WorkspaceOrigin: "https://workspace.example.test"}) == nil {
			t.Fatal("same cookie host accepted")
		}
	}
	if err := validate(Config{Listen: "127.0.0.1:9006", Origin: "http://127.0.0.1:9006/chat", WorkspaceOrigin: "http://localhost:8990"}); err != nil {
		t.Fatal(err)
	}
}

func TestDedicatedCookiesAndHostGuard(t *testing.T) {
	g, err := NewGateway(context.Background(), Config{Origin: "https://chat.example.test/chat", WorkspaceOrigin: "https://workspace.example.test"}, []byte(strings.Repeat("k", 32)), "api", "http://127.0.0.1:1", t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	w := httptest.NewRecorder()
	g.cookie(w, "chat_session", "opaque", 300)
	cookie := w.Result().Cookies()[0]
	if cookie.Name != "__Host-chat_session" || cookie.Domain != "" || cookie.Path != "/" || !cookie.HttpOnly || !cookie.Secure || cookie.SameSite != http.SameSiteLaxMode {
		t.Fatal("dedicated cookie scope incorrect")
	}
	w = httptest.NewRecorder()
	g.ServeHTTP(w, httptest.NewRequest("GET", "https://workspace.example.test/chat/auth/login", nil))
	if w.Code != 421 {
		t.Fatal("old shared host reached auth handler")
	}
}

func TestPrivateRevocationCancelsOnlyVerifiedAccount(t *testing.T) {
	token := strings.Repeat("r", 40)
	g := &Gateway{config: Config{Issuer: "https://accounts.example.test", DirectoryToken: token}, sessions: map[string]*loginSession{}}
	contexts := map[string]context.Context{}
	for _, subject := range []string{"alice", "bob"} {
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()
		contexts[subject] = ctx
		g.sessions[subject] = &loginSession{Ticket: auth.Ticket{Issuer: g.config.Issuer, Subject: subject}, Expires: time.Now().Add(time.Hour), Context: ctx, Cancel: cancel}
	}
	request := func(subject, authorization, remote string) int {
		r := httptest.NewRequest("POST", "http://127.0.0.1/api/session/revoke", strings.NewReader(`{"issuer":"https://accounts.example.test","subject":"`+subject+`"}`))
		r.RemoteAddr = remote
		r.Header.Set("Authorization", authorization)
		w := httptest.NewRecorder()
		g.revokeSessions(w, r)
		return w.Code
	}
	if request("alice", "Bearer wrong", "127.0.0.1:1234") != 403 || request("alice", "Bearer "+token, "192.0.2.1:1234") != 403 {
		t.Fatal("public revocation accepted")
	}
	if contexts["alice"].Err() != nil {
		t.Fatal("rejected request changed account")
	}
	if request("alice", "Bearer "+token, "127.0.0.1:1234") != 204 || contexts["alice"].Err() == nil || contexts["bob"].Err() != nil {
		t.Fatal("revocation scope incorrect")
	}
}
