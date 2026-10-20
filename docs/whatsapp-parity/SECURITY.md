# Security boundary and outstanding work

This branch is an incomplete implementation candidate. **Chat messages and
attachments in the application are not end-to-end encrypted.** PostgreSQL can
read their contents. The OpenMLS module is an isolated protocol proof and is not
used by the messenger. A successful proof is not a device-trust or recovery audit.

## Implemented boundary

- MyAccounts OIDC state, nonce and PKCE bind sign-in to immutable issuer/subject.
  Browser engine tickets are short-lived and single-use. Neither OIDC tokens nor
  native bearer tokens are persisted in browser localStorage.
- The managed gateway uses a different hostname from Workspace. This isolates
  IndexedDB, localStorage and service workers, and keeps portal cookies off Chat.
  Public HTTPS cookies use the `__Host-` prefix, Secure, HttpOnly, Path `/`, no
  Domain, SameSite Lax. Loopback HTTP uses a host-only HttpOnly cookie. Standalone
  legacy configurations are not represented as an isolated encrypted deployment.
- Browser requests must use the configured hostname. Mutation/socket origins
  are checked. Private loopback integration additionally needs a per-run secret
  capability; merely being on localhost does not authorize it.
- The engine binds both WebSocket and long-poll sessions to the gateway identity.
  A different user's otherwise-valid engine ticket or long-poll session is denied.
  Browser-selected native credentials are removed from media proxy requests.
- File GET/HEAD checks completed-upload ownership, active avatar visibility or
  a readable, joined conversation link. Group removal and message deletion affect
  this decision. A caller must already be allowed to read an attachment before
  linking it into another message/avatar. Authorized forwarding creates another
  copy/reference; removing the original cannot revoke copies already obtained.
- Message, attachment links, topic sequence, sender receipt and UUID retry record
  commit in one PostgreSQL transaction. Reusing a UUID with different content or
  attachment metadata is rejected. Deleting a message retains its retry tombstone
  independently of the topic row. Retrying a retired/deleted UUID returns Gone
  before publication, avoiding both server resurrection and a stale successful
  acknowledgement inserting deleted content into a client's display cache.
- Workspace logout sends verified issuer/subject through a private backchannel,
  revokes that account's Chat sessions and cancels open gateway socket contexts.
  An open client stops at a reconnect prompt after a 401, without silently
  starting another provider login. Normal MyAccounts logout remains a separate
  provider operation in the browser's sign-out journey.

## Local data and offline behaviour

The SDK history/outbox database, settings and drafts are scoped by a SHA-256
digest of issuer plus subject. The old unscoped SDK cache is not imported: the
server's ordinary history can be fetched again after sign-in. Unsent legacy
browser-only state cannot be assumed recoverable across origins. Do not erase
an old browser profile or claim its unsent drafts migrated automatically.

The service worker caches an explicit build-addressed static shell. It does not
cache bootstrap responses, tickets, APIs or private attachment downloads. An
offline context contains public connection details, last verified native ID,
account digest and session expiry, not a credential. Offline UI identifies the
cached account; it does not claim a live server session or delivery. Logout
removes that context and clears the account's ordinary SDK cache/drafts.

**Current cached history/drafts are legacy plaintext browser data.** An encrypted
keystore, application lock, cross-device ciphertext search and encrypted outbox
remain required before encrypted-production acceptance. A shared PC/browser
profile is not a secure multi-user operating-system boundary.

The unshipped continuity increment adds a separate encrypted IndexedDB outbox
for recent one-to-one text/emoji/bundled stickers. It uses standard AES-GCM
with an origin-local non-exportable WebCrypto key. It does not encrypt the
ordinary SDK history/drafts, server database or legacy attachment path. Direct
WebRTC transport has authenticated signaling and DTLS, not the full application
E2EE/trusted-device/recovery architecture. Authorization leases last at most two
hours and online membership checks stop revoked links; an outage necessarily
delays remote revocation until lease expiry. See [continuity limits](CONTINUITY.md).
The new default public discovery adapter pins Trystero 0.26.0 and restricts
WebSocket access to three declared Nostr origins. Private, per-conversation
HMAC-derived room secrets encrypt SDP. A P-256 authority in protected Chat data
signs short-lived device permissions; mutual proof of possession binds a fresh
challenge to both connection IDs before receiving application messages.
Non-exportable browser signing keys persist separately from encrypted permission
records. Existing origin 401/403 responses invalidate cached public grants.
Public relay operators see IP/timing/discovery metadata; STUN exposes address
metadata, and peers can learn each other's IP addresses. There is no anonymity
or guaranteed-connectivity claim. Missing relay/network paths keep messages
queued. These new paths have compiled but have not had public outage acceptance.

An optional legacy independent rendezvous verifies origin/conversation-scoped Ed25519
permissions without holding the signing key. Cached permissions cannot renew
offline. Gateway restart recovery is keyed to a public process instance ID:
same-instance session revocation requires explicit reconnection, and logout
does not trigger automatic sign-in.
Sign-out stops transport and clears the offline bootstrap, but retains encrypted
pending copies scoped to that account to avoid destroying unsynced messages.

## OpenMLS proof

`workspace/crypto` pins OpenMLS 0.9.0 and its reviewed protocol implementations.
Windows native and browser WebAssembly clients exchanged real MLS messages in
both directions with authenticated AAD, tamper/replay rejection and an explicit
decrypt-only fence on restored snapshots. No cryptographic primitive is invented
in this adapter. Group IDs and routing AAD are visible metadata.

Missing application work includes signed trust roots/device rosters, approval
and revocation, key-package continuity, commit/admin policy, epoch reconciliation,
atomic encrypted keystore/outbox, encrypted attachments and metadata, downgrade
rejection, user recovery, encrypted search and call-key distribution. The proof
rejects membership commits instead of pretending their policy is implemented.
Restoring a proof snapshot never authorizes new sends or key packages. There is
no production API to bypass that fence. The diagnostic `protocol-proof` binary
is a test helper; it is not bundled into Chat.exe.

## Deployment and recovery limits

Private data stays under the protected NTFS `chat` child, outside shared Drive.
The app's additive migration does not reassign users or rewrite legacy history.
A consistent stopped-state/server backup remains distinct from recovery of
future client encryption keys. Current DPAPI installation secrets are machine
bound; portable encrypted export, fresh-Windows restore and cryptographic
recovery acceptance are incomplete. Do not claim folder copying restores them
on another PC.

Default E2EE, secure group/guest calls, native Android/iOS identity/keystores,
provider push and physical-device/network acceptance remain release gates for
the full brief. Viewport screenshots and a functioning tunnel do not satisfy
those gates or establish WhatsApp pixel/interaction parity.
