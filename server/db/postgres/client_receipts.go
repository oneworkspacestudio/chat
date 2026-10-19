//go:build postgres

package postgres

import (
	"errors"
	"github.com/jackc/pgx/v5"
	"github.com/tinode/chat/server/db/common"
	"github.com/tinode/chat/server/store"
	t "github.com/tinode/chat/server/store/types"
)

func (a *adapter) ClientMessageReceipt(topic, sender, id string) (int, string, error) {
	ctx, cancel := a.getContext()
	if cancel != nil {
		defer cancel()
	}
	var seq int
	var digest string
	var available bool
	err := a.db.QueryRow(ctx, `SELECT c.seqid,c.digest,EXISTS(SELECT 1 FROM messages m WHERE m.id=c.message_id AND m.topic=c.topic AND m.seqid=c.seqid AND m.delid=0
 AND NOT EXISTS(SELECT 1 FROM dellog d WHERE d.topic=m.topic AND d.deletedfor=$4 AND m.seqid>=d.low AND (m.seqid<d.hi OR d.hi=0 AND m.seqid=d.low)))
 FROM workspace_client_messages c WHERE c.topic=$1 AND c.sender=$2 AND c.client_id=$3`, topic, sender, id, store.DecodeUid(t.ParseUid(sender))).Scan(&seq, &digest, &available)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, "", nil
	}
	if err == nil && !available {
		return seq, digest, t.ErrNotFound
	}
	return seq, digest, err
}

func (a *adapter) SaveManagedMessage(msg *t.Message, urls, files []string, readBySender bool) (error, bool) {
	digest := ""
	if msg.Head["workspace_id"] != nil {
		var err error
		digest, err = store.ClientMessageDigest(msg.Head, msg.Content, urls)
		if err != nil {
			return err, false
		}
	}
	ctx, cancel := a.getContext()
	if cancel != nil {
		defer cancel()
	}
	tx, err := a.db.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.Serializable})
	if err != nil {
		return err, false
	}
	defer tx.Rollback(ctx)
	from := store.DecodeUid(t.ParseUid(msg.From))
	for _, fid := range files {
		var allowed bool
		if err := tx.QueryRow(ctx, managedFileReadableSQL, store.DecodeUid(t.ParseUid(fid)), from, t.UploadCompleted).Scan(&allowed); err != nil {
			return err, false
		} else if !allowed {
			return t.ErrPermissionDenied, false
		}
	}
	var id int
	err = tx.QueryRow(ctx, `INSERT INTO messages(createdat,updatedat,seqid,topic,"from",head,content) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`, msg.CreatedAt, msg.UpdatedAt, msg.SeqId, msg.Topic, store.DecodeUid(t.ParseUid(msg.From)), msg.Head, common.ToJSON(msg.Content)).Scan(&id)
	if err != nil {
		return err, false
	}
	if digest != "" {
		_, err = tx.Exec(ctx, `INSERT INTO workspace_client_messages(topic,sender,client_id,seqid,digest,message_id) VALUES($1,$2,$3,$4,$5,$6)`, msg.Topic, msg.From, msg.Head["workspace_id"], msg.SeqId, digest, id)
		if err != nil {
			return err, false
		}
	}
	for _, fid := range files {
		if _, err = tx.Exec(ctx, `INSERT INTO filemsglinks(createdat,fileid,msgid) VALUES($1,$2,$3)`, msg.CreatedAt, store.DecodeUid(t.ParseUid(fid)), id); err != nil {
			return err, false
		}
	}
	result, err := tx.Exec(ctx, `UPDATE topics SET seqid=$1,touchedat=$2 WHERE name=$3 AND seqid<$1`, msg.SeqId, msg.CreatedAt, msg.Topic)
	if err != nil {
		return err, false
	}
	if result.RowsAffected() != 1 {
		return errors.New("message sequence advanced; reconnect before retrying"), false
	}
	marked := false
	if readBySender {
		result, err = tx.Exec(ctx, `UPDATE subscriptions SET recvseqid=GREATEST(recvseqid,$1),readseqid=GREATEST(readseqid,$1),updatedat=$2 WHERE topic=$3 AND userid=$4 AND deletedat IS NULL`, msg.SeqId, msg.CreatedAt, msg.Topic, from)
		if err != nil {
			return err, false
		}
		marked = result.RowsAffected() > 0
	}
	if err = tx.Commit(ctx); err != nil {
		return err, false
	}
	msg.SetUid(t.Uid(id))
	return nil, marked
}
