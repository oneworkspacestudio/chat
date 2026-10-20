//go:build windows

package workspace

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestPublicDiscoveryAuthorityAndScope(t *testing.T) {
	g := &Gateway{config: Config{Data: t.TempDir(), Origin: "https://chat.example.test/chat"}}
	deviceKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	key := discoveryPublicKey(&deviceKey.PublicKey)
	if !key.valid() || (continuityPublicKey{Kty: "EC", Crv: "P-256", X: "AA", Y: "AA"}).valid() {
		t.Fatal("device key validation")
	}
	a := &continuityDevice{UID: "usrAAAAAAAAAAA", Peer: "usrBBBBBBBBBBB", Epoch: strings.Repeat("e", 64), Expires: time.Now().Add(time.Hour)}
	grant, err := g.continuityDiscoveryGrant(a, &key)
	if err != nil {
		t.Fatal(err)
	}
	one := grant.(map[string]any)
	parts := strings.Split(one["token"].(string), ".")
	sig, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil || len(sig) != 64 {
		t.Fatal("invalid signature encoding")
	}
	authority, err := g.discoveryAuthority()
	if err != nil {
		t.Fatal(err)
	}
	digest := sha256.Sum256([]byte(parts[0]))
	if !ecdsa.Verify(&authority.PublicKey, digest[:], new(big.Int).SetBytes(sig[:32]), new(big.Int).SetBytes(sig[32:])) {
		t.Fatal("signature failed")
	}
	raw, _ := base64.RawURLEncoding.DecodeString(parts[0])
	var claims map[string]any
	if json.Unmarshal(raw, &claims) != nil || claims["uid"] != a.UID || claims["peer"] != a.Peer || claims["origin"] != "https://chat.example.test" {
		t.Fatal("claims not bound")
	}
	b := *a
	b.UID, b.Peer = a.Peer, a.UID
	second, err := g.continuityDiscoveryGrant(&b, &key)
	if err != nil {
		t.Fatal(err)
	}
	two := second.(map[string]any)
	if one["room"] != two["room"] || one["password"] != two["password"] || one["room"] == one["password"] {
		t.Fatal("mutual room or domain separation failed")
	}
	b.Epoch = strings.Repeat("f", 64)
	changed, err := g.continuityDiscoveryGrant(&b, &key)
	if err != nil || changed.(map[string]any)["room"] == one["room"] {
		t.Fatal("new conversation reused room")
	}
	restarted := &Gateway{config: g.config}
	persisted, err := restarted.discoveryAuthority()
	if err != nil || persisted.D.Cmp(authority.D) != 0 {
		t.Fatal("authority changed across restart")
	}
	if err = os.WriteFile(filepath.Join(g.config.Data, "continuity-authority.pk8"), []byte("corrupt"), 0600); err != nil {
		t.Fatal(err)
	}
	if _, err = restarted.discoveryAuthority(); err == nil {
		t.Fatal("corrupt authority was silently replaced")
	}
}
