// chat-rendezvous runs separately from Workspace. Put it behind independent
// HTTPS; running it beside the origin cannot survive that machine going down.
package main

import (
	"crypto/ed25519"
	"encoding/base64"
	"flag"
	"log"
	"net/http"
	"time"

	"github.com/tinode/chat/internal/continuityrelay"
)

func main() {
	listen := flag.String("listen", "127.0.0.1:8789", "HTTP listener behind independent HTTPS")
	audience := flag.String("endpoint", "", "exact public HTTPS signaling endpoint")
	origin := flag.String("origin", "", "allowed Chat origin, without a path")
	public := flag.String("public-key", "", "base64url Ed25519 public key from Chat administrator")
	flag.Parse()
	key, err := base64.RawURLEncoding.DecodeString(*public)
	if err != nil || len(key) != ed25519.PublicKeySize || *audience == "" || *origin == "" {
		log.Fatal("Provide endpoint, origin and the Chat signing public key")
	}
	relay := &continuityrelay.Server{Key: key, Audience: *audience, Origin: *origin}
	server := &http.Server{Addr: *listen, Handler: relay, ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 10 * time.Second, IdleTimeout: 30 * time.Second, MaxHeaderBytes: 8192}
	log.Print("Chat rendezvous ready (signaling only)")
	log.Fatal(server.ListenAndServe())
}
