// Package continuityrelay provides an independently hosted WebRTC rendezvous.
// It stores bounded, short lived signaling only, never chat messages or passwords.
package continuityrelay

import (
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"
)

type Grant struct {
	UID      string `json:"uid"`
	Peer     string `json:"peer"`
	Epoch    string `json:"epoch"`
	Origin   string `json:"origin"`
	Audience string `json:"aud"`
	Issued   int64  `json:"iat"`
	Expires  int64  `json:"exp"`
}

var uid = regexp.MustCompile(`^usr[A-Za-z0-9_-]{11}$`)
var epoch = regexp.MustCompile(`^[a-f0-9]{64}$`)
var uuid = regexp.MustCompile(`^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$`)

func Sign(key ed25519.PrivateKey, grant Grant) string {
	raw, _ := json.Marshal(grant)
	body := base64.RawURLEncoding.EncodeToString(raw)
	return body + "." + base64.RawURLEncoding.EncodeToString(ed25519.Sign(key, []byte(body)))
}

func Verify(key ed25519.PublicKey, token, audience, origin string, now time.Time) (Grant, error) {
	var g Grant
	parts := strings.Split(token, ".")
	if len(parts) != 2 || len(token) > 4096 || len(key) != ed25519.PublicKeySize {
		return g, errors.New("invalid permission")
	}
	signature, e := base64.RawURLEncoding.DecodeString(parts[1])
	if e != nil || !ed25519.Verify(key, []byte(parts[0]), signature) {
		return g, errors.New("invalid signature")
	}
	raw, e := base64.RawURLEncoding.DecodeString(parts[0])
	if e != nil || json.Unmarshal(raw, &g) != nil ||
		!uid.MatchString(g.UID) || !uid.MatchString(g.Peer) || g.UID == g.Peer || !epoch.MatchString(g.Epoch) ||
		g.Audience != audience || g.Origin != origin || g.Expires <= now.UnixMilli() ||
		g.Issued > now.Add(time.Minute).UnixMilli() || g.Expires <= g.Issued ||
		g.Expires-g.Issued > (2*time.Hour).Milliseconds() {
		return Grant{}, errors.New("permission expired or scope rejected")
	}
	return g, nil
}

type Signal struct {
	From string `json:"from"`
	Type string `json:"type"`
	SDP  string `json:"sdp"`
}
type device struct {
	grant Grant
	seen  time.Time
	queue []Signal
}
type Server struct {
	Key      ed25519.PublicKey
	Audience string
	Origin   string
	mu       sync.Mutex
	devices  map[string]*device
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	// One installation per relay. Do not echo arbitrary browser origins.
	if r.Header.Get("Origin") != s.Origin {
		http.Error(w, "Origin rejected", 403)
		return
	}
	w.Header().Set("Access-Control-Allow-Origin", s.Origin)
	w.Header().Set("Vary", "Origin")
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Methods", "POST")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		w.Header().Set("Access-Control-Max-Age", "600")
		w.WriteHeader(204)
		return
	}
	if r.Method != "POST" {
		w.WriteHeader(405)
		return
	}
	g, err := Verify(s.Key, strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer "), s.Audience, s.Origin, time.Now())
	if err != nil {
		http.Error(w, "Connection permission expired or invalid", 403)
		return
	}
	var input struct{ Action, Device, Peer, Target, Type, SDP string }
	d := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10))
	d.DisallowUnknownFields()
	if d.Decode(&input) != nil || !uuid.MatchString(input.Device) || input.Peer != g.Peer ||
		(input.Action != "join" && input.Action != "poll" && input.Action != "signal" && input.Action != "leave") {
		http.Error(w, "Invalid connection request", 400)
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now()
	if s.devices == nil {
		s.devices = map[string]*device{}
	}
	for id, item := range s.devices {
		if item.grant.Expires <= now.UnixMilli() || now.Sub(item.seen) > 2*time.Minute {
			delete(s.devices, id)
		}
	}
	current := s.devices[input.Device]
	if current != nil && (current.grant.UID != g.UID || current.grant.Peer != g.Peer || current.grant.Epoch != g.Epoch) {
		http.Error(w, "Device binding rejected", 403)
		return
	}
	if input.Action == "leave" {
		delete(s.devices, input.Device)
		w.WriteHeader(204)
		return
	}
	// Poll is idempotent registration, allowing relay process restart recovery.
	if current == nil {
		count := 0
		for _, item := range s.devices {
			if item.grant.UID == g.UID {
				count++
			}
		}
		if len(s.devices) >= 1024 || count >= 24 {
			http.Error(w, "Connection capacity reached; retry shortly", 429)
			return
		}
		current = &device{grant: g, queue: []Signal{}}
		s.devices[input.Device] = current
	}
	current.seen = now
	current.grant = g
	if input.Action == "signal" {
		target := s.devices[input.Target]
		if target == nil || target.grant.UID != g.Peer || target.grant.Peer != g.UID || target.grant.Epoch != g.Epoch {
			http.Error(w, "Waiting for other device", 409)
			return
		}
		if (input.Type != "offer" && input.Type != "answer") || len(input.SDP) < 20 || len(input.SDP) > 48<<10 {
			http.Error(w, "Invalid signaling", 400)
			return
		}
		if len(target.queue) >= 4 {
			http.Error(w, "Signaling queue full", 429)
			return
		}
		target.queue = append(target.queue, Signal{input.Device, input.Type, input.SDP})
	}
	peers := []map[string]any{}
	for id, item := range s.devices {
		if item.grant.UID == g.Peer && item.grant.Peer == g.UID && item.grant.Epoch == g.Epoch {
			peers = append(peers, map[string]any{"device": id, "expires": item.grant.Expires})
		}
	}
	queue := current.queue
	current.queue = []Signal{}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"uid": g.UID, "epoch": g.Epoch, "expires": g.Expires, "peers": peers, "signals": queue})
}
