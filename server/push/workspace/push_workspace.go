// Package workspace forwards only opaque wake signals to a local My Push service.
package workspace

import (
	"bytes"
	"encoding/json"
	"errors"
	"github.com/tinode/chat/server/logs"
	"github.com/tinode/chat/server/push"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

type Handler struct {
	input       chan *push.Receipt
	channel     chan *push.ChannelReq
	stop        chan struct{}
	once        sync.Once
	client      *http.Client
	target, key string
}

func init() { push.Register("workspace", &Handler{}) }
func (h *Handler) Init(raw json.RawMessage) (bool, error) {
	var c struct {
		Enabled bool   `json:"enabled"`
		URL     string `json:"url"`
		Key     string `json:"key"`
	}
	if json.Unmarshal(raw, &c) != nil {
		return false, errors.New("invalid Workspace push config")
	}
	if !c.Enabled {
		return false, nil
	}
	u, e := url.Parse(c.URL)
	if e != nil || u.Scheme != "http" || u.Hostname() != "127.0.0.1" || u.User != nil || u.RawQuery != "" || u.Fragment != "" || len(c.Key) < 48 {
		return false, errors.New("Workspace push requires a private loopback service")
	}
	h.target = strings.TrimRight(c.URL, "/") + "/api/service/publish"
	h.key = c.Key
	h.input = make(chan *push.Receipt, 1024)
	h.channel = make(chan *push.ChannelReq, 32)
	h.stop = make(chan struct{})
	h.client = &http.Client{Timeout: 5 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	go h.run()
	return true, nil
}
func (h *Handler) run() {
	for {
		select {
		case <-h.stop:
			return
		case <-h.channel:
		case receipt := <-h.input:
			if receipt == nil || receipt.Payload.What != push.ActMsg || receipt.Payload.Silent {
				continue
			}
			for uid := range receipt.To {
				b, _ := json.Marshal(map[string]string{"recipient": uid.UserId()})
				for attempt := 0; attempt < 3; attempt++ {
					req, _ := http.NewRequest("POST", h.target, bytes.NewReader(b))
					req.Header.Set("Authorization", "Bearer "+h.key)
					req.Header.Set("X-Push-Project", "chat")
					req.Header.Set("Content-Type", "application/json")
					res, e := h.client.Do(req)
					if e == nil {
						res.Body.Close()
						if res.StatusCode == 202 {
							break
						}
						if res.StatusCode < 500 && res.StatusCode != 429 {
							logs.Warn.Println("My Push rejected wake signal; check managed connection")
							break
						}
					}
					if attempt == 2 {
						logs.Warn.Println("My Push unavailable; phones recover through Chat sync")
						break
					}
					timer := time.NewTimer(time.Duration(attempt+1) * time.Second)
					select {
					case <-h.stop:
						timer.Stop()
						return
					case <-timer.C:
					}
				}
			}
		}
	}
}
func (h *Handler) IsReady() bool                    { return h.input != nil }
func (h *Handler) Push() chan<- *push.Receipt       { return h.input }
func (h *Handler) Channel() chan<- *push.ChannelReq { return h.channel }
func (h *Handler) Stop() {
	h.once.Do(func() {
		if h.stop != nil {
			close(h.stop)
		}
	})
}
