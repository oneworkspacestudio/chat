package main

import (
	"github.com/tinode/chat/server/store/types"
	"net/http"
)

// Set only by the managed engine entrypoint. Public clients cannot choose this
// binding: the loopback gateway signs it from its verified HttpOnly session.
var workspaceGatewayUser func(*http.Request) (types.Uid, error)
var workspaceMediaMembership bool

func boundGatewayUser(r *http.Request) (types.Uid, error) {
	if workspaceGatewayUser == nil {
		return types.ZeroUid, nil
	}
	return workspaceGatewayUser(r)
}
