package store

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"regexp"

	"github.com/tinode/chat/server/store/types"
)

var clientMessageID = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)

// The digest binds a retry ID to exactly one authenticated message. This is
// transport idempotency, not a content-encryption primitive.
func ClientMessageDigest(head map[string]any, content any, attachments ...[]string) (string, error) {
	id, ok := head["workspace_id"].(string)
	if !ok || !clientMessageID.MatchString(id) {
		return "", types.ErrMalformed
	}
	var files []string
	if len(attachments) > 0 && len(attachments[0]) > 0 {
		files = attachments[0]
	}
	body, err := json.Marshal([]any{head, content, files})
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(body)
	return hex.EncodeToString(sum[:]), nil
}

// Optional extension: the managed Windows build uses PostgreSQL. An upstream
// adapter without durable receipts must reject this capability rather than
// accepting retries which could duplicate a message.
func ClientMessageReceipt(topic, sender, id string) (int, string, error) {
	a, ok := adp.(interface {
		ClientMessageReceipt(string, string, string) (int, string, error)
	})
	if !ok {
		return 0, "", types.ErrUnsupported
	}
	return a.ClientMessageReceipt(topic, sender, id)
}
