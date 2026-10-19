//go:build windows

package workspace

import (
	"archive/zip"
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/md5" // Tinode's existing API-key format uses HMAC-MD5.
	"crypto/rand"
	"crypto/sha256"
	_ "embed"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/tinode/chat/workspace/platform"
)

//go:embed payload/runtime.zip
var runtimeZip []byte
var Version = "0.1.0-preview.5"

type privateState struct {
	Password   string `json:"databasePassword"`
	TicketKey  []byte `json:"ticketKey"`
	TokenKey   []byte `json:"tokenKey"`
	UIDKey     []byte `json:"uidKey"`
	APIKeySalt []byte `json:"apiKeySalt"`
}

func random(n int) []byte {
	b := make([]byte, n)
	if _, e := rand.Read(b); e != nil {
		panic(e)
	}
	return b
}
func env(key, otherwise string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return otherwise
}
func Main() int {
	if len(os.Args) > 1 && os.Args[1] == "version" {
		fmt.Println(Version)
		return 0
	}
	f := flag.NewFlagSet("Chat", flag.ContinueOnError)
	home, _ := os.UserConfigDir()
	data := f.String("data", filepath.Join(home, "OneWorkspace", "Chat"), "protected NTFS Chat data folder")
	listen := f.String("listen", env("CHAT_LISTEN", "127.0.0.1:9006"), "loopback listener")
	origin := f.String("origin", env("CHAT_PUBLIC_URL", "http://localhost:9006/chat"), "public Chat URL including /chat")
	issuer := f.String("issuer", env("WORKSPACE_OIDC_ISSUER", ""), "MyAccounts issuer")
	client := f.String("client-id", env("WORKSPACE_OIDC_CLIENT_ID", ""), "Chat OIDC client ID")
	noBrowser := f.Bool("no-browser", false, "start without opening a browser")
	if e := f.Parse(os.Args[1:]); e != nil {
		return 2
	}
	c := Config{Data: *data, Listen: *listen, Origin: strings.TrimRight(*origin, "/"), Issuer: *issuer, ClientID: *client, ClientSecret: env("WORKSPACE_OIDC_CLIENT_SECRET", "")}
	c.DirectoryToken = env("WORKSPACE_CHAT_DIRECTORY_TOKEN", "")
	c.WorkspaceOrigin = env("WORKSPACE_HOME_URL", "")
	c.CatalogURL = env("WORKSPACE_CHAT_CATALOG_URL", "")
	if e := managedAdmission(c, env("WORKSPACE_CHAT_MANAGER_CAPABILITIES", "")); e != nil {
		log.Print(e)
		return 1
	}
	if e := validate(c); e != nil {
		log.Print(e)
		return 1
	}
	if e := run(c, *noBrowser); e != nil {
		log.Print("Chat startup failed: ", e)
		return 1
	}
	return 0
}
func unpack(data string) (string, error) {
	sum := sha256.Sum256(runtimeZip)
	root := filepath.Join(data, "runtime", hex.EncodeToString(sum[:8]))
	z, e := zip.NewReader(bytes.NewReader(runtimeZip), int64(len(runtimeZip)))
	if e != nil {
		return "", e
	}
	for _, entry := range z.File {
		if entry.FileInfo().IsDir() {
			continue
		}
		if entry.Mode()&os.ModeSymlink != 0 || entry.UncompressedSize64 > 512<<20 {
			return "", errors.New("invalid bundled runtime")
		}
		path, e := platform.Inside(root, entry.Name)
		if e != nil {
			return "", e
		}
		src, e := entry.Open()
		if e != nil {
			return "", e
		}
		b, e := io.ReadAll(io.LimitReader(src, 512<<20))
		src.Close()
		if e != nil {
			return "", e
		}
		if existing, e := os.ReadFile(path); e == nil && sha256.Sum256(existing) == sha256.Sum256(b) {
			continue
		}
		if e = platform.AtomicWrite(path, b); e != nil {
			return "", e
		}
	}
	return root, nil
}
func port() (int, error) {
	l, e := net.Listen("tcp", "127.0.0.1:0")
	if e != nil {
		return 0, e
	}
	p := l.Addr().(*net.TCPAddr).Port
	l.Close()
	return p, nil
}
func run(c Config, noBrowser bool) error {
	if _, e := platform.CheckDataVolume(c.Data); e != nil {
		return e
	}
	if e := os.MkdirAll(c.Data, 0700); e != nil {
		return e
	}
	if e := platform.ProtectDir(c.Data); e != nil {
		return e
	}
	lock, e := platform.Lock(filepath.Join(c.Data, "chat.lock"))
	if e != nil {
		return e
	}
	defer lock.Close()
	statePath := filepath.Join(c.Data, "secrets.dpapi")
	var s privateState
	if e = platform.LoadSecret(statePath, &s); os.IsNotExist(e) {
		s = privateState{platform.Token(), random(32), random(32), random(16), random(32)}
		e = platform.SaveSecret(statePath, s)
	}
	if e != nil {
		return e
	}
	if s.Password == "" || len(s.TicketKey) != 32 || len(s.TokenKey) != 32 || len(s.UIDKey) != 16 || len(s.APIKeySalt) != 32 {
		return errors.New("Chat installation keys are incomplete; restore the protected data backup")
	}
	root, e := unpack(c.Data)
	if e != nil {
		return e
	}
	job, e := platform.NewJob()
	if e != nil {
		return e
	}
	defer job.Close()
	logs, e := os.OpenFile(filepath.Join(c.Data, "runtime.log"), os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0600)
	if e != nil {
		return e
	}
	defer logs.Close()
	command := func(exe string, args ...string) *exec.Cmd {
		cmd := exec.Command(exe, args...)
		cmd.Dir = c.Data
		cmd.Stdout = logs
		cmd.Stderr = logs
		for _, v := range os.Environ() {
			if !strings.HasPrefix(v, "WORKSPACE_OIDC_") && !strings.HasPrefix(v, "WORKSPACE_CHAT_") {
				cmd.Env = append(cmd.Env, v)
			}
		}
		return cmd
	}
	runOnce := func(exe string, args ...string) error {
		cmd := command(exe, args...)
		if err := job.Start(cmd); err != nil {
			return err
		}
		return cmd.Wait()
	}
	pg := filepath.Join(root, "postgres", "bin")
	cluster := filepath.Join(c.Data, "database")
	if _, e = os.Stat(filepath.Join(cluster, "PG_VERSION")); os.IsNotExist(e) {
		pw := filepath.Join(c.Data, ".init-password")
		if e = platform.AtomicWrite(pw, []byte(s.Password+"\n")); e != nil {
			return e
		}
		e = runOnce(filepath.Join(pg, "initdb.exe"), "-D", cluster, "-U", "postgres", "--pwfile="+pw, "--auth=scram-sha-256", "--encoding=UTF8", "--locale=C")
		os.Remove(pw)
		if e != nil {
			return errors.New("private database initialization failed; see the protected runtime log")
		}
	} else if e != nil {
		return e
	}
	dbPort, e := port()
	if e != nil {
		return e
	}
	enginePort, e := port()
	if e != nil {
		return e
	}
	postgres := command(filepath.Join(pg, "postgres.exe"), "-D", cluster, "-h", "127.0.0.1", "-p", strconv.Itoa(dbPort), "-c", "max_connections=24", "-c", "shared_buffers=32MB")
	if e = job.Start(postgres); e != nil {
		return e
	}
	pgDone := make(chan error, 1)
	go func() { pgDone <- postgres.Wait() }()
	defer runOnce(filepath.Join(pg, "pg_ctl.exe"), "-D", cluster, "stop", "-m", "fast", "-t", "20")
	deadline := time.Now().Add(90 * time.Second)
	for {
		// A listening socket can still be rejecting queries during WAL recovery.
		// Authenticate to the maintenance database before running migrations.
		probe, cancelProbe := context.WithTimeout(context.Background(), 2*time.Second)
		cfg, _ := pgx.ParseConfig("")
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.Database = "127.0.0.1", uint16(dbPort), "postgres", s.Password, "postgres"
		cfg.TLSConfig = nil
		cfg.Fallbacks = nil
		conn, err := pgx.ConnectConfig(probe, cfg)
		if err == nil {
			_, err = conn.Exec(probe, "SELECT 1")
			conn.Close(probe)
		}
		cancelProbe()
		if err == nil {
			break
		}
		select {
		case <-pgDone:
			return errors.New("private database stopped during startup; see runtime.log")
		default:
		}
		if time.Now().After(deadline) {
			return errors.New("private database did not start; see runtime.log")
		}
		time.Sleep(200 * time.Millisecond)
	}
	key := make([]byte, 24)
	key[0] = 1
	key[5] = 1
	mac := hmac.New(md5.New, s.APIKeySalt)
	mac.Write(key[:8])
	copy(key[8:], mac.Sum(nil))
	apiKey := base64.URLEncoding.EncodeToString(key)
	config := map[string]any{
		"listen": fmt.Sprintf("127.0.0.1:%d", enginePort), "api_path": pathBase(c.Origin) + "/", "grpc_listen": "", "static_data": "", "static_mount": "/", "expvar": "-", "server_status": "-", "max_message_size": 262144, "max_subscriber_count": 256, "max_tag_count": 16, "permanent_accounts": true,
		"push":         []any{}, // Tinode requires an explicit empty array when push is disabled.
		"api_key_salt": s.APIKeySalt, "auth_config": map[string]any{"logical_names": []string{"basic:", "anon:", "code:", "rest:"}, "token": map[string]any{"key": s.TokenKey, "expire_in": 28800, "serial_num": 1}, "workspace": map[string]any{"key": s.TicketKey}},
		"store_config": map[string]any{"uid_key": s.UIDKey, "use_adapter": "postgres", "max_results": 256, "adapters": map[string]any{"postgres": map[string]any{"user": "postgres", "passwd": s.Password, "host": "127.0.0.1", "port": strconv.Itoa(dbPort), "dbname": "tinode", "ssl_mode": "disable", "max_open_conns": 12, "max_idle_conns": 2, "sql_timeout": 10}}},
		"media":        map[string]any{"use_handler": "fs", "max_size": 25 << 20, "gc_period": 3600, "gc_block_size": 100, "handlers": map[string]any{"fs": map[string]any{"upload_dir": filepath.Join(c.Data, "attachments"), "serve_url": pathBase(c.Origin) + "/v0/file/s/", "cache_control": "private, no-store"}}},
	}
	confPath := filepath.Join(c.Data, "engine.json")
	if e = platform.SaveJSON(confPath, config); e != nil {
		return e
	}
	if e = runOnce(filepath.Join(root, "tinode-db.exe"), "-config", confPath, "-upgrade"); e != nil {
		return errors.New("Chat database setup or migration failed; see the protected runtime log")
	}
	if e = migrateAppState(dbPort, s.Password); e != nil {
		return errors.New("Chat application migration failed; your existing database has not been replaced")
	}
	self, e := os.Executable()
	if e != nil {
		return e
	}
	engine := command(self, "engine", "-config", confPath, "-static_data", filepath.Join(root, "web"))
	if e = job.Start(engine); e != nil {
		return e
	}
	engineDone := make(chan error, 1)
	go func() { engineDone <- engine.Wait() }()
	address := fmt.Sprintf("http://127.0.0.1:%d", enginePort)
	deadline = time.Now().Add(30 * time.Second)
	for {
		conn, err := net.DialTimeout("tcp", fmt.Sprintf("127.0.0.1:%d", enginePort), time.Second)
		if err == nil {
			conn.Close()
			break
		}
		select {
		case <-engineDone:
			return errors.New("Chat engine stopped; see runtime.log")
		default:
		}
		if time.Now().After(deadline) {
			return errors.New("Chat engine did not become ready")
		}
		time.Sleep(200 * time.Millisecond)
	}
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
	defer cancel()
	g, e := NewGateway(ctx, c, s.TicketKey, apiKey, address, filepath.Join(root, "web"))
	if e != nil {
		return e
	}
	listener, e := net.Listen("tcp", c.Listen)
	if e != nil {
		return e
	}
	server := &http.Server{Handler: g, ReadHeaderTimeout: 15 * time.Second, IdleTimeout: 90 * time.Second, MaxHeaderBytes: 64 << 10}
	done := make(chan error, 1)
	go func() { done <- server.Serve(listener) }()
	fmt.Println("Chat " + Version + " is ready at " + c.Origin)
	if !noBrowser {
		platform.OpenBrowser(c.Origin)
	}
	select {
	case <-ctx.Done():
	case e = <-done:
		if e != nil && e != http.ErrServerClosed {
			return e
		}
	case <-engineDone:
		return errors.New("Chat engine stopped unexpectedly; restart Chat")
	case <-pgDone:
		return errors.New("Chat database stopped unexpectedly; restart Chat")
	}
	shutdown, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelShutdown()
	return server.Shutdown(shutdown)
}
func pathBase(raw string) string {
	p := strings.Index(raw, "://")
	if p < 0 {
		return ""
	}
	tail := raw[p+3:]
	if at := strings.IndexByte(tail, '/'); at >= 0 {
		return strings.TrimRight(tail[at:], "/")
	}
	return ""
}
