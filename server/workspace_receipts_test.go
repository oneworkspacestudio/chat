package main

import (
	"reflect"
	"testing"

	"github.com/tinode/chat/server/store/types"
)

func TestWorkspaceAudienceCapturesOnlyActiveReadableMembers(t *testing.T) {
	mode := types.ModeJoin | types.ModeRead
	topic := &Topic{cat: types.TopicCatGrp, perUser: map[types.Uid]perUserData{
		1: {modeGiven: mode, modeWant: mode},
		2: {modeGiven: mode, modeWant: mode},
		3: {modeGiven: mode, modeWant: mode, deleted: true},
		4: {modeGiven: mode, modeWant: mode, isChan: true},
		5: {modeGiven: mode, modeWant: types.ModeJoin},
		6: {modeGiven: mode, modeWant: mode},
	}}
	audience := topic.workspaceReceiptAudience(1)
	want := []string{types.Uid(2).UserId(), types.Uid(6).UserId()}
	if audience["version"] != 1 || !reflect.DeepEqual(audience["members"], want) {
		t.Fatal("audience included sender, removed, non-reader or channel-only subscriber", audience)
	}
	delete(topic.perUser, 2)
	if !reflect.DeepEqual(audience["members"], want) {
		t.Fatal("later membership removal changed the captured audience")
	}
	topic.isChan = true
	if topic.workspaceReceiptAudience(1) != nil {
		t.Fatal("one-way channel reported a group audience")
	}
}
