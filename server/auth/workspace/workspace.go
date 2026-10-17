// Package workspace accepts short-lived, single-use tickets issued after OIDC
// verification by this installation's Chat gateway. It never accepts a user ID
// or email supplied directly by a browser as proof of identity.
package workspace

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"sync"
	"time"

	"github.com/tinode/chat/server/auth"
	"github.com/tinode/chat/server/store"
	"github.com/tinode/chat/server/store/types"
)

type authenticator struct {
	name string
	key  []byte
	mu   sync.Mutex
	used map[string]int64
}
type Ticket struct {
	Issuer   string `json:"iss"`
	Subject  string `json:"sub"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	Username string `json:"preferred_username,omitempty"`
	Nonce    string `json:"jti"`
	Expires  int64  `json:"exp"`
}

func (a *authenticator) Init(raw json.RawMessage, name string) error {
	var c struct {
		Key []byte `json:"key"`
	}
	if err := json.Unmarshal(raw, &c); err != nil {
		return err
	}
	if len(c.Key) < 32 || name == "" {
		return errors.New("invalid Workspace authentication configuration")
	}
	a.key = c.Key
	a.name = name
	a.used = map[string]int64{}
	return nil
}
func (a *authenticator) IsInitialized() bool { return a.name != "" }
func (a *authenticator) Authenticate(secret []byte, remote string) (*auth.Rec, []byte, error) {
	parts := strings.Split(string(secret), ".")
	if len(parts) != 2 {
		return nil, nil, types.ErrFailed
	}
	body, e := base64.RawURLEncoding.DecodeString(parts[0])
	if e != nil {
		return nil, nil, types.ErrFailed
	}
	sig, e := base64.RawURLEncoding.DecodeString(parts[1])
	if e != nil {
		return nil, nil, types.ErrFailed
	}
	h := hmac.New(sha256.New, a.key)
	h.Write(body)
	if !hmac.Equal(sig, h.Sum(nil)) {
		return nil, nil, types.ErrFailed
	}
	var t Ticket
	if json.Unmarshal(body, &t) != nil || t.Subject == "" || t.Issuer == "" || t.Nonce == "" || t.Expires <= time.Now().Unix() || t.Expires > time.Now().Add(90*time.Second).Unix() {
		return nil, nil, types.ErrExpired
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	now := time.Now().Unix()
	for j, exp := range a.used {
		if exp <= now {
			delete(a.used, j)
		}
	}
	if _, ok := a.used[t.Nonce]; ok {
		return nil, nil, types.ErrFailed
	}
	a.used[t.Nonce] = t.Expires
	uid, err := a.ensureUser(t, false)
	if err != nil {
		return nil, nil, err
	}
	return &auth.Rec{Uid: uid, AuthLevel: auth.LevelAuth, Lifetime: auth.Duration(8 * time.Hour), Features: auth.FeatureValidated, State: types.StateUndefined}, nil, nil
}

// Caller holds a.mu. Issuer+subject remains the only account identity.
func (a *authenticator) ensureUser(t Ticket, directory bool) (types.Uid, error) {
	sum := sha256.Sum256([]byte(t.Issuer + "\x00" + t.Subject))
	// PostgreSQL uname is limited to32 bytes including the workspace: prefix.
	unique := identityKey(sum)
	fingerprint := []byte(hex.EncodeToString(sum[:]))
	uid, _, stored, _, err := store.Users.GetAuthUniqueRecord(a.name, unique)
	if err != nil {
		return 0, err
	}
	// Retain the complete digest too: a truncated-key collision must fail closed.
	if !uid.IsZero() && !hmac.Equal(stored, fingerprint) {
		return 0, types.ErrFailed
	}
	if uid.IsZero() {
		user := types.User{State: types.StateOK, Public: map[string]any{"fn": t.Name}}
		user.Access.Auth = types.ModeCAuth
		user.Access.Anon = types.ModeNone
		if t.Email != "" {
			user.Tags = []string{"email:" + strings.ToLower(t.Email)}
		}
		if _, err = store.Users.Create(&user, nil); err != nil {
			return 0, err
		}
		uid = user.Uid()
		if err = store.Users.AddAuthRecord(uid, auth.LevelAuth, a.name, unique, fingerprint, time.Time{}); err != nil {
			_ = store.Users.Delete(uid, true)
			return 0, err
		}
	} else {
		user, e := store.Users.Get(uid)
		if e != nil {
			return 0, e
		}
		if user == nil {
			return 0, types.ErrNotFound
		}
		if !directory && user.State != types.StateOK {
			return 0, types.ErrPermissionDenied
		}
		if directory {
			if user.State != types.StateOK {
				if e = store.Users.UpdateState(uid, types.StateOK); e != nil {
					return 0, e
				}
			}
			// Directory display names are authoritative; retain avatars and other profile fields.
			public, _ := user.Public.(map[string]any)
			if public == nil {
				public = map[string]any{}
			}
			if public["fn"] != t.Name {
				public["fn"] = t.Name
				if e = store.Users.Update(uid, map[string]any{"Public": public}); e != nil {
					return 0, e
				}
			}
		}
	}
	return uid, nil
}
func (a *authenticator) AddRecord(*auth.Rec, []byte, string) (*auth.Rec, error) {
	return nil, types.ErrUnsupported
}
func (a *authenticator) UpdateRecord(*auth.Rec, []byte, string) (*auth.Rec, error) {
	return nil, types.ErrUnsupported
}
func (a *authenticator) IsUnique([]byte, string) (bool, error) { return false, types.ErrUnsupported }
func (a *authenticator) GenSecret(*auth.Rec) ([]byte, time.Time, error) {
	return nil, time.Time{}, types.ErrUnsupported
}
func (a *authenticator) AsTag(s string) string {
	if strings.Contains(s, "@") {
		return "email:" + strings.ToLower(s)
	}
	return ""
}
func (a *authenticator) DelRecords(uid types.Uid) error {
	return store.Users.DelAuthRecords(uid, a.name)
}
func (a *authenticator) RestrictedTags() ([]string, error) { return []string{"email"}, nil }
func (a *authenticator) GetResetParams(types.Uid) (map[string]any, error) {
	return nil, types.ErrUnsupported
}
func (a *authenticator) GetRealName() string { return "workspace" }

var managedAuthenticator = &authenticator{}

func identityKey(sum [32]byte) string { return base64.RawURLEncoding.EncodeToString(sum[:16]) }
func init()                           { store.RegisterAuthScheme("workspace", managedAuthenticator) }
