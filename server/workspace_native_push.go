//go:build workspace

package main

// The adapter remains disabled without explicit protected per-installation
// credentials. Opaque mode never sends message bodies or sender names to FCM.
import (
	_ "github.com/tinode/chat/server/push/fcm"
	_ "github.com/tinode/chat/server/push/workspace"
)
