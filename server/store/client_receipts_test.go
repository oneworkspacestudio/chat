package store

import "testing"

func TestClientMessageDigestBindsCompletePayload(t *testing.T) {
	head := map[string]any{"workspace_id": "550e8400-e29b-41d4-a716-446655440000", "mime": "text/plain"}
	first, err := ClientMessageDigest(head, "synthetic content")
	if err != nil {
		t.Fatal(err)
	}
	second, err := ClientMessageDigest(map[string]any{"mime": "text/plain", "workspace_id": head["workspace_id"]}, "synthetic content")
	if err != nil || first != second {
		t.Fatal("map order changed retry digest")
	}
	head["workspace_audience"] = map[string]any{"version": 1, "members": []string{"usrSynthetic"}}
	withAudience, _ := ClientMessageDigest(head, "synthetic content")
	if withAudience != first {
		t.Fatal("server-owned audience changed the client retry digest")
	}
	changed, _ := ClientMessageDigest(head, "changed content")
	if changed == first {
		t.Fatal("different content reused digest")
	}
	head["reply"] = "7"
	changed, _ = ClientMessageDigest(head, "synthetic content")
	if changed == first {
		t.Fatal("different reply reused digest")
	}
	files, _ := ClientMessageDigest(head, "synthetic content", []string{"/chat/v0/file/s/one"})
	otherFiles, _ := ClientMessageDigest(head, "synthetic content", []string{"/chat/v0/file/s/two"})
	if files == otherFiles {
		t.Fatal("different attachment grant reused digest")
	}
	for _, invalid := range []any{nil, 123, "", "../id", "550e8400-e29b-11d4-a716-446655440000"} {
		if _, err := ClientMessageDigest(map[string]any{"workspace_id": invalid}, "x"); err == nil {
			t.Fatalf("accepted invalid retry ID %v", invalid)
		}
	}
}
