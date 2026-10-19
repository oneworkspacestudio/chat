package main

import (
	"github.com/tinode/chat/server/auth"
	"github.com/tinode/chat/server/store/types"
	"testing"
	"time"
)

func TestManagedSessionCannotAuthenticateAsAnotherUser(t *testing.T) {
	session := Session{workspaceUid: types.Uid(1)}
	result := session.onLogin("synthetic", time.Now(), &auth.Rec{Uid: types.Uid(2)}, nil)
	if result == nil || result.Ctrl == nil || result.Ctrl.Code != 403 || !session.uid.IsZero() {
		t.Fatal("gateway-bound session accepted another user")
	}
}
