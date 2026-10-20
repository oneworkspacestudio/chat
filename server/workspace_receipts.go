package main

import (
	"sort"

	"github.com/tinode/chat/server/store/types"
)

// Capture the historical audience before storage. A later join/removal must not
// turn one reader into "everyone". No client can author this reserved header.
func (t *Topic) workspaceReceiptAudience(sender types.Uid) map[string]any {
	if t.cat != types.TopicCatGrp || t.isChan {
		return nil
	}
	members := make([]string, 0, len(t.perUser))
	for uid, user := range t.perUser {
		mode := user.modeGiven & user.modeWant
		if uid != sender && !user.deleted && !user.isChan && mode.IsJoiner() && mode.IsReader() {
			members = append(members, uid.UserId())
		}
	}
	sort.Strings(members)
	return map[string]any{"version": 1, "members": members}
}
