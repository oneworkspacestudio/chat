//go:build windows

package workspace

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	auth "github.com/tinode/chat/server/auth/workspace"
	"github.com/tinode/chat/workspace/platform"
)

// Device access is independent of browser-session expiry, encrypted at rest,
// revocable, bounded and limited to the same gateway-bound Chat identity.
type nativeDevice struct {
	Hash    string      `json:"hash"`
	UID     string      `json:"uid"`
	Ticket  auth.Ticket `json:"ticket"`
	Expires time.Time   `json:"expires"`
}
type nativeState struct {
	mu      sync.Mutex
	loaded  bool
	devices map[string]nativeDevice
	streams map[string]map[string]context.CancelFunc
}

func (g *Gateway) loadNativeLocked() error {
	if g.native.loaded {
		return nil
	}
	g.native.devices = map[string]nativeDevice{}
	g.native.streams = map[string]map[string]context.CancelFunc{}
	err := platform.LoadSecret(filepath.Join(g.config.Data, "native-devices.dpapi"), &g.native.devices)
	if err != nil && !os.IsNotExist(err) {
		return errors.New("linked device storage unavailable")
	}
	if g.native.devices == nil {
		g.native.devices = map[string]nativeDevice{}
	}
	g.native.loaded = true
	return nil
}
func (g *Gateway) saveNativeLocked() error {
	return platform.SaveSecret(filepath.Join(g.config.Data, "native-devices.dpapi"), g.native.devices)
}
func (g *Gateway) nativeActive(d nativeDevice) bool {
	if time.Now().After(d.Expires) {
		return false
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	if !g.directoryReady {
		return false
	}
	for _, u := range g.directoryUsers {
		if u.Subject == d.Ticket.Subject && u.Topic == d.UID {
			return true
		}
	}
	return false
}
func (g *Gateway) nativeAuthenticate(r *http.Request) (string, nativeDevice, bool) {
	raw := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	if len(raw) != 129 || raw[64] != '.' {
		return "", nativeDevice{}, false
	}
	id, secret := raw[:64], raw[65:]
	sum := sha256.Sum256([]byte(secret))
	g.native.mu.Lock()
	defer g.native.mu.Unlock()
	if g.loadNativeLocked() != nil {
		return "", nativeDevice{}, false
	}
	d, ok := g.native.devices[id]
	if !ok || subtle.ConstantTimeCompare([]byte(d.Hash), []byte(hex.EncodeToString(sum[:]))) != 1 || !g.nativeActive(d) {
		return "", nativeDevice{}, false
	}
	return id, d, true
}
func (g *Gateway) nativeRoutes(w http.ResponseWriter, r *http.Request, path string) bool {
	if !strings.HasPrefix(path, "/api/native/") {
		return false
	}
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	if path == "/api/native/devices" {
		session := g.session(r)
		if session == nil {
			http.Error(w, "Sign in to manage linked phones", 401)
			return true
		}
		if r.Method != "GET" && r.Method != "POST" {
			w.WriteHeader(405)
			return true
		}
		g.native.mu.Lock()
		defer g.native.mu.Unlock()
		if g.loadNativeLocked() != nil {
			http.Error(w, "Linked device storage unavailable", 503)
			return true
		}
		select {
		case <-session.Context.Done():
			http.Error(w, "Sign-in ended; reconnect Chat", 401)
			return true
		default:
		}
		if r.Method == "POST" {
			if !g.sameOrigin(r) {
				http.Error(w, "Request origin rejected", 403)
				return true
			}
			var input struct {
				ID string `json:"id"`
			}
			if json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024)).Decode(&input) != nil {
				http.Error(w, "Invalid device", 400)
				return true
			}
			d, ok := g.native.devices[input.ID]
			if !ok || d.Ticket.Subject != session.Ticket.Subject {
				http.NotFound(w, r)
				return true
			}
			delete(g.native.devices, input.ID)
			if g.saveNativeLocked() != nil {
				g.native.devices[input.ID] = d
				http.Error(w, "Could not save revocation", 503)
				return true
			}
			g.cancelNativeDeviceLocked(input.ID)
			w.WriteHeader(204)
			return true
		}
		devices := []map[string]any{}
		for id, d := range g.native.devices {
			if d.Ticket.Subject == session.Ticket.Subject && time.Now().Before(d.Expires) {
				devices = append(devices, map[string]any{"id": id, "name": "Android phone", "expires": d.Expires.Unix()})
			}
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{"devices": devices})
		return true
	}
	if path == "/api/native/link" {
		session := g.session(r)
		if r.Method != "POST" || !g.sameOrigin(r) || session == nil {
			http.Error(w, "Sign in to link this phone", 401)
			return true
		}
		g.mu.Lock()
		uid := ""
		for _, u := range g.directoryUsers {
			if u.Subject == session.Ticket.Subject {
				uid = u.Topic
				break
			}
		}
		ready := g.directoryReady
		g.mu.Unlock()
		if !ready || uid == "" {
			http.Error(w, "Chat directory is connecting", 503)
			return true
		}
		id, secret := platform.Token(), platform.Token()
		sum := sha256.Sum256([]byte(secret))
		expires := time.Now().Add(30 * 24 * time.Hour)
		g.native.mu.Lock()
		defer g.native.mu.Unlock()
		if g.loadNativeLocked() != nil {
			http.Error(w, "Linked device storage unavailable", 503)
			return true
		}
		count := 0
		if session.Context != nil {
			select {
			case <-session.Context.Done():
				http.Error(w, "Sign-in ended; reconnect Chat", 401)
				return true
			default:
			}
		}
		if !g.nativeActive(nativeDevice{UID: uid, Ticket: session.Ticket, Expires: expires}) {
			http.Error(w, "Chat account is no longer active", 403)
			return true
		}
		for key, d := range g.native.devices {
			if time.Now().After(d.Expires) {
				delete(g.native.devices, key)
				continue
			}
			if d.Ticket.Subject == session.Ticket.Subject {
				count++
			}
		}
		if count >= 20 || len(g.native.devices) >= 2000 {
			http.Error(w, "Linked device limit reached; remove an older device", 409)
			return true
		}
		g.native.devices[id] = nativeDevice{Hash: hex.EncodeToString(sum[:]), UID: uid, Ticket: session.Ticket, Expires: expires}
		if g.saveNativeLocked() != nil {
			delete(g.native.devices, id)
			http.Error(w, "Could not save device access", 503)
			return true
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{"id": id, "token": id + "." + secret, "uid": uid, "expires": expires.Unix()})
		return true
	}
	g.mu.Lock()
	ready := g.directoryReady
	g.mu.Unlock()
	if !ready {
		http.Error(w, "Chat directory is reconnecting", 503)
		return true
	}
	id, d, ok := g.nativeAuthenticate(r)
	if !ok {
		http.Error(w, "Reconnect this phone to Chat", 401)
		return true
	}
	if path == "/api/native/revoke" && r.Method == "POST" {
		g.native.mu.Lock()
		delete(g.native.devices, id)
		err := g.saveNativeLocked()
		if err != nil {
			g.native.devices[id] = d
		} else {
			g.cancelNativeDeviceLocked(id)
		}
		g.native.mu.Unlock()
		if err != nil {
			http.Error(w, "Device revocation could not be saved", 503)
		} else {
			w.WriteHeader(204)
		}
		return true
	}
	if path == "/api/native/session" && r.Method == "POST" {
		if !g.sameOrigin(r) {
			http.Error(w, "Request origin rejected", 403)
			return true
		}
		g.native.mu.Lock()
		defer g.native.mu.Unlock()
		currentDevice, live := g.native.devices[id]
		if !live || currentDevice.Hash != d.Hash || !g.nativeActive(currentDevice) {
			http.Error(w, "Device access ended", 401)
			return true
		}
		if current := g.session(r); current != nil && current.Ticket.Subject == d.Ticket.Subject {
			w.WriteHeader(204)
			return true
		}
		expires := time.Now().Add(8 * time.Hour)
		if d.Expires.Before(expires) {
			expires = d.Expires
		}
		ctx, cancel := context.WithDeadline(context.Background(), expires)
		session := &loginSession{Ticket: d.Ticket, Expires: expires, Context: ctx, Cancel: cancel, NativeDevice: id}
		key := platform.Token()
		g.mu.Lock()
		for k, s := range g.sessions {
			if s.NativeDevice == id {
				s.Cancel()
				delete(g.sessions, k)
			}
		}
		g.sessions[key] = session
		g.mu.Unlock()
		g.cookie(w, "chat_session", key, int(time.Until(expires).Seconds()))
		w.WriteHeader(204)
		return true
	}
	if path == "/api/native/bootstrap" && r.Method == "GET" {
		s := &loginSession{Ticket: d.Ticket}
		w.Header().Set("Content-Type", "application/json")
		push, _ := g.selfPushPublic(r.Context(), id, d)
		json.NewEncoder(w).Encode(map[string]any{"ticket": g.signedTicket(s), "uid": d.UID, "push": push})
		return true
	}
	if path == "/api/native/socket" && r.Method == "GET" && strings.EqualFold(r.Header.Get("Upgrade"), "websocket") {
		ctx, cancel := context.WithDeadline(r.Context(), d.Expires)
		defer cancel()
		stream := platform.Token()
		g.native.mu.Lock()
		if _, live := g.native.devices[id]; !live {
			g.native.mu.Unlock()
			http.Error(w, "Device revoked", 401)
			return true
		}
		if g.native.streams[id] == nil {
			g.native.streams[id] = map[string]context.CancelFunc{}
		}
		if len(g.native.streams[id]) >= 4 {
			g.native.mu.Unlock()
			http.Error(w, "Too many device connections", 429)
			return true
		}
		g.native.streams[id][stream] = cancel
		g.native.mu.Unlock()
		defer func() { g.native.mu.Lock(); delete(g.native.streams[id], stream); g.native.mu.Unlock() }()
		session := &loginSession{Ticket: d.Ticket, Expires: d.Expires, Context: ctx, Cancel: cancel}
		r = r.Clone(context.WithValue(ctx, gatewaySessionContext{}, session))
		r.URL.Path = "/v0/channels"
		r.URL.RawPath = ""
		r.URL.RawQuery = ""
		origin, _ := url.Parse(g.config.Origin)
		r.Header.Set("Origin", origin.Scheme+"://"+origin.Host)
		g.proxy.ServeHTTP(w, r)
		return true
	}
	http.NotFound(w, r)
	return true
}

