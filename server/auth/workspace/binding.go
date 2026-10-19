package workspace

import (
	"encoding/base64"
	"github.com/tinode/chat/server/store/types"
	"net/http"
)

func BoundGatewayUser(r *http.Request) (types.Uid, error) {
	secret, err := base64.StdEncoding.DecodeString(r.Header.Get("X-Workspace-Gateway"))
	if err != nil || len(secret) == 0 {
		return types.ZeroUid, types.ErrFailed
	}
	rec, challenge, err := managedAuthenticator.Authenticate(secret, r.RemoteAddr)
	if err != nil {
		return types.ZeroUid, err
	}
	if rec == nil || challenge != nil {
		return types.ZeroUid, types.ErrFailed
	}
	return rec.Uid, nil
}
