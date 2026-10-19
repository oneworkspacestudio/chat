//go:build windows

package workspace

import (
	"context"
	"encoding/base64"
	"encoding/json"
	auth "github.com/tinode/chat/server/auth/workspace"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestProxyBindsMediaAndTransportToGatewayAccount(t *testing.T) {
	engine := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("auth") != "" || r.URL.Query().Get("secret") != "" || r.Header.Get("X-Tinode-Auth") != "" {
			t.Error("browser-selected native identity was forwarded")
		}
		encoded := r.Header.Get("X-Workspace-Gateway")
		if strings.Contains(r.URL.Path, "/v0/file/") {
			encoded = strings.TrimPrefix(r.Header.Get("Authorization"), "workspace ")
			if r.URL.Query().Get("sid") != "" {
				t.Error("foreign media session forwarded")
			}
		}
		secret, err := base64.StdEncoding.DecodeString(encoded)
		if err != nil {
			t.Fatal("gateway binding missing")
		}
		parts := strings.Split(string(secret), ".")
		if len(parts) != 2 {
			t.Fatal("binding format invalid")
		}
		body, err := base64.RawURLEncoding.DecodeString(parts[0])
		if err != nil {
			t.Fatal(err)
		}
		var ticket auth.Ticket
		if json.Unmarshal(body, &ticket) != nil || ticket.Subject != "bob" || ticket.Issuer != "https://accounts.example.test" {
			t.Error("binding does not identify authenticated Bob")
		}
		w.WriteHeader(204)
	}))
	defer engine.Close()
	g, err := NewGateway(context.Background(), Config{Origin: "http://localhost/chat"}, []byte(strings.Repeat("k", 32)), "api-key", engine.URL, "")
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	g.sessions["bob"] = &loginSession{Ticket: auth.Ticket{Issuer: "https://accounts.example.test", Subject: "bob"}, Expires: time.Now().Add(time.Minute), Context: ctx, Cancel: cancel}
	for _, path := range []string{"/v0/file/s/synthetic.txt?auth=token&secret=foreign&sid=foreign", "/v0/channels/lp?auth=token&secret=foreign&sid=foreign"} {
		req := httptest.NewRequest("GET", "http://localhost/chat"+path, nil)
		req.AddCookie(&http.Cookie{Name: "chat_session", Value: "bob"})
		req.Header.Set("X-Tinode-Auth", "token foreign")
		req.Header.Set("Authorization", "Bearer foreign")
		req.Header.Set("X-Workspace-Gateway", "forged")
		result := httptest.NewRecorder()
		g.ServeHTTP(result, req)
		if result.Code != 204 {
			t.Fatalf("bound proxy status %d", result.Code)
		}
	}
}
