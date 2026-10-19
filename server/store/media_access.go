package store

import "github.com/tinode/chat/server/store/types"

// Set only by the supervised Workspace engine entry point.
var ManagedMediaAuthorization bool

func AuthorizeManagedAttachments(uid types.Uid, urls []string) error {
	if !ManagedMediaAuthorization {
		return nil
	}
	for _, url := range urls {
		if id := mediaHandler.GetIdFromUrl(url); !id.IsZero() {
			allowed, err := ManagedFileCanRead(uid, id.String())
			if err != nil {
				return err
			}
			if !allowed {
				return types.ErrPermissionDenied
			}
		}
	}
	return nil
}

func ManagedFileCanRead(uid types.Uid, fid string) (bool, error) {
	if uid.IsZero() || types.ParseUid(fid).IsZero() {
		return false, types.ErrPermissionDenied
	}
	adapter, ok := adp.(interface {
		FileCanRead(types.Uid, string) (bool, error)
	})
	if !ok {
		return false, types.ErrUnsupported
	}
	return adapter.FileCanRead(uid, fid)
}
