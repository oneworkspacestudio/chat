# Chat parity implementation — active, not released

The user supplied the full October19 WhatsApp parity brief and authorized existing
Chat upgrade, Workspace integration, pushes/releases. All consumer families remain
mandatory; no full-parity/production/E2EE claim from a shell or protocol proof.
No Actions, no subagents authorized. Owner live data must never be fixtures. Large
source/build/downloads on I; scoped NTFS C scratch only when necessary, clean later.
Native signing/Mac/device prerequisite question remains unanswered. Continue all
independent work; that question does not excuse missing browser/backend features.

## Baselines and state

Chat I:/Projects/workspace-chat: baseline c5c48b02/master, public preview4 source
32d9bf3. Branch codex/whatsapp-parity. Workspace I:/Projects/one-workspace:
baseline0db607a/main/public42 (source5ebc588); branch codex/chat-parity. Both fetched
and 0/0 with their remote defaults on October20. All current changes uncommitted;
no new push/tag/release or owner update yet. Preserve four unrelated untracked
Workspace installed-history files. The owner is42/20 apps; do not stop/test it.

Skills repository-history, write-aui-ui, browser-screenshot read/applied. AUI files
own UI trees; regenerate and preserve generated JSX, never edit generated output.
No universal shared token package was assumed. docs/whatsapp-parity tracks48 screens,
62 families/186 platform rows/18 flows. Every family still marked incomplete with
specific tested subsets and gaps. Exact authenticated WhatsApp references/builds
are unavailable; no pixel parity claim. SECURITY.md and IMPLEMENTATION-STATUS.md
now describe actual plaintext boundaries and missing application security.

## Implemented foundation (latest dev bytes still need final re-run)

- Desktop/mobile rail, actual icon glyphs, dense list, dvh/safe areas/720 breakpoint,
  incoming/outgoing consumed tokens, theme/storage synchronization, focus/reduced
  motion. Latest source also neutralises old topic-header colour/default striped
  wallpaper, preserves explicit wallpaper choices, enforces inherited brand font
  and replaces empty-state implementation diagnostics with generated product UI.
- Account-scoped SDK IndexedDB adapter loads only after validated issuer/subject
  digest. It patches exactly one pinned SDK database literal and one message-store
  insert to put/upsert; build fails if expected adapter sites change. Auth tokens
  remain memory-only. The upsert fixes uncaught duplicate-key errors on ack/echo.
- Per-topic draft text + durable UUID, IME guard, keep until actual202+seq ack,
  quota/error state, reply/edit/forward promise handling. Sender wire IDs are not
  persisted by Tinode: regenerate a fresh request ID for restored outbox retries,
  retaining workspace_id. Missing wire ID previously sent the message but left
  a pending duplicate/draft; real offline test found and now passes this repair.
- One outbox replay coordinator after real login, no competing subscribe retry
  loops or automatic deletion of failed drafts; manual retry reuses cached draft
  and gets a new wire ID. Ack event clears matching current draft only.
- PWA worker caches only a build-addressed static allowlist/shell. No APIs,
  credentials, tickets or attachments. Offline context explicitly selects public
  fields + account/nativeID/expiry, never serialises bootstrap tickets. Logout
  removes it; cross-tab account changes reload the separate cache. Offline UI
  calls the account cached and deliveries pending, not authenticated/delivered.
- Real All/Unread/Favourites/Groups/search/custom-list UI and private preferences
  files: bounds, unknown-field/null rejection, ETag CAS, atomic write, per-account
  ownership and five-second sync. Actual list create/select/membership/rename/
  reorder/delete verified across independent sessions.
- Message+receipt+topic sequence+sender read/recv+attachment links now atomic in
  PostgreSQL. UUID digest includes attachments. Duplicate returns original seq,
  changed payload rejects, deleted retry does not republish. Existing IDs/schema
  retained; app migration additive. No retroactive encryption.
- Engine WS/LP bound to verified gateway UID; different valid ticket/native SID
  denied. Proxy strips native browser credentials and uses fresh internal ticket.
- File GET/HEAD: owner or active readable/joined message/group/avatar link;
  per-user/hard deletion respected, channel reader semantics explicit. File ID
  decode fixed. Linking a file also checks current sender/owner permission,
  preventing an outsider granting themselves access by publishing a known URL.
  Rejected link leaves no message/sequence. Active documents sandboxed.

