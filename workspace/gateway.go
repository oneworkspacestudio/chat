//go:build windows

// Package workspace provides One Workspace hosting, OIDC and portable runtime
// management around the upstream Tinode server and web client.
package workspace

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"io"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/tinode/chat/server/auth/workspace"
	"github.com/tinode/chat/workspace/platform"
	"golang.org/x/oauth2"
)

type Config struct{ Data, Listen, Origin, Issuer, ClientID, ClientSecret, DirectoryToken string }
type flow struct {
	Verifier, Nonce string
	Expires         time.Time
}
type loginSession struct {
	Ticket  workspace.Ticket
	Expires time.Time
	Context context.Context
	Cancel  context.CancelFunc
}
type Gateway struct {
	config         Config
	base           string
	oauth          oauth2.Config
	verifier       *oidc.IDTokenVerifier
	mu             sync.Mutex
	flows          map[string]flow
	sessions       map[string]*loginSession
	key            []byte
	apiKey         string
	proxy          *httputil.ReverseProxy
	web            string
	engine         string
	directoryReady bool
	directoryUsers []workspace.DirectoryUser
}

func NewGateway(ctx context.Context, c Config, key []byte, apiKey, engine, web string) (*Gateway, error) {
	u, _ := url.Parse(c.Origin)
	target, _ := url.Parse(engine)
	g := &Gateway{config: c, base: strings.TrimRight(u.Path, "/"), key: key, apiKey: apiKey, web: web, flows: map[string]flow{}, sessions: map[string]*loginSession{}, proxy: httputil.NewSingleHostReverseProxy(target)}
	g.engine = engine
	original := g.proxy.Director
	g.proxy.Director = func(r *http.Request) {
		original(r)
		// Keep the native API and media handler on the same public base path.
		// Its file IDs are parsed against serve_url, which includes /chat.
		if strings.HasPrefix(r.URL.Path, "/v0/") {
			r.URL.Path = g.base + r.URL.Path
			r.URL.RawPath = ""
		}
		r.Header.Set("X-Tinode-APIKey", apiKey)
		r.Header.Del("Cookie")
		r.Header.Del("Authorization")
		r.Host = target.Host
	}
	g.proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, e error) {
		http.Error(w, "Chat is reconnecting. Please try again.", 503)
	}
	g.proxy.ModifyResponse = func(response *http.Response) error {
		if strings.HasPrefix(strings.TrimPrefix(response.Request.URL.Path, g.base), "/v0/file/s/") {
			// Uploaded HTML/SVG must not become an active document on the
			// shared Workspace origin when opened directly in another tab.
			response.Header.Set("Content-Security-Policy", "sandbox; default-src 'none'")
			response.Header.Set("Referrer-Policy", "no-referrer")
		}
		return nil
	}
	if c.Issuer != "" {
		ctx = oidc.ClientContext(ctx, &http.Client{Timeout: 20 * time.Second})
		p, e := oidc.NewProvider(ctx, c.Issuer)
		if e != nil {
			return nil, errors.New("MyAccounts discovery failed; check the configured issuer address")
		}
		g.oauth = oauth2.Config{ClientID: c.ClientID, ClientSecret: c.ClientSecret, Endpoint: p.Endpoint(), RedirectURL: c.Origin + "/auth/callback", Scopes: []string{oidc.ScopeOpenID, "profile", "email"}}
		g.verifier = p.Verifier(&oidc.Config{ClientID: c.ClientID})
	}
	return g, nil
}
func (g *Gateway) cookie(w http.ResponseWriter, name, value string, age int) {
	p := g.base + "/"
	http.SetCookie(w, &http.Cookie{Name: name, Value: value, Path: p, MaxAge: age, HttpOnly: true, Secure: strings.HasPrefix(g.config.Origin, "https:"), SameSite: http.SameSiteLaxMode})
}
func (g *Gateway) session(r *http.Request) *loginSession {
	c, e := r.Cookie("chat_session")
	if e != nil {
		return nil
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	s := g.sessions[c.Value]
	if s != nil && time.Now().Before(s.Expires) {
		return s
	}
	if s != nil {
		s.Cancel()
		delete(g.sessions, c.Value)
	}
	return nil
}
func (g *Gateway) login(w http.ResponseWriter, r *http.Request) {
	if g.verifier == nil {
		http.Error(w, "Connect Chat to MyAccounts using --issuer and a registered OIDC client. See docs/workspace/HOSTING.md.", 503)
		return
	}
	state, nonce, v := platform.Token(), platform.Token(), oauth2.GenerateVerifier()
	g.mu.Lock()
	for k, f := range g.flows {
		if time.Now().After(f.Expires) {
			delete(g.flows, k)
		}
	}
	if len(g.flows) >= 1000 {
		g.mu.Unlock()
		http.Error(w, "Too many sign-in attempts. Try again shortly.", 429)
		return
	}
	g.flows[state] = flow{v, nonce, time.Now().Add(5 * time.Minute)}
	g.mu.Unlock()
	g.cookie(w, "chat_login", state, 300)
	http.Redirect(w, r, g.oauth.AuthCodeURL(state, oauth2.S256ChallengeOption(v), oidc.Nonce(nonce)), http.StatusFound)
}
func (g *Gateway) callback(w http.ResponseWriter, r *http.Request) {
	fail := func() { http.Error(w, "Chat could not complete sign-in. Open Chat from Workspace to try again.", 401) }
	if g.verifier == nil {
		fail()
		return
	}
	c, e := r.Cookie("chat_login")
	state := r.URL.Query().Get("state")
	if e != nil || state == "" || !hmac.Equal([]byte(c.Value), []byte(state)) {
		fail()
		return
	}
	g.mu.Lock()
	f, ok := g.flows[state]
	delete(g.flows, state)
	g.mu.Unlock()
	g.cookie(w, "chat_login", "", -1)
	if !ok || time.Now().After(f.Expires) || r.URL.Query().Get("error") != "" {
		fail()
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()
	ctx = oidc.ClientContext(ctx, &http.Client{Timeout: 20 * time.Second})
	token, e := g.oauth.Exchange(ctx, r.URL.Query().Get("code"), oauth2.VerifierOption(f.Verifier))
	if e != nil {
		fail()
		return
	}
	raw, _ := token.Extra("id_token").(string)
	id, e := g.verifier.Verify(ctx, raw)
	if e != nil || id.Nonce != f.Nonce {
		fail()
		return
	}
	var claims struct {
		Name        string `json:"name"`
		Email       string `json:"email"`
		Verified    bool   `json:"email_verified"`
		Username    string `json:"preferred_username"`
		DisplayName string `json:"displayName"`
	}
	if id.Claims(&claims) != nil || id.Subject == "" {
		fail()
		return
	}
	if !claims.Verified {
		claims.Email = ""
	}
	if claims.Name == "" {
		claims.Name = "Workspace member"
	}
	if claims.DisplayName != "" {
		claims.Name = claims.DisplayName
	}
	expires := time.Now().Add(8 * time.Hour)
	if id.Expiry.Before(expires) {
		expires = id.Expiry
	}
	sessionCtx, sessionCancel := context.WithDeadline(context.Background(), expires)
	s := &loginSession{Ticket: workspace.Ticket{Issuer: id.Issuer, Subject: id.Subject, Name: claims.Name, Email: claims.Email, Username: claims.Username}, Expires: expires, Context: sessionCtx, Cancel: sessionCancel}
	value := platform.Token()
	g.mu.Lock()
	for k, old := range g.sessions {
		if time.Now().After(old.Expires) {
			old.Cancel()
			delete(g.sessions, k)
		}
	}
	if oldCookie, e := r.Cookie("chat_session"); e == nil {
		if old := g.sessions[oldCookie.Value]; old != nil {
			old.Cancel()
			delete(g.sessions, oldCookie.Value)
		}
	}
	g.sessions[value] = s
	g.mu.Unlock()
	g.cookie(w, "chat_session", value, int(time.Until(expires).Seconds()))
	http.Redirect(w, r, g.base+"/", 303)
}
func (g *Gateway) sameOrigin(r *http.Request) bool {
	u, _ := url.Parse(g.config.Origin)
	return r.Header.Get("Origin") == u.Scheme+"://"+u.Host
}
func (g *Gateway) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Referrer-Policy", "same-origin")
	w.Header().Set("X-Frame-Options", "SAMEORIGIN")
	path := r.URL.Path
	if g.base != "" && (path == g.base || strings.HasPrefix(path, g.base+"/")) {
		path = strings.TrimPrefix(path, g.base)
	}
	if path == "" {
		path = "/"
	}
	if path == "/healthz" {
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{"status":"ok"}`)
		return
	}
	if path == "/auth/login" && r.Method == "GET" {
		g.login(w, r)
		return
	}
	if path == "/auth/callback" && r.Method == "GET" {
		g.callback(w, r)
		return
	}
	if path == "/api/directory/sync" {
		g.syncDirectory(w, r)
		return
	}
	s := g.session(r)
	if s == nil {
		if path == "/" && r.Method == "GET" {
			http.Redirect(w, r, g.base+"/auth/login", 302)
		} else {
			http.Error(w, "Sign in to Chat through MyAccounts.", 401)
		}
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	if path == "/api/people" && r.Method == "GET" {
		g.findPeople(w, r, s)
		return
	}
	if path == "/api/me" && r.Method == "GET" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{"name": s.Ticket.Name, "email": s.Ticket.Email})
		return
	}
	if path == "/api/bootstrap" && r.Method == "GET" {
		t := s.Ticket
		t.Expires = time.Now().Add(time.Minute).Unix()
		t.Nonce = platform.Token()
		body, _ := json.Marshal(t)
		h := hmac.New(sha256.New, g.key)
		h.Write(body)
		ticket := base64.RawURLEncoding.EncodeToString(body) + "." + base64.RawURLEncoding.EncodeToString(h.Sum(nil))
		u, _ := url.Parse(g.config.Origin)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{"ticket": base64.StdEncoding.EncodeToString([]byte(ticket)), "apiKey": g.apiKey, "host": u.Host + g.base, "secure": u.Scheme == "https", "managedDirectory": g.config.DirectoryToken != ""})
		return
	}
	if path == "/auth/logout" {
		if r.Method != "POST" || !g.sameOrigin(r) {
			http.Error(w, "Use Chat's sign-out button.", 403)
			return
		}
		c, _ := r.Cookie("chat_session")
		g.mu.Lock()
		delete(g.sessions, c.Value)
		g.mu.Unlock()
		s.Cancel()
		g.cookie(w, "chat_session", "", -1)
		w.WriteHeader(204)
		return
	}
	if strings.HasPrefix(path, "/v0/") {
		if (r.Header.Get("Upgrade") != "" || r.Method != "GET") && !g.sameOrigin(r) {
			http.Error(w, "Chat request origin rejected.", 403)
			return
		}
		ctx, cancel := context.WithCancel(r.Context())
		defer cancel()
		stop := context.AfterFunc(s.Context, cancel)
		defer stop()
		r = r.Clone(ctx)
		r.URL.Path = path
		g.proxy.ServeHTTP(w, r)
		return
	}
	if r.Method != "GET" && r.Method != "HEAD" {
		w.WriteHeader(405)
		return
	}
	if path == "/" || path == "/index.html" {
		body, e := os.ReadFile(filepath.Join(g.web, "index.html"))
		if e != nil {
			http.Error(w, "Chat client is unavailable.", 503)
			return
		}
		body = []byte(strings.Replace(string(body), "<!--WORKSPACE_BASE-->", fmt.Sprintf(`<base href="%s/">`, html.EscapeString(g.base)), 1))
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write(body)
		return
	}
	clean, e := platform.Inside(g.web, strings.TrimPrefix(path, "/"))
	if e != nil {
		http.NotFound(w, r)
		return
	}
	info, e := os.Stat(clean)
	if e != nil || info.IsDir() {
		http.NotFound(w, r)
		return
	}
	http.ServeFile(w, r, clean)
}

func validate(c Config) error {
	host, _, e := net.SplitHostPort(c.Listen)
	if e != nil || net.ParseIP(host) == nil || !net.ParseIP(host).IsLoopback() {
		return errors.New("Chat must listen on a loopback IP address")
	}
	for _, raw := range []string{c.Origin, c.Issuer} {
		if raw == "" {
			continue
		}
		u, e := url.Parse(raw)
		if e != nil || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" || strings.ContainsAny(raw, "\\\r\n") {
			return errors.New("invalid Chat or MyAccounts address")
		}
		if u.Scheme != "https" && !(u.Scheme == "http" && (u.Hostname() == "localhost" || net.ParseIP(u.Hostname()).IsLoopback())) {
			return errors.New("remote Chat and MyAccounts addresses require HTTPS")
		}
	}
	if c.Issuer != "" && (c.ClientID == "" || c.ClientSecret == "") {
		return errors.New("Chat needs its own registered MyAccounts OIDC client")
	}
	return nil
}
