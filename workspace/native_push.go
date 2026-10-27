//go:build windows

package workspace

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"errors"
	"os"
	"path/filepath"
	"strings"
)

type nativePushOptions struct {
	ProjectID       string `json:"projectId"`
	ApplicationID   string `json:"applicationId"`
	SenderID        string `json:"senderId"`
	APIKey          string `json:"apiKey"`
	CredentialsFile string `json:"credentialsFile"`
}

func nativePushConfig(data string) (nativePushOptions, string, error) {
	var p nativePushOptions
	b, err := os.ReadFile(filepath.Join(data, "native-push.json"))
	if os.IsNotExist(err) {
		return p, "", nil
	}
	if err != nil {
		return p, "", err
	}
	if len(b) > 16384 || json.Unmarshal(b, &p) != nil {
		return p, "", errors.New("invalid native push configuration")
	}
	if p.ProjectID == "" || p.APIKey == "" || p.SenderID == "" || !strings.HasPrefix(p.ApplicationID, "1:"+p.SenderID+":android:") {
		return p, "", errors.New("native push needs matching Firebase Android application options")
	}
	if filepath.IsAbs(p.CredentialsFile) || filepath.Clean(p.CredentialsFile) != p.CredentialsFile || strings.ContainsAny(p.CredentialsFile, "/\\:") || p.CredentialsFile == "" {
		return p, "", errors.New("native push credentials must be a file in protected Chat data")
	}
	file := filepath.Join(data, p.CredentialsFile)
	key, err := os.ReadFile(file)
	if err != nil {
		return p, "", errors.New("native push service credential unavailable")
	}
	var credentials struct {
		ProjectID  string `json:"project_id"`
		Type       string `json:"type"`
		PrivateKey string `json:"private_key"`
		Email      string `json:"client_email"`
		TokenURI   string `json:"token_uri"`
	}
	if len(key) > 65536 || json.Unmarshal(key, &credentials) != nil || credentials.ProjectID != p.ProjectID {
		return p, "", errors.New("native push project does not match the server credential")
	}
	block, _ := pem.Decode([]byte(credentials.PrivateKey))
	if block == nil || credentials.Type != "service_account" || credentials.Email == "" || credentials.TokenURI != "https://oauth2.googleapis.com/token" {
		return p, "", errors.New("native push needs a valid Google service-account credential")
	}
	parsed, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return p, "", errors.New("native push service key is invalid")
	}
	if _, ok := parsed.(*rsa.PrivateKey); !ok {
		return p, "", errors.New("native push needs an RSA service-account key")
	}
	return p, file, nil
}
func (g *Gateway) nativePushPublic() (map[string]any, error) {
	p, file, e := nativePushConfig(g.config.Data)
	if e != nil || file == "" {
		return map[string]any{"configured": false}, e
	}
	return map[string]any{"configured": true, "projectId": p.ProjectID, "applicationId": p.ApplicationID, "apiKey": p.APIKey, "senderId": p.SenderID}, nil
}
