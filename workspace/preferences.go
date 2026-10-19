//go:build windows

package workspace

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"github.com/tinode/chat/workspace/platform"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

type chatList struct {
	ID     string   `json:"id"`
	Name   string   `json:"name"`
	Topics []string `json:"topics"`
}
type preferences struct {
	Version    uint64     `json:"version"`
	Lists      []chatList `json:"lists"`
	Favourites []string   `json:"favourites"`
}

var preferenceID = regexp.MustCompile(`^[A-Za-z0-9_-]{1,64}$`)
var preferenceTopic = regexp.MustCompile(`^(usr|grp|chn)[A-Za-z0-9_-]{11}$|^slf$`)

func validatePreferences(p preferences) error {
	if len(p.Lists) > 32 || len(p.Favourites) > 512 {
		return fmt.Errorf("Use up to 32 lists and 512 favourites")
	}
	seen := map[string]bool{}
	for _, list := range p.Lists {
		if !preferenceID.MatchString(list.ID) || seen[list.ID] || len(strings.TrimSpace(list.Name)) == 0 || len(list.Name) > 80 || len(list.Topics) > 512 {
			return fmt.Errorf("Give each list a unique ID, a name up to 80 bytes and at most 512 chats")
		}
		seen[list.ID] = true
		topics := map[string]bool{}
		for _, id := range list.Topics {
			if !preferenceTopic.MatchString(id) || topics[id] {
				return fmt.Errorf("Invalid or repeated chat in list")
			}
			topics[id] = true
		}
	}
	seen = map[string]bool{}
	for _, id := range p.Favourites {
		if !preferenceTopic.MatchString(id) || seen[id] {
			return fmt.Errorf("Invalid or repeated favourite")
		}
		seen[id] = true
	}
	return nil
}
func (g *Gateway) preferences(w http.ResponseWriter, r *http.Request, s *loginSession) {
	if r.Method != "GET" && r.Method != "PUT" {
		w.WriteHeader(405)
		return
	}
	if r.Method == "PUT" && !g.sameOrigin(r) {
		http.Error(w, "Chat request origin rejected.", 403)
		return
	}
	key := sha256.Sum256([]byte(s.Ticket.Issuer + "\x00" + s.Ticket.Subject))
	path := filepath.Join(g.config.Data, "preferences", fmt.Sprintf("%x.json", key))
	// All writes for this gateway serialize comparison + atomic replacement.
	g.mu.Lock()
	defer g.mu.Unlock()
	p := preferences{Lists: []chatList{}, Favourites: []string{}}
	if err := platform.LoadJSON(path, &p); err != nil && !os.IsNotExist(err) {
		http.Error(w, "Preferences could not be read. Retry without replacing the saved file.", 503)
		return
	}
	if r.Method == "PUT" {
		if r.Header.Get("If-Match") != fmt.Sprintf(`"%d"`, p.Version) {
			http.Error(w, "Preferences changed on another device. Reload and try again.", 409)
			return
		}
		var next *preferences
		dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10))
		dec.DisallowUnknownFields()
		if err := dec.Decode(&next); err != nil || next == nil {
			http.Error(w, "Invalid preferences.", 400)
			return
		}
		if err := dec.Decode(new(any)); err != io.EOF {
			http.Error(w, "Invalid trailing preferences data.", 400)
			return
		}
		if err := validatePreferences(*next); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}
		next.Version = p.Version + 1
		if err := platform.SaveJSON(path, next); err != nil {
			http.Error(w, "Could not save preferences. Your previous settings are retained.", 503)
			return
		}
		p = *next
	}
	if p.Lists == nil {
		p.Lists = []chatList{}
	}
	if p.Favourites == nil {
		p.Favourites = []string{}
	}
	w.Header().Set("ETag", fmt.Sprintf(`"%d"`, p.Version))
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}
