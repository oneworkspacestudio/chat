# Chat continuity plan

## Public discovery in preview10

The default browser path uses pinned Trystero 0.26.0 over public Nostr relays,
with no additional service or GitHub credentials for the administrator to set
up. The earlier private rendezvous described below remains an optional legacy
adapter; its deployment is no longer required for outage reconnection.

The authenticated Chat origin issues a P-256 signed, two-hour maximum permission
bound to account, other participant, conversation incarnation, origin, private
room and browser public key. The server generates and persists its authority
automatically in protected app data (`continuity-authority.pk8`). Never put that
file in Drive, source, logs or release artifacts. Preserve it in private backups.
A missing file is initialized; a corrupt/unreadable existing file fails closed.

Each browser creates a non-exportable P-256 signing key in its account's
IndexedDB key store. The permission and high-entropy room/password are encrypted
with the existing outbox key. Room and password use separately labelled HMAC
derivations bound to both people and the conversation incarnation. They are not
email addresses or predictable room names. A fresh WebRTC connection must pass
mutual server-certificate verification and a signed random challenge bound to
both transient connection IDs before application actions are enabled. A room
secret by itself does not prove that someone is the other person.

Only encrypted SDP and pseudonymous discovery metadata traverse the three
allowlisted public endpoints: `wss://nos.lol`, `wss://relay.damus.io`, and
`wss://relay.primal.net`. CSP permits those exact origins. A relay can observe
source IPs, timing and rendezvous activity, and can censor or rate-limit traffic.
It does not receive account names, device certificates, login cookies or message
payloads through this adapter. Do not promise availability or anonymity.

Default STUN is `stun:stun.cloudflare.com:3478`; protected
`continuity-ice.json` replaces the defaults when an administrator needs different
STUN or authenticated TURN. No TURN subscription or paid service is created.
Trystero's unrelated default ICE/relay lists are explicitly overridden.
Both people must have connectivity and valid previously issued permissions.
No route, expired permission or unavailable peer means queued, not delivered.

Recent conversations prepare automatically. Public reconnection can use cached
permissions after a same-URL reload while Workspace is unavailable. An origin
401/403 never triggers fallback to cached authorization. Online checks renew
permissions; an outage cannot renew them or immediately propagate remote
revocations. Existing durable acknowledgements and exact-ID recovery remain
the message storage contract. Up to four remote device links per conversation,
16 KiB packets, 64 KiB receive/send budgets and bounded handshake timeouts apply.
Logout and opt-out leave public rooms and close connections.

Real Chrome checks now cover public relay discovery with the entire synthetic
Workspace stopped, both browser profiles reloading the same URLs, new direct
messages, and exact-ID recovery. A separate Chrome network-disabled check
confirms cached history, durable queued sends across reloads and synchronization
after network restoration. No local relay or mocked WebRTC success was used.
Separate-network and physical mobile checks remain open. Earlier acceptance
below applies to older private-relay builds. Mobile suspension, first visit
without cached assets, cleared storage, invalid TLS, offline new-user sign-in,
groups/files/calls and full application E2EE remain outside this increment.

Desktop navigation now uses the shared AUI Button adapter, outline icons,
accessible active-page state, Workspace colour tokens and an explicit primary/
secondary grouping. Width, inherited margins/minimum width, hover foreground,
flex shrink and fixed height no longer clip the labels or bleach the icons.

## User experience

The installed web shell, cached conversations and drafts remain available during
an outage. A persistent local outbox accepts text, emoji and bundled stickers.
Connections prepare automatically for recent existing one-to-one conversations
while authenticated and connected, with a per-conversation opt-out. The server checks both
members' current read/write permissions before exchanging WebRTC descriptions.
An established DTLS data channel then carries messages without the Chat server.
The UI distinguishes queued, directly delivered and server-saved messages.

Direct delivery is acknowledged only after the receiving device durably stores
the message. The sender keeps its copy until the normal server publish receives
an acknowledgement. The recipient merges that canonical copy by author, UUID
and exact content, never by text alone. A recipient cannot publish as a sender.
If the sender remains offline, its received direct copy remains visible locally.
Recovery resolves exact UUID receipts under the recipient's current membership
and fetches their exact sequence numbers. It does not assume that the newest
cached sequence proves all earlier direct messages have already been fetched.

## Boundaries

- This first implementation supports one-to-one text/emoji and the bundled
  sticker pack. Files, edits, replies, groups and calls retain the server path.
- Direct fallback is automatic for recent conversations: WebRTC may expose the device's network address to
  the selected person. It does not request microphone or camera access.
- No new connection is promised after a reload or network change while all
  signaling is down. A fresh installation needs the server at least once.
