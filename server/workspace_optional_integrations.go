//go:build !workspace

package main

// Optional cloud integrations are retained for full upstream builds.
import (
	_ "github.com/tinode/chat/server/media/s3"
	_ "github.com/tinode/chat/server/push/fcm"
	_ "github.com/tinode/chat/server/push/tnpg"
	_ "github.com/tinode/chat/server/validate/tel"
)
