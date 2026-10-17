# Hosting Chat

## Managed installation

Choose Chat in One Workspace Advanced installation. The manager sets its own data
folder, loopback port, public URL and dedicated OIDC client. Open the tile at
https://your-workspace.example/chat. The existing Workspace tunnel carries HTTPS
and WebSockets; no new public DNS record or public database port is needed.

## Standalone with MyAccounts

Register a confidential OIDC client in MyAccounts. Configure the exact redirect
URI https://chat.example/chat/auth/callback with openid/profile/email scopes and
PKCE S256. Supply these environment variables to the process securely:

- WORKSPACE_OIDC_ISSUER: your MyAccounts issuer URL.
- WORKSPACE_OIDC_CLIENT_ID: the Chat client ID.
- WORKSPACE_OIDC_CLIENT_SECRET: its client secret.

Run `Chat.exe --data C:\Chat\Private --listen 127.0.0.1:9006 --origin https://chat.example/chat`.
Your trusted HTTPS proxy must preserve WebSocket upgrades, route /chat to this
listener and keep HTTP Origin intact. Remote HTTP is rejected; loopback HTTP is
allowed for local installation. Use an NTFS folder, not exFAT or a network share.
Do not put secrets in a URL, source, release archive or command-line argument.

Chat uses signed one-minute, single-use tickets after OIDC verification. The
Tinode engine is loopback-only, with anonymous/basic registration disabled. Tinode transport tokens are short-lived
and the managed browser never persists them. The gateway requires its own HttpOnly
session cookie for messages and attachments, checks browser origins and closes
connections on app logout or session expiry. Identity is issuer plus subject.
Verified email is used only for discovery; it is never trusted as an account key.

## Files and recovery

- database/: private PostgreSQL cluster; messages and identity links.
- attachments/: ordinary uploaded files managed by Tinode.
- secrets.dpapi: installation keys and database password, protected by Windows.
- engine.json: generated credentials inside the protected folder; do not share.
- runtime/: bundled software cache; regenerate only while the app is stopped.
- runtime.log: private engine/database startup diagnostics.

Stop Chat (or stop Workspace) before taking a full folder snapshot. Preserve both
database and secrets. Backups bound to this Windows machine need a planned
export/restore for another machine. No automatic restore or portable migration
acceptance is claimed in this initial preview.

## MyAccounts member directory

Workspace35+ sends a complete member snapshot to Chat every15 seconds over the
loopback connection. A separate per-run bearer credential authenticates this
private endpoint; a per-installation HMAC protects the internal engine request.
No administrator password, directory credential or provider token goes to the
browser. Signed OIDC issuer+subject links preserve existing native Chat IDs.
New members are discoverable before first Chat login. Forbidden/deleted entries
are excluded and their current gateway sessions are cancelled. Only verified
email is indexed; names and usernames remain searchable without verified email.

The directory supports up to10,000 members per installation and returns at most
50 matching people. Standalone Chat without the Workspace directory integration
retains native email/tag lookup for users who have signed in, and native Chat ID
lookup. Directory synchronization failure retains the last complete directory
and retries; first startup displays retry guidance until synchronization succeeds.

Open By ID to copy your native usr... ID, use its QR code, or paste a usr..., grp...
or chn... ID or tinode:///id/ link. MyAccounts account IDs can be searched in Find.
