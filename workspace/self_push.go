//go:build windows

package workspace

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

func selfPushSettings() (local, public, key string, ok bool) {
	local = os.Getenv("WORKSPACE_PUSH_URL")
	public = os.Getenv("WORKSPACE_PUSH_PUBLIC_URL")
	key = os.Getenv("WORKSPACE_PUSH_CHAT_KEY")
	u, e := url.Parse(local)
	p, pe := url.Parse(public)
	ok = e == nil && pe == nil && u.Scheme == "http" && u.Hostname() == "127.0.0.1" && u.User == nil && u.RawQuery == "" && u.Fragment == "" && p.Scheme == "https" && p.Host != "" && p.User == nil && p.RawQuery == "" && p.Fragment == "" && len(key) >= 48
	return
}
func selfPushRequest(ctx context.Context, method, path string, input any) (map[string]any, error) {
	local, _, key, ok := selfPushSettings()
	if !ok {
		return nil, errors.New("My Push is not connected")
	}
	b, _ := json.Marshal(input)
	req, e := http.NewRequestWithContext(ctx, method, strings.TrimRight(local, "/")+path, bytes.NewReader(b))
	if e != nil {
		return nil, e
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("X-Push-Project", "chat")
	client := &http.Client{Timeout: 5 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	res, e := client.Do(req)
	if e != nil {
		return nil, errors.New("My Push is reconnecting")
	}
	defer res.Body.Close()
	if res.StatusCode == 204 {
		return map[string]any{}, nil
	}
	if res.StatusCode != 200 {
		return nil, errors.New("My Push registration unavailable")
	}
	var out map[string]any
	e = json.NewDecoder(io.LimitReader(res.Body, 8192)).Decode(&out)
	return out, e
}
func (g *Gateway) selfPushPublic(ctx context.Context, id string, d nativeDevice) (map[string]any, error) {
	g.native.mu.Lock()
	defer g.native.mu.Unlock()
	current, live := g.native.devices[id]
	if !live || current.Hash != d.Hash || !g.nativeActive(current) {
		return nil, errors.New("device access ended")
	}
	_, public, _, ok := selfPushSettings()
	if !ok {
		return map[string]any{"configured": false}, nil
	}
	mac := hmac.New(sha256.New, []byte(d.Hash))
	mac.Write([]byte("workspace-push-device-v1\x00" + id))
	token := hex.EncodeToString(mac.Sum(nil))
	expiry := time.Now().Add(30 * time.Minute)
	if d.Expires.Before(expiry) {
		expiry = d.Expires
	}
	out, e := selfPushRequest(ctx, "POST", "/api/service/devices", map[string]any{"id": id, "recipient": d.UID, "label": "One Workspace Android", "token": token, "expires": expiry.Unix()})
	if e != nil {
		return map[string]any{"provider": "workspace", "configured": false}, e
	}
	out["url"] = public
	out["token"] = token
	out["configured"] = true
	return out, nil
}
func revokeSelfPush(id string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, _ = selfPushRequest(ctx, "DELETE", "/api/service/devices/"+url.PathEscape(id), nil)
}
