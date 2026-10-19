//go:build windows

package workspace

import "testing"

func TestManagedAdmissionBeforeStorage(t *testing.T) {
	c := Config{DirectoryToken: "managed", Data: "must-not-be-touched"}
	if managedAdmission(c, "") == nil {
		t.Fatal("old manager admitted")
	}
	if managedAdmission(c, "isolated-chat-origin-v1") == nil {
		t.Fatal("missing integration addresses admitted")
	}
	c.WorkspaceOrigin = "http://localhost:8990"
	c.CatalogURL = "http://127.0.0.1:8990/_integration/chat/catalog"
	if err := managedAdmission(c, "isolated-chat-origin-v1"); err != nil {
		t.Fatal(err)
	}
	if err := managedAdmission(Config{}, ""); err != nil {
		t.Fatal("standalone use incorrectly requires a suite manager")
	}
}
