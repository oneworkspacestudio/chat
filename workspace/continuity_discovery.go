//go:build windows

package workspace

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"errors"
	"math/big"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"time"

	"github.com/tinode/chat/workspace/platform"
)

// Public services carry encrypted discovery only. Keep this allowlist aligned
// with the browser adapter and CSP; do not accept arbitrary URLs from peers.
var discoveryRelays = []string{"wss://relay.damus.io", "wss://nos.lol", "wss://relay.primal.net"}

type continuityPublicKey struct {
	Kty string `json:"kty"`
	Crv string `json:"crv"`
	X   string `json:"x"`
	Y   string `json:"y"`
}

func (key continuityPublicKey) valid() bool {
	x, ex := base64.RawURLEncoding.DecodeString(key.X)
	y, ey := base64.RawURLEncoding.DecodeString(key.Y)
	return key.Kty == "EC" && key.Crv == "P-256" && ex == nil && ey == nil &&
		len(x) == 32 && len(y) == 32 && elliptic.P256().IsOnCurve(new(big.Int).SetBytes(x), new(big.Int).SetBytes(y))
}

func discoveryPublicKey(key *ecdsa.PublicKey) continuityPublicKey {
	return continuityPublicKey{"EC", "P-256", base64.RawURLEncoding.EncodeToString(key.X.FillBytes(make([]byte, 32))),
		base64.RawURLEncoding.EncodeToString(key.Y.FillBytes(make([]byte, 32)))}
}

// Called while g.mu is held. Preserve the authority across gateway restarts.
// A corrupt/unreadable key fails closed instead of silently replacing trust.
func (g *Gateway) discoveryAuthority() (*ecdsa.PrivateKey, error) {
	path := filepath.Join(g.config.Data, "continuity-authority.pk8")
	raw, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		key, e := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
		if e != nil {
			return nil, e
		}
		raw, e = x509.MarshalPKCS8PrivateKey(key)
		if e != nil {
			return nil, e
		}
		if e = platform.AtomicWrite(path, raw); e != nil {
			return nil, e
		}
		return key, nil
	}
	if err != nil || len(raw) > 1024 {
		return nil, errors.New("discovery authority unavailable")
	}
	parsed, err := x509.ParsePKCS8PrivateKey(raw)
	if err != nil {
		return nil, err
	}
	key, ok := parsed.(*ecdsa.PrivateKey)
	if !ok || key.Curve != elliptic.P256() {
		return nil, errors.New("invalid discovery authority")
	}
	return key, nil
}

func (g *Gateway) continuityDiscoveryGrant(device *continuityDevice, publicKey *continuityPublicKey) (any, error) {
	if publicKey == nil {
		return nil, nil // Compatible with older clients and private rendezvous.
	}
	if !publicKey.valid() {
		return nil, errors.New("invalid device key")
	}
	authority, err := g.discoveryAuthority()
	if err != nil {
		return nil, err
	}
	origin, err := url.Parse(g.config.Origin)
	if err != nil {
		return nil, err
	}
	ids := []string{device.UID, device.Peer}
	sort.Strings(ids)
	context := origin.Scheme + "://" + origin.Host + "\n" + ids[0] + "\n" + ids[1] + "\n" + device.Epoch
	derive := func(purpose string) string {
		mac := hmac.New(sha256.New, authority.D.FillBytes(make([]byte, 32)))
		mac.Write([]byte("oneworkspace-chat-discovery-v1\n" + purpose + "\n" + context))
		return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	}
	room := derive("room")
	claims := map[string]any{
		"v": 1, "aud": "oneworkspace-chat-discovery-v1", "uid": device.UID, "peer": device.Peer,
		"epoch": device.Epoch, "origin": origin.Scheme + "://" + origin.Host, "room": room,
		"issued": time.Now().UnixMilli(), "expires": device.Expires.UnixMilli(), "key": publicKey,
	}
	payload, err := json.Marshal(claims)
	if err != nil {
		return nil, err
	}
	encoded := base64.RawURLEncoding.EncodeToString(payload)
	digest := sha256.Sum256([]byte(encoded))
	r, s, err := ecdsa.Sign(rand.Reader, authority, digest[:])
	if err != nil {
		return nil, err
	}
	signature := append(r.FillBytes(make([]byte, 32)), s.FillBytes(make([]byte, 32))...)
	return map[string]any{
		"v": 1, "room": room, "password": derive("password"), "relays": discoveryRelays,
		"authority": discoveryPublicKey(&authority.PublicKey),
		"token":     encoded + "." + base64.RawURLEncoding.EncodeToString(signature),
		"expires":   device.Expires.UnixMilli(),
	}, nil
}
