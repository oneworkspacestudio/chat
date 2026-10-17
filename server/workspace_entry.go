//go:build windows && workspace

package main

import (
	_ "github.com/tinode/chat/server/auth/workspace"
	"github.com/tinode/chat/workspace"
	"os"
)

// The same portable executable supervises its private database and Tinode
// engine. The internal child retains upstream's normal flags and main loop.
func init() {
	if len(os.Args) > 1 && os.Args[1] == "engine" {
		os.Args = append(os.Args[:1], os.Args[2:]...)
		return
	}
	os.Exit(workspace.Main())
}