## Workspace integration and compatibility

Workspace has dedicated Chat origin files, automatic first-level CF hostname
allocation/owned-ingress repair with cross-app tunnel lock and preserved unrelated
DNS. Existing OIDC client+secret retained, callback updated exactly; legacy/chat
links redirect preserving fragment, pre-migration OAuth codes restart normal PKCE.
Local origin uses the other loopback hostname, separate cookie host from portal.
Public cookies __Host-/Secure/HttpOnly/no Domain; host and mutation/socket origins
checked. Managed public CF operation remains unverified, owner not used as fixture.

Private catalog adapter receives verified issuer/subject plus per-run capability,
returns absolute links and bundled same-origin actual icons; monitor owner-only.
AUI Workspace app switcher, no injected cross-origin script/cookie/CORS exception.
Global portal logout now private subject backchannel instead of forwarding Chat
cookie from wrong origin. Gateway revokes account sessions/cancels socket contexts.
Client heartbeat detects401 even if WS rejects before onConnect; shows manual
Reconnect without immediately reauthenticating. Other identity stays signed in.

Distribution requirements: app manifest schema2/integration3, minimumManager and
requiredCapabilities validated at decode and SelectUpdates (earlier handoff's
ApplyUpdatePlan name was incorrect); CLI flags/tests. Recognized caps currently
app-update-requirements-v1/chat-state-v2; isolated-chat-origin-v1 not advertised
until final integration checks. MUST gate every delivery path: old42 can still
pick a Chat package from a new full-suite catalog even if it rejects standalone
schema2 manifest. New managedAdmission runs before directories/secrets/runtime/DB,
requires manager-supplied isolated-chat-origin-v1 plus home/catalog endpoints.
New manager injects it outside app Env. Old full-bundle app-only attempts must
fail before migration and restore Chat4 via normal rollback. Actual old published
manager offered released candidate remains a required test, not done yet.

## Crypto — proof only, not application E2EE

workspace/crypto pins OpenMLS0.9.0 + basic/traits/rust_crypto0.6, tls_codec0.5,
Cargo.lock/wasm-bindgen0.2.129. Windows Rust1.99.1 toolchain on I, actual binaries
work despite exFAT rustup proxy error; CARGO_HOME named C scratch needed for crate
mtimes, CARGO_TARGET_DIR on I. ProofClient supports key package, approved-key check,
welcome, app AAD, encrypt/decrypt/replay and private snapshot. Restored snapshots
are now enforced decrypt-only: sends, group creation/add and key packages reject.
Membership commits fail closed pending actual roster/admin policy. No production
crypto/keys/WASM bundled into Chat.exe. No signed trust roots/roster, device approval,
encrypted payload/media/metadata/outbox/search, downgrade gate, key recovery, SFU/
E2EE media or native clients implemented. Do not hide this behind signing access.

Actual native Windows protocol-proof process and actual Chromium WASM exchanged
messages both directions; authenticated AAD, replay/tamper and recovered-sender
fence passed. Reproducible source harness scripts/workspace/crypto-interop.cjs
expects locally built native/bin and web bindings under CHAT_CRYPTO_PROOF_ROOT.
No private state goes to repo/artifacts. Native helper is diagnostic, not packaged.

## Isolated fixture and evidence

Tooling root I:/Projects/tooling/chat-parity-20261019. Named C root
C:/Projects/.cache/chat-parity-20261019 holds client/Cargo/test fixture only.
Fixture/Private is ACL protected; test-users.json outside repo contains synthetic
credentials, NEVER output it. Programs/Files on I tooling fixture. Public baseline42
installer SHA ba38a358509ce717a7e1025bbe90f5a04ba6e48bffb3f96c9629d9f51c52b457
installed accounts+chat only, intentional other opt-outs. Baseline browser tests
all passed; stopped-state baseline42-cold/Private preserved under protected C.
Do not reset/seed users again. Current prototype uses manual binary/catalog hash
replacement, explicitly NOT an official updater acceptance. URL localhost:30960,
issuer localhost:30961, Chat127.0.0.1:30976/chat. All use synthetic Alice/Bob/Charlie.

