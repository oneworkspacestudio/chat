//go:build postgres

package postgres

import (
	"github.com/tinode/chat/server/store"
	t "github.com/tinode/chat/server/store/types"
)

const managedFileReadableSQL = `SELECT EXISTS(SELECT 1 FROM fileuploads f WHERE f.id=$1 AND f.status=$3 AND (
 f.userid=$2 OR EXISTS(SELECT 1 FROM filemsglinks l
 LEFT JOIN messages m ON m.id=l.msgid AND m.delid=0
 LEFT JOIN subscriptions s ON s.topic IN (COALESCE(m.topic,l.topic),'chn'||substring(COALESCE(m.topic,l.topic) from 4)) AND s.userid=$2 AND s.deletedat IS NULL
 WHERE l.fileid=f.id AND (
 (l.userid IS NOT NULL AND EXISTS(SELECT 1 FROM users u WHERE u.id=l.userid AND u.state=0)) OR
 (position('R' in s.modewant)>0 AND position('R' in s.modegiven)>0
 AND ((position('J' in s.modewant)>0 AND position('J' in s.modegiven)>0) OR s.topic LIKE 'chn%')
 AND (l.msgid IS NULL OR (m.id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dellog d WHERE d.topic=m.topic AND d.deletedfor=$2 AND m.seqid>=d.low AND (m.seqid<d.hi OR d.hi=0 AND m.seqid=d.low)))))
 ))))`

func (a *adapter) FileCanRead(uid t.Uid, fid string) (bool, error) {
	ctx, cancel := a.getContext()
	if cancel != nil {
		defer cancel()
	}
	var allowed bool
	err := a.db.QueryRow(ctx, managedFileReadableSQL, store.DecodeUid(t.ParseUid(fid)), store.DecodeUid(uid), t.UploadCompleted).Scan(&allowed)
	return allowed, err
}
