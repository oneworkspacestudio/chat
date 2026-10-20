//go:build windows

package workspace

import (
	"context"
	"encoding/json"
	auth "github.com/tinode/chat/server/auth/workspace"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestContinuityMailboxBindings(t *testing.T) {
	allowed := true
	engine := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/internal/workspace/continuity" || r.Header.Get("X-Workspace-Gateway") == "" {
			t.Error("missing engine account binding")
		}
		if !allowed {
			w.WriteHeader(403)
			return
		}
		// A controlled authorization service stub, not an end-to-end membership test.
		var request struct{ Peer string }
		json.NewDecoder(r.Body).Decode(&request)
		uid := "usrAAAAAAAAAAA"
		if request.Peer == uid {
			uid = "usrBBBBBBBBBBB"
		}
		json.NewEncoder(w).Encode(map[string]string{"uid": uid, "epoch": strings.Repeat("e", 64)})
	}))
	defer engine.Close()
	g, e := NewGateway(context.Background(), Config{Origin: "http://localhost/chat"}, []byte(strings.Repeat("k", 32)), "api", engine.URL, "")
	if e != nil {
		t.Fatal(e)
	}
	session := func(subject string) *loginSession {
		ctx, cancel := context.WithCancel(context.Background())
		t.Cleanup(cancel)
		return &loginSession{Ticket: auth.Ticket{Issuer: "https://accounts.example.test", Subject: subject}, Expires: time.Now().Add(time.Hour), Context: ctx, Cancel: cancel}
	}
	alice, bob, foreign := session("alice"), session("bob"), session("foreign")
	a, b := "10000000-0000-4000-8000-000000000001", "10000000-0000-4000-8000-000000000002"
	call := func(s *loginSession, body, origin string) *httptest.ResponseRecorder {
		r := httptest.NewRequest("POST", "http://localhost/chat/api/continuity", strings.NewReader(body))
		r.Header.Set("Origin", origin)
		w := httptest.NewRecorder()
		g.continuity(w, r, s)
		return w
	}
	join := func(device, peer string) string {
		return `{"action":"join","device":"` + device + `","peer":"` + peer + `"}`
	}
	if call(alice, join(a, "usrBBBBBBBBBBB"), "https://foreign.example.test").Code != 403 {
		t.Fatal("cross-origin accepted")
	}
	if call(alice, join(a, "usrBBBBBBBBBBB"), "http://localhost").Code != 200 {
		t.Fatal("alice join failed")
	}
	if call(bob, join(b, "usrAAAAAAAAAAA"), "http://localhost").Code != 200 {
		t.Fatal("bob join failed")
	}
	if call(foreign, join(a, "usrBBBBBBBBBBB"), "http://localhost").Code != 403 {
		t.Fatal("foreign session stole device")
	}
	signal := `{"action":"signal","device":"` + a + `","peer":"usrBBBBBBBBBBB","target":"` + b + `","type":"offer","sdp":"v=0 synthetic bounded description"}`
	if call(alice, signal, "http://localhost").Code != 200 {
		t.Fatal("signal failed")
	}
	poll := `{"action":"poll","device":"` + b + `","peer":"usrAAAAAAAAAAA"}`
	w := call(bob, poll, "http://localhost")
	var result struct{ Signals []continuitySignal }
	json.Unmarshal(w.Body.Bytes(), &result)
	if len(result.Signals) != 1 || result.Signals[0].From != a {
		t.Fatal("wrong signal source")
	}
	w = call(bob, poll, "http://localhost")
	json.Unmarshal(w.Body.Bytes(), &result)
	if len(result.Signals) != 0 {
		t.Fatal("signal replay")
	}
	allowed = false
	if call(bob, poll, "http://localhost").Code != 403 {
		t.Fatal("membership change accepted")
	}
}