Helpers install-fixture.ps1 and seed-users.ps1 already ran; do not repeat. Current
prototype deploy helper stops exact fixture, checks no child refs, copies local
manager+Chat and starts hidden. It polls127.0.0.1 health (localhost query timed out
in one helper despite later healthy state); 90sec deadline, keep user updates.
fixture-process.json tracks current PID; owner untouched. Normal stop CLI:
fixture/Private/Workspace.exe --data <fixture/Private> stop. Preserve baseline for
actual released upgrade tests. At end stop/verify and clean all named C scratch
without following reparses or touching owner/newest rollback/unrelated folders.
C free space ~20GB October20, I ~3.6TB. No unknown C cleanup performed.

Passed evidence logs on I: baseline-browser.log; candidate-origin-browser.log;
candidate-parity2.log and candidate-parity-restart.log (all actual file/role/
identity/retry/restart cases); candidate-ui8.log (all real custom-list sync,
create group/add Bob/real group messages, draft+IME, five viewport/two-theme
computed bubble/no-overflow, static-only worker, offline reload/replay once/ack,
Alice logout while Bob remains, zero uncaught errors). Screenshots under protected
fixture are synthetic, clean group display review. Review before copying evidence.
Earlier UI runs intentionally failed while bugs were repaired; do not publish
failure screenshots or claim unrun acceptance.

Go managed tests workspace/store/postgres/server passed (chat-preflight-tests.log).
Workspace distribution tests passed. Suite full tests passed in manager-suite-
tests-final.log: build go test -c on I, run binary with GOTMPDIR named C/go-tests.
Go1.27 t.TempDir uses GOTMPDIR, so simply changing TEMP while GOTMPDIR=I causes
expected ACL/exFAT failures. Quote '-test.timeout=180s' in PowerShell; unquoted
flag is parsed incorrectly. No test skips needed for new origin; old seamless
case explicitly asserts Chat is not probed with portal cookies.

## Exact resume point

Latest source added branding/empty AUI, release source-clean/matching-client
build flag/receipt, and managed admission before storage. Client build12 and
chat-build8 succeeded. Latest dev executable SHA
2ad2f9451ea9feebc9919176aa926d5a43cb729432a48212825295639525a6e2,
sourceDirty=true; NOT release bytes. New manager rebuilt with runtime capability.
Deployment helper running via exec session (see latest tools) copies both; wait
for health then re-run baseline + parity with CHAT_TEST_RESTART=1 + UI acceptance.
Latest brand/admission changes need this final pass and reviewed captures.

Next finish source/evidence/docs/history, actual compatible-release updater gates
and packaging; do not label foundation as brief completion. Chat5/Workspace43 are
planned tags only. Update README actual candidate scope. Copy only sanitized
JSON/PNG assertions to evidence; update flow records honestly. Keep untouched
public4/42 assets. When publishing, pin released Chat ZIP hash in org lock, use
build-org.ps1/build.ps1 and update-manifest tooling, create fresh immutable truthful
candidate tags without Actions, actual old manager manifest rejection and bundle
rollback before migration, fresh install/upgrade/selected-app/history/rollback.
Then continue all mandatory rich/social/default E2EE/calls/native/recovery work.

## October20 verified correction and publication checkpoint

The earlier resume paragraph is superseded: client build14/native build10 and
managed-accounts-baseline/security/UI runs all passed against actual packaged
synthetic services, including managed-name/account controls and zero uncaught
browser errors. Development Chat SHA f366d24d4c2378f0873ec4868b3df24fbd50dfd6080235890456237cf3ceb2ed
is sourceDirty=true and is not the release executable. Workspace full suite and
distribution/manifest tests passed again after exact callback/capability changes.

Deleted receipts now retain a tombstone without topic FK cascade. Receipt lookup
checks message identity and per-user/hard deletion. Retrying after message or
conversation deletion returns410 Gone, never a successful ack that reinserts a
deleted SDK message. Actual private-conversation deletion/reopen and native
restart checks passed. This corrects any earlier original-sequence wording for
deleted messages. Live unchanged retries still return original sequence202.

The manager now advertises isolated-chat-origin-v1 after real local native
SSO/catalog/logout checks. This is an origin contract, not encryption/call/native
mobile acceptance. A real incompatible managed Chat launch exits before its data
directory exists. Actual old42 offered-release and rollback acceptance remains
required. No new push/tag/release has occurred at this checkpoint.