- Cached UI access keeps the existing last-account session-expiry check. This
  increment does not introduce an independent offline sign-in or device unlock.
  Expiry can require MyAccounts again; encrypted queued copies remain stored.
- Public discovery uses the services listed above. Administrator-configured
  TURN may still be needed; an HTTPS Cloudflare tunnel does not replace it.
- Authorization leases last at most two hours and never outlive login. Online
  polling rechecks membership; an outage delays remote revocation until the
  lease expires. Logout, local disable and expiration close the connection.
- WebRTC encrypts the live connection. Reconciled messages use the existing
  server-stored Chat format; this is not a claim of complete end-to-end encryption.
- Local continuity records use standard AES-GCM and an origin-local,
  non-exportable WebCrypto key in IndexedDB. This protects stored payloads, not
  against malicious same-origin scripts or browser-profile access. It does not
  replace OS disk encryption or a native hardware-backed keystore.
- Sign-out closes the channels and clears the offline account bootstrap. The
  encrypted outbox stays scoped to that account for its next sign-in; signing
  out must not silently destroy a message that has not reached the server.
  Clearing browser/site data still removes these device-local copies.

## Implementation and acceptance

1. Bounded authenticated signaling mailbox, current mutual permissions,
   conversation incarnation and device/session binding.
2. Shared transport, encrypted transactional storage, durable UUIDs and receipts;
   ordered data channels with size/backpressure checks and bounded queues.
3. Conversation status/history and emoji/sticker AUI components in the current
   design system. Normal composer routes eligible offline messages to the outbox.
4. Real two-browser tests: connect, stop the entire synthetic Chat process,
   exchange in both directions, reload cached UI, restart, reconcile exactly
   once; reject third-party signaling, blocked membership and invalid packets.
5. Android/iOS wrapper contract uses the same modules. Native lifecycle events
   reconnect and flush; WebCrypto/IndexedDB remain the web storage adapter.
   Native push/background delivery and secure-keystore adapters are follow-on
   work requiring platform projects, signing and physical-device acceptance.

## Wrapper contract

Wrappers must bundle this shell locally rather than depend on a remote URL to
boot. Expose lifecycle online/resume/pause to the shared controller and close
channels on logout/account change. Use platform secure storage for refresh
credentials, never query strings. OIDC uses the system browser with PKCE and
verified return links. No unrestricted navigation or JavaScript bridge for
external content. Native push wakes/reconnects; it must not contain plaintext
message bodies. iOS and Android may suspend foreground JavaScript and WebRTC;
continuous background peer delivery is not guaranteed by a web wrapper.

`ChatContinuity` accepts injected storage, signaling fetch, peer connection,
publish and exact-history adapters. `native-continuity.mjs` attaches and removes
Capacitor-compatible App/Network lifecycle listeners. A native shell must also
provide a validated remote API endpoint and an authenticated HTTP/OIDC adapter;
copying this web directory into a wrapper alone does not implement native login.

