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

type Config struct{ Data, Listen, Origin, Issuer, ClientID, ClientSecret, DirectoryToken, WorkspaceOrigin, CatalogURL string }
type flow struct {
	Verifier, Nonce string
	Expires         time.Time
}
type loginSession struct {
	NativeDevice string
	Ticket       workspace.Ticket
	Expires      time.Time
	Context      context.Context
	Cancel       context.CancelFunc
}
type gatewaySessionContext struct{}

func (g *Gateway) signedTicket(s *loginSession) string {
	t := s.Ticket
	t.Expires = time.Now().Add(time.Minute).Unix()
	t.Nonce = platform.Token()
	body, _ := json.Marshal(t)
	mac := hmac.New(sha256.New, g.key)
	mac.Write(body)
	return base64.StdEncoding.EncodeToString([]byte(base64.RawURLEncoding.EncodeToString(body) + "." + base64.RawURLEncoding.EncodeToString(mac.Sum(nil))))
}

type Gateway struct {
	native            nativeState
	config            Config
	base              string
	oauth             oauth2.Config
	verifier          *oidc.IDTokenVerifier
	mu                sync.Mutex
	flows             map[string]flow
	sessions          map[string]*loginSession
	key               []byte
	apiKey            string
	proxy             *httputil.ReverseProxy
	web               string
	engine            string
	instance          string
	directoryReady    bool
	directoryUsers    []workspace.DirectoryUser
	continuityDevices map[string]*continuityDevice
}

