//go:build windows

package workspace

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	workspaceauth "github.com/tinode/chat/server/auth/workspace"
)

func TestProxyKeepsPublicMediaBase(t *testing.T) {
	engine := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/chat/v0/file/s/test.txt" {
			t.Errorf("media path changed to %q", r.URL.Path)
		}
		if r.Header.Get("Cookie") != "" || r.Header.Get("Authorization") != "" {
			t.Error("browser/provider credentials leaked to engine")
		}
		w.Write([]byte("fixture"))
	}))
	defer engine.Close()
	g, err := NewGateway(context.Background(), Config{Origin: "http://localhost/chat"}, []byte(strings.Repeat("k", 32)), "api-key", engine.URL, "")
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	g.sessions["fixture"] = &loginSession{Expires: time.Now().Add(time.Minute), Context: ctx, Cancel: cancel}
	r := httptest.NewRequest("GET", "http://localhost/chat/v0/file/s/test.txt", nil)
	r.AddCookie(&http.Cookie{Name: "chat_session", Value: "fixture"})
	r.Header.Set("Authorization", "Bearer provider-credential")
	w := httptest.NewRecorder()
	g.ServeHTTP(w, r)
	if w.Code != 200 || w.Body.String() != "fixture" || !strings.Contains(w.Header().Get("Content-Security-Policy"), "sandbox") {
		t.Fatalf("media response incorrect: %d", w.Code)
	}
}

func TestDirectorySearch(t *testing.T) {
	g := &Gateway{directoryReady: true, directoryUsers: []workspaceauth.DirectoryUser{
		{Subject: "alice", Username: "alice-tester", Name: "Alice Tester", Email: "alice@example.test", Topic: "usrAAAAAAAAAAA"},
		{Subject: "bob", Username: "bob-tester", Name: "Bob Tester", Email: "bob@example.test", Topic: "usrBBBBBBBBBBB"},
	}}
	s := &loginSession{Ticket: workspaceauth.Ticket{Subject: "alice"}}
	for _, q := range []string{"Bob", "BOB-TESTER", "bob@example.test", "usrBBBBBBBBBBB", "bob"} {
		r := httptest.NewRequest("GET", "http://localhost/api/people?q="+q, nil)
		w := httptest.NewRecorder()
		g.findPeople(w, r, s)
		if w.Code != 200 || !strings.Contains(w.Body.String(), "usrBBBBBBBBBBB") || strings.Contains(w.Body.String(), "usrAAAAAAAAAAA") {
			t.Fatalf("search %q: %d %s", q, w.Code, w.Body.String())
		}
	}
	g.directoryReady = false
	w := httptest.NewRecorder()
	g.findPeople(w, httptest.NewRequest("GET", "http://localhost/api/people?q=Bob", nil), s)
	if w.Code != 503 {
		t.Fatalf("unsynchronized directory returned %d", w.Code)
	}
}

func TestDirectoryPrivateAndSessionProtected(t *testing.T) {
	g := &Gateway{config: Config{DirectoryToken: strings.Repeat("x", 32)}, base: "/chat", sessions: map[string]*loginSession{}}
	for _, path := range []string{"/api/people?q=Bob", "/internal/workspace/directory"} {
		w := httptest.NewRecorder()
		g.ServeHTTP(w, httptest.NewRequest("GET", "http://localhost/chat"+path, nil))
		if w.Code != 401 {
			t.Fatalf("unauthenticated %s returned %d", path, w.Code)
		}
	}
	for _, token := range []string{"", "Bearer wrong"} {
		r := httptest.NewRequest("POST", "http://localhost/api/directory/sync", strings.NewReader(`{"users":[]}`))
		r.RemoteAddr = "127.0.0.1:1234"
		r.Header.Set("Authorization", token)
		w := httptest.NewRecorder()
		g.syncDirectory(w, r)
		if w.Code != 403 {
			t.Fatalf("invalid token returned %d", w.Code)
		}
	}
}

func TestDirectorySyncRevokesRemovedSessions(t *testing.T) {
	engine := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Workspace-Directory") == "" {
			t.Error("missing engine authentication")
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"users":[{"subject":"alice","username":"alice","name":"Alice","topic":"usrAAAAAAAAAAA"}]}`))
	}))
	defer engine.Close()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	g := &Gateway{config: Config{DirectoryToken: strings.Repeat("x", 32), Issuer: "https://accounts.example.test"}, engine: engine.URL, key: []byte(strings.Repeat("k", 32)), sessions: map[string]*loginSession{"bob": {Ticket: workspaceauth.Ticket{Subject: "bob"}, Context: ctx, Cancel: cancel}}}
	r := httptest.NewRequest("POST", "http://localhost/api/directory/sync", strings.NewReader(`{"users":[]}`))
	r.RemoteAddr = "127.0.0.1:1234"
	r.Header.Set("Authorization", "Bearer "+g.config.DirectoryToken)
	w := httptest.NewRecorder()
	g.syncDirectory(w, r)
	if w.Code != 200 || !g.directoryReady || len(g.sessions) != 0 {
		t.Fatalf("sync failed: %d", w.Code)
	}
	select {
	case <-ctx.Done():
	default:
		t.Error("removed member kept an active session")
	}
}
