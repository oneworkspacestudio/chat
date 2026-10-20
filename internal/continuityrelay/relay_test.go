package continuityrelay

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestScopeAndMailbox(t *testing.T) {
	pub, key, _ := ed25519.GenerateKey(rand.Reader)
	now := time.Now()
	alice := Grant{"usrAAAAAAAAAAA", "usrBBBBBBBBBBB", strings.Repeat("e", 64), "https://chat.example.test", "https://signal.example.test", now.UnixMilli(), now.Add(time.Hour).UnixMilli()}
	bob := alice
	bob.UID, bob.Peer = alice.Peer, alice.UID
	server := &Server{Key: pub, Audience: alice.Audience, Origin: alice.Origin}
	a, b := "10000000-0000-4000-8000-000000000001", "10000000-0000-4000-8000-000000000002"
	call := func(grant Grant, origin, device, action, target string) *httptest.ResponseRecorder {
		raw, _ := json.Marshal(map[string]string{"action": action, "device": device, "peer": grant.Peer, "target": target, "type": "offer", "sdp": "v=0 synthetic bounded description"})
		r := httptest.NewRequest("POST", alice.Audience, strings.NewReader(string(raw)))
		r.Header.Set("Origin", origin)
		r.Header.Set("Authorization", "Bearer "+Sign(key, grant))
		w := httptest.NewRecorder()
		server.ServeHTTP(w, r)
		return w
	}
	if call(alice, "https://foreign.example.test", a, "join", "").Code != 403 {
		t.Fatal("foreign origin")
	}
	for name, invalid := range map[string]Grant{
		"expired": func() Grant { v := alice; v.Expires = now.Add(-time.Second).UnixMilli(); return v }(),
		"scope": func() Grant { v := alice; v.Audience += "/foreign"; return v }(),
		"long lease": func() Grant { v := alice; v.Expires = now.Add(3*time.Hour).UnixMilli(); return v }(),
	} {
		if call(invalid, alice.Origin, a, "join", "").Code != 403 {
			t.Fatal(name)
		}
	}
	if call(alice, alice.Origin, a, "join", "").Code != 200 || call(bob, alice.Origin, b, "join", "").Code != 200 {
		t.Fatal("join")
	}
	if call(bob, alice.Origin, a, "join", "").Code != 403 {
		t.Fatal("device theft")
	}
	if call(alice, alice.Origin, a, "signal", b).Code != 200 {
		t.Fatal("signal")
	}
	var response struct{ Signals []Signal }
	json.Unmarshal(call(bob, alice.Origin, b, "poll", "").Body.Bytes(), &response)
	if len(response.Signals) != 1 || response.Signals[0].From != a {
		t.Fatal("routing")
	}
	json.Unmarshal(call(bob, alice.Origin, b, "poll", "").Body.Bytes(), &response)
	if len(response.Signals) != 0 {
		t.Fatal("replay")
	}
	other := alice
	other.Epoch = strings.Repeat("f", 64)
	if call(other, alice.Origin, a, "join", "").Code != 403 {
		t.Fatal("conversation incarnation changed")
	}
	for range 4 {
		if call(alice, alice.Origin, a, "signal", b).Code != 200 { t.Fatal("queue capacity") }
	}
	if call(alice, alice.Origin, a, "signal", b).Code != 429 { t.Fatal("unbounded queue") }
	server.devices = nil
	if call(alice, alice.Origin, a, "poll", "").Code != 200 { t.Fatal("relay restart recovery") }
	if _, err := Verify(pub, Sign(key, alice)+"x", alice.Audience, alice.Origin, now); err == nil { t.Fatal("modified signature") }
}
