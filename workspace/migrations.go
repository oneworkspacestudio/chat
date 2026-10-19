//go:build windows

package workspace

import (
	"context"
	"github.com/jackc/pgx/v5"
	"time"
)

// Additive app-owned schema. Existing Tinode tables, IDs and plaintext legacy
// history are not rewritten. A stopped-state Workspace snapshot is required
// before deployment; the previous engine safely ignores these extra tables.
func migrateAppState(port int, password string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	cfg, err := pgx.ParseConfig("host=127.0.0.1 user=postgres dbname=tinode sslmode=disable")
	if err != nil {
		return err
	}
	cfg.Port = uint16(port)
	cfg.Password = password
	conn, err := pgx.ConnectConfig(ctx, cfg)
	if err != nil {
		return err
	}
	defer conn.Close(ctx)
	tx, err := conn.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	_, err = tx.Exec(ctx, `CREATE TABLE IF NOT EXISTS workspace_migrations(id text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now());
 CREATE TABLE IF NOT EXISTS workspace_client_messages(topic varchar(25) NOT NULL,sender text NOT NULL,client_id uuid NOT NULL,seqid integer NOT NULL,digest char(64) NOT NULL,message_id bigint,PRIMARY KEY(topic,sender,client_id));
 ALTER TABLE workspace_client_messages DROP CONSTRAINT IF EXISTS workspace_client_messages_topic_fkey;
 ALTER TABLE workspace_client_messages ADD COLUMN IF NOT EXISTS message_id bigint;
 UPDATE workspace_client_messages c SET message_id=m.id FROM messages m
 WHERE c.message_id IS NULL AND m.topic=c.topic AND m.seqid=c.seqid AND m.head->>'workspace_id'=c.client_id::text
 AND NOT EXISTS(SELECT 1 FROM workspace_migrations WHERE id='chat-3-receipt-tombstones');
 INSERT INTO workspace_migrations(id) VALUES('chat-2-client-receipts'),('chat-3-receipt-tombstones') ON CONFLICT DO NOTHING;`)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}