References: [WebRTC peer connections](https://webrtc.org/getting-started/peer-connections),
[data channels](https://webrtc.org/getting-started/data-channels),
[Capacitor lifecycle](https://capacitorjs.com/docs/apis/app).

## Configuring Internet connectivity

The administrator can place `continuity-ice.json` in Chat's protected data folder
with standard `RTCIceServer` entries. Example (replace every placeholder):

```json
[
  {"urls": ["stun:your-stun.example:3478"]},
  {"urls": ["turns:your-relay.example:5349"], "username": "issued-user", "credential": "issued-secret"}
]
```

The server returns this only to authenticated, authorized participants. Use a
relay with restricted credentials, quotas and TLS. This file is not a public
web asset and must not be committed or included in release archives. There is
no bundled TURN service, no implicit paid service and no claim of Internet-wide
connectivity from the Cloudflare HTTPS tunnel alone.

For optional public address discovery, Cloudflare documents
`stun:stun.cloudflare.com:3478` as a public STUN endpoint and currently lists STUN
as free. This can be placed in the `urls` array without TURN credentials. It
does not relay messages or provide independent signaling, and sends connection
metadata to that service. It is enabled for the new public-discovery path. See
[Cloudflare's FAQ](https://developers.cloudflare.com/realtime/turn/faq/).

## Earlier private-rendezvous extension (historical implementation)

Recent one-to-one conversations now prepare their connections automatically,
up to six recent conversations per browser. A person's explicit opt-out remains
respected. Normal messaging needs no transport selection or handshake screen.
Direct network addresses may be visible to the other participant. The permission
check still requires current membership on both sides.

The same previously visited `/chat/` URL can reload its cached shell and account
on a network error, HTTP 5xx, or an unresponsive origin. Navigation/static fetches
fall back after 1.5 seconds and bootstrap after 2.5 seconds. This depends on the
browser retaining the service worker, caches and unexpired account context.
A first visit, cleared browser storage, expired account, or invalid TLS cannot
be made into an authenticated offline app by WebRTC. Future native apps must
bundle this shell to cover a first launch without a web download.

An optional **independent rendezvous** now permits new WebRTC handshakes after
reload or network changes while Workspace is stopped. Chat issues an Ed25519
signed permission scoped to the person, other participant, conversation
incarnation, Chat origin, rendezvous endpoint and a maximum two-hour expiry.
The encrypted local store keeps it alongside the outbox. Successful online
checks renew it; neither the browser nor rendezvous can extend it offline.
Authoritative origin 401/403 responses invalidate the cached permission.
Remote revocations during a total origin outage take effect by expiry at latest.

`cmd/chat-rendezvous` builds a separate small service for another machine or
independent host. It handles authenticated offer/answer mailboxes, not messages,
passwords, login or permanent history. Mailboxes are bounded, expire after two
minutes of inactivity and recover automatically after rendezvous restart.
It permits only the configured Chat origin, and the Chat CSP adds only that
configured signaling origin. Relay requests omit the Chat session cookie.

The browser polls the origin to recheck permissions and prefers the independent
rendezvous for signaling when configured. During an outage it automatically
reuses the cached permission; after a reload it creates a fresh device ID.
Actual data still travels over WebRTC. A reachable TURN service is additionally
needed for networks where a direct ICE connection cannot be established.
The rendezvous is not TURN, and hosting it on the Workspace PC cannot survive
that PC being turned off.

After a gateway restart, Chat automatically resumes its normal MyAccounts
sign-in flow and restores the conversation only for the same account. A
per-tab retry guard prevents redirect loops. When MyAccounts still has a valid
session this requires no user input; expired/revoked MyAccounts access still
requires authentication. Explicit logout never starts automatic recovery.
Pending outgoing messages are synced with their original IDs after authenticated
recovery. A delivery receipt is still distinct from a server save.

### Administrator deployment

Build `./cmd/chat-rendezvous` for the independent host. Create a random 32-byte
Ed25519 seed once in protected storage and derive its public key. Put
`continuity-relay.json` in Chat's protected data directory:

```json
{
  "endpoint": "https://signal.your-domain.example/rendezvous",
  "signingSeed": "<base64url Ed25519 seed; keep private>"
}
```

Start the independent executable behind HTTPS with `--endpoint` matching the
exact configured URL, `--origin` matching Chat's origin (without `/chat`) and
`--public-key` containing the base64url public key. The private seed stays on
the Chat server. Only loopback test URLs may use HTTP. For safe public operation,
apply connection/request quotas at the HTTPS ingress. The optional
`continuity-ice.json` remains the STUN/TURN configuration described above.
If a previously cached shell predates this configuration, visit Chat online
once so its stored CSP permits the new signaling origin.

No independent public rendezvous or TURN has been provisioned for the owner
installation by this development change. It is not activated by installing
only Chat.exe, and does not provide unlimited outage duration, offline new-user
sign-in, background mobile delivery, or offline group/file/call parity.

### Verification of automatic recovery

The updated Windows development executable passed all 11 real-browser outage
checks with a separate native rendezvous process. Both Chrome profiles reloaded
their original URLs while the entire synthetic Workspace was stopped, formed
new WebRTC connections and exchanged another message. After restart, MyAccounts
session recovery and exact-ID history sync completed without a credential form.
The sender and recipient both displayed each canonical message exactly once.

The standard browser, permission/security and UI regression suites also passed,
including deliberate Workspace logout revoking Chat without automatic sign-in,
and the ordinary offline draft path after a direct-mode opt-out. Eighteen
controller cases, seven signaling/recovery cases and native gateway/rendezvous
tests passed. This is same-PC Chromium testing, not an Internet TURN, physical
mobile or independently deployed public-host acceptance.

[Exact build and source evidence](evidence/automatic-continuity-development.json).
The prior build below is historical; its hashes do not describe this extension.

## Previous verified local development build

The final Windows development executable passed11 real browser checks with
Chrome's default network policy: mutual authentication, peer delivery after the
whole synthetic Workspace stopped, text/emoji/stickers and formatted-text sync,
offline reload/queue, HTTP503 recovery, exactly-once reconciliation, saved opt-in
renewal, foreign-session/non-member rejection and real membership revocation.
Eighteen controller/lifecycle checks and all six existing browser/security/UI/
mobile/navigation/lost-ACK regression suites passed on those same executable
bytes. Go server/workspace/store checks also passed. The fixture used four
synthetic accounts. No physical-phone or Internet TURN acceptance is claimed.

[Exact build, scope and source hashes](evidence/continuity-development.json).
This is an unpublished development build; preview9 downloads do not include it.