func NewGateway(ctx context.Context, c Config, key []byte, apiKey, engine, web string) (*Gateway, error) {
	u, _ := url.Parse(c.Origin)
	target, _ := url.Parse(engine)
	g := &Gateway{config: c, base: strings.TrimRight(u.Path, "/"), key: key, apiKey: apiKey, web: web, flows: map[string]flow{}, sessions: map[string]*loginSession{}, proxy: httputil.NewSingleHostReverseProxy(target)}
	g.engine = engine
	g.instance = platform.Token()
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
		r.Header.Del("X-Tinode-Auth")
		r.Header.Del("X-Workspace-Gateway")
		query := r.URL.Query()
		query.Del("auth")
		query.Del("secret")
		if s, ok := r.Context().Value(gatewaySessionContext{}).(*loginSession); ok {
			if strings.Contains(r.URL.Path, "/v0/file/") {
				query.Del("sid")
				r.Header.Set("Authorization", "workspace "+g.signedTicket(s))
			} else {
				r.Header.Set("X-Workspace-Gateway", g.signedTicket(s))
			}
		}
		r.URL.RawQuery = query.Encode()
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
	if g.config.WorkspaceOrigin != "" {
		p = "/"
		if strings.HasPrefix(g.config.Origin, "https:") {
			name = "__Host-" + name
		}
	}
	http.SetCookie(w, &http.Cookie{Name: name, Value: value, Path: p, MaxAge: age, HttpOnly: true, Secure: strings.HasPrefix(g.config.Origin, "https:"), SameSite: http.SameSiteLaxMode})
}
func (g *Gateway) cookieName(name string) string {
	if g.config.WorkspaceOrigin != "" && strings.HasPrefix(g.config.Origin, "https:") {
		return "__Host-" + name
	}
	return name
}
func (g *Gateway) session(r *http.Request) *loginSession {
	c, e := r.Cookie(g.cookieName("chat_session"))
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
	c, e := r.Cookie(g.cookieName("chat_login"))
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
	if oldCookie, e := r.Cookie(g.cookieName("chat_session")); e == nil {
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
	if path == "/api/directory/sync" {
		g.syncDirectory(w, r)
		return
	}
	if path == "/api/session/revoke" {
		g.revokeSessions(w, r)
		return
	}
	// Loopback integration endpoints above authenticate separately. Browser
	// requests must use the dedicated configured hostname, including callbacks.
	if g.config.WorkspaceOrigin != "" {
		u, _ := url.Parse(g.config.Origin)
		if !strings.EqualFold(r.Host, u.Host) {
			http.Error(w, "Open Chat using its dedicated Workspace address.", 421)
			return
		}
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'"+g.continuityConnectSource()+"; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'")
	}
	if path == "/auth/login" && r.Method == "GET" {
		g.login(w, r)
		return
	}
	if path == "/auth/callback" && r.Method == "GET" {
		g.callback(w, r)
		return
	}
	w.Header().Set("X-Chat-Instance", g.instance)
	if g.nativeRoutes(w, r, path) {
		return
	}
	s := g.session(r)
	if s == nil {
		if path == "/" && r.Method == "GET" {
			if r.URL.Query().Get("signedOut") == "1" {
				w.Header().Set("Content-Type", "text/html; charset=utf-8")
				w.Header().Set("Cache-Control", "no-store")
				fmt.Fprintf(w, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Signed out · Chat</title><link rel="stylesheet" href="%s/css/workspace.css"><main class="workspace-connection"><h1>You’re signed out of Chat</h1><p>Your MyAccounts session is managed separately in Workspace.</p><a href="%s/auth/login">Reconnect Chat</a></main></html>`, html.EscapeString(g.base), html.EscapeString(g.base))
				return
			}
			http.Redirect(w, r, g.base+"/auth/login", 302)
		} else {
			http.Error(w, "Sign in to Chat through MyAccounts.", 401)
		}
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	if path == "/api/workspace/apps" {
		g.workspaceApps(w, r, s)
		return
	}
	if path == "/api/preferences" {
		g.preferences(w, r, s)
		return
	}
	if path == "/api/continuity" {
		g.continuity(w, r, s)
		return
	}
	if path == "/api/people" && r.Method == "GET" {
		g.findPeople(w, r, s)
		return
	}
	if path == "/api/me" && r.Method == "GET" {
		w.Header().Set("Content-Type", "application/json")
		key := sha256.Sum256([]byte(s.Ticket.Issuer + "\x00" + s.Ticket.Subject))
		json.NewEncoder(w).Encode(map[string]any{"name": s.Ticket.Name, "email": s.Ticket.Email, "accountKey": fmt.Sprintf("%x", key)})
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
		accountKey := sha256.Sum256([]byte(t.Issuer + "\x00" + t.Subject))
		json.NewEncoder(w).Encode(map[string]any{"ticket": base64.StdEncoding.EncodeToString([]byte(ticket)), "apiKey": g.apiKey, "host": u.Host + g.base, "secure": u.Scheme == "https", "managedDirectory": g.config.DirectoryToken != "", "accountKey": fmt.Sprintf("%x", accountKey), "protocol": 2, "workspaceNavigation": g.config.CatalogURL != "", "isolatedOrigin": g.config.WorkspaceOrigin != "", "expires": s.Expires.Unix(), "accountsURL": g.config.Issuer, "instance": g.instance})
		return
	}
	if path == "/auth/logout" {
		if r.Method != "POST" || !g.sameOrigin(r) {
			http.Error(w, "Use Chat's sign-out button.", 403)
			return
		}
		c, _ := r.Cookie(g.cookieName("chat_session"))
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
		r = r.Clone(context.WithValue(ctx, gatewaySessionContext{}, s))
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
		w.Header().Set("X-Chat-Shell", "static")
		w.Write(body)
		return
	}
	if path == "/devices" {
		http.Redirect(w, r, g.base+"/workspace-native-devices.html", http.StatusSeeOther)
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
	if c.WorkspaceOrigin != "" {
		chat, _ := url.Parse(c.Origin)
		home, err := url.Parse(c.WorkspaceOrigin)
		if err != nil || home.Host == "" || home.User != nil || home.Path != "" || home.RawQuery != "" || home.Fragment != "" || home.Scheme != "https" && !(home.Scheme == "http" && (home.Hostname() == "localhost" || net.ParseIP(home.Hostname()).IsLoopback())) {
			return errors.New("Workspace needs a valid HTTPS or loopback origin")
		}
		// Hostnames must also differ: cookies are not isolated by TCP port.
		if strings.EqualFold(home.Hostname(), chat.Hostname()) {
			return errors.New("Chat requires a separate hostname from Workspace before enabling managed isolation")
		}
	}
	if c.CatalogURL != "" {
		u, err := url.Parse(c.CatalogURL)
		if err != nil || u.Scheme != "http" || !net.ParseIP(u.Hostname()).IsLoopback() || u.User != nil || u.RawQuery != "" || u.Fragment != "" || len(c.DirectoryToken) < 32 {
			return errors.New("Chat navigation requires its private loopback Workspace integration")
		}
	}
	return nil
}
