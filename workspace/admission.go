//go:build windows

package workspace

import (
	"errors"
	"strings"
)

// This check runs before data-directory creation, secret loading, extraction or
// database startup. Old managers may obtain an app from a full suite bundle even
// when they reject its independent update manifest. Fail before migration so
// their normal update rollback can restore the previous working executable/data.
// The official app catalog must never set this manager-supplied capability.
func managedAdmission(c Config, capabilities string) error {
	if c.DirectoryToken == "" {
		return nil
	}
	for _, capability := range strings.Fields(capabilities) {
		if capability == "isolated-chat-origin-v1" && c.WorkspaceOrigin != "" && c.CatalogURL != "" {
			return nil
		}
	}
	return errors.New("Chat needs One Workspace 0.3.0-preview.43 or newer. Update Workspace and Chat together; this older manager cannot start the dedicated Chat origin. Chat data has not been opened or migrated")
}
