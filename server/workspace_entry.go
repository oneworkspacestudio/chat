//go:build windows && workspace && !workspacetest

package main

import (
	workspaceauth "github.com/tinode/chat/server/auth/workspace"
	"github.com/tinode/chat/server/store"
	"github.com/tinode/chat/workspace"
	"os"
)

// The same portable executable supervises its private database and Tinode
// engine. The internal child retains upstream's normal flags and main loop.
func init() {
	if len(os.Args) > 1 && os.Args[1] == "engine" {
		workspaceRoutes = workspaceauth.RegisterDirectory
		workspaceGatewayUser = workspaceauth.BoundGatewayUser
		workspaceMediaMembership = true
		store.ManagedMediaAuthorization = true
		// Keep authentication tickets and private message bodies out of runtime logs.
		logClientPackets = false
		os.Args = append(os.Args[:1], os.Args[2:]...)
		return
	}
	os.Exit(workspace.Main())
}
