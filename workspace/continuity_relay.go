//go:build windows

package workspace

import (
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/tinode/chat/internal/continuityrelay"
)

type continuityRelayConfig struct {
	Endpoint string `json:"endpoint"`
	Seed     string `json:"signingSeed"`
}

// Configuration is optional and remains in the protected app data directory.
// The independently hosted service receives the public key only.
func (g *Gateway) continuityRelayConfig() (continuityRelayConfig, bool) {
	raw, err := os.ReadFile(filepath.Join(g.config.Data, "continuity-relay.json"))
	var config continuityRelayConfig
	if err != nil || len(raw) > 4096 || json.Unmarshal(raw, &config) != nil {
		return config, false
	}
	endpoint, err := url.Parse(config.Endpoint)
	if err != nil || endpoint.User != nil || endpoint.RawQuery != "" || endpoint.Fragment != "" || endpoint.Host == "" ||
		(endpoint.Scheme != "https" && !(endpoint.Scheme == "http" && (endpoint.Hostname() == "localhost" || endpoint.Hostname() == "127.0.0.1"))) {
		return config, false
	}
	seed, err := base64.RawURLEncoding.DecodeString(config.Seed)
	if err != nil || len(seed) != ed25519.SeedSize {
		return config, false
	}
	return config, true
}

func (g *Gateway) continuityConnectSource() string {
	sources := " " + strings.Join(discoveryRelays, " ")
	config, ok := g.continuityRelayConfig()
	if !ok {
		return sources
	}
	endpoint, _ := url.Parse(config.Endpoint)
	return sources + " " + endpoint.Scheme + "://" + endpoint.Host
}

func (g *Gateway) continuityRelayGrant(device *continuityDevice) any {
	config, ok := g.continuityRelayConfig()
	if !ok {
		return nil
	}
	seed, _ := base64.RawURLEncoding.DecodeString(config.Seed)
	origin, err := url.Parse(g.config.Origin)
	if err != nil {
		return nil
	}
	grant := continuityrelay.Grant{UID: device.UID, Peer: device.Peer, Epoch: device.Epoch,
		Origin: origin.Scheme + "://" + origin.Host, Audience: config.Endpoint, Issued: time.Now().UnixMilli(), Expires: device.Expires.UnixMilli()}
	return map[string]any{"endpoint": config.Endpoint, "token": continuityrelay.Sign(ed25519.NewKeyFromSeed(seed), grant), "expires": grant.Expires}
}