// Called by both account logout/revocation and current directory reconciliation.
func (g *Gateway) revokeNativeIdentity(subject string) error {
	g.native.mu.Lock()
	defer g.native.mu.Unlock()
	if err := g.loadNativeLocked(); err != nil {
		return err
	}
	changed := false
	for id, d := range g.native.devices {
		if d.Ticket.Subject == subject {
			g.cancelNativeDeviceLocked(id)
			delete(g.native.devices, id)
			changed = true
		}
	}
	if changed {
		return g.saveNativeLocked()
	}
	return nil
}

// Caller holds native.mu; the same lock order is used by nativeAuthenticate.
func (g *Gateway) cancelNativeDeviceLocked(id string) {
	go revokeSelfPush(id)
	for _, cancel := range g.native.streams[id] {
		cancel()
	}
	delete(g.native.streams, id)
	g.mu.Lock()
	for key, s := range g.sessions {
		if s.NativeDevice == id {
			s.Cancel()
			delete(g.sessions, key)
		}
	}
	g.mu.Unlock()
}
func (g *Gateway) reconcileNativeDirectory(active map[string]bool) {
	g.native.mu.Lock()
	defer g.native.mu.Unlock()
	if g.loadNativeLocked() != nil {
		return
	}
	changed := false
	for id, d := range g.native.devices {
		if !active[d.Ticket.Subject] || time.Now().After(d.Expires) {
			go revokeSelfPush(id)
			for _, cancel := range g.native.streams[id] {
				cancel()
			}
			delete(g.native.streams, id)
			delete(g.native.devices, id)
			changed = true
		}
	}
	if changed {
		_ = g.saveNativeLocked()
	}
}
