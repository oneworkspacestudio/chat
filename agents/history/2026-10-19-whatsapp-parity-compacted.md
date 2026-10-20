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

## Published Chat5 foundation increment (not task completion)

Source21fe7325a68245372a1ef9cb22856d6ac5ec1ea8 is pushed to master and tagged
v0.1.0-preview.5. Release https://github.com/oneworkspacestudio/chat/releases/tag/v0.1.0-preview.5
published with15 verified assets, source archive, checksums and explicit missing
application E2EE/full-parity/native/call/recovery scope. Clean executable SHA
115d4f276129c5b58b843401bdca853072c4a84c8f2499718e7105228b8a7ea8,
ZIP db72538e9e722da41a2d46a74b227b4ed2451e3605312e0f8cd402148d87a933.
Exact final native/baseline/UI harness runs passed; UI now7 sizes×2 themes,
including360×800/1366×768. Representative captures reviewed; actual CDP platform
font inspection confirmed Arial, not only inherited computed-family text.

Real public42 was restored to isolated fixture (prototype data moved cold to
named protected sibling). Actual42 installer applied a compatibility-test bundle
with exact newChat bytes and Chat-only selection. Admission failed before new
runtime extraction; automatic rollback completed and restored exact Chat4 SHA,
IDs/history, ordinary document bytes and actual UI download/filename. Then old42
checked actual public releases and rejected Chat5 independent schema2 manifest
(unknown minimumManager). These do not replace final public43 bundle acceptance.
The build-org path downloaded publicChat5ZIP and verified the pinned digest.

Workspace source3c5e951 adds full origin/callback/catalog/logout contract and
pin5. Build-org43 is running from that commit; no public43 yet. New legacy-route
filter removes old media auth/token/secret/sid/apikey query entries before new
origin redirect; suite tests passed. Next finish build-org, actual released43
install/paired upgrade and public bundle rollback, then normal owner update.
Owner has not been touched. Continue mandatory independent encryption/device/
rich/social/call/native/recovery work after this increment; do not stop as done.

CLI lessons: installed gh is old (no release edit/list --json). Draft by-tag API
returned404; inspect via authenticated release list/ID. Typed -F draft=false gave
unexpected end JSON; explicit UTF8 --input JSON PATCH succeeded. Release IDs/tags
were verified before publication. Invoke-WebRequest octet-stream Content may be
byte[]: UTF8-decode before ConvertFrom-Json, otherwise numeric bytes become a huge
array. Git archive --output must be one quoted PowerShell argument. No published
assets were rewritten. Preserve unrelated Workspace untracked histories.

## Public43 verification and continuing defects (October20)

Workspace43 is now public from3c5e951,27 verified assets. Actual public installer
SHA3b0099182371b59fd3d9afe30786b11807bd5d5b4a1a41b316e55e2b844204ce
and bundle1be166d1a024d53c05c71762aadb4b37dc7c15ca7fd56b4e5b3ac496e7d4543c
were downloaded. Real public42→43 upgrade preserved selected apps, immutable IDs,
retained history and actual UI document download filename/exact bytes. A default
online fresh43 install selected Accounts+Chat and retained18 opt-outs. Baseline,
security and seven-viewport/two-theme UI passed AFTER directory-ready assertion.
Initial immediate Charlie Find timed out: snapshot synchronization is asynchronous
and the old open query never refreshed. Do not erase that failed precondition.
See evidence/release-5-public-integration.json; published assets are immutable.

Uncommitted Chat6 candidate adds visible/online query refresh every5s only in the
managed Find picker. Actual new synthetic member creation while query stays open
passed without retyping/retry, and the never-signed-in member could be selected.
Development build SHA57f2ae8527f07bf3a1481c464a76ae461297799767482c1f35ddf72fba26d596
is dirty and NOT a release. Fresh fixture now manual prototype Chat6 on31060,
primary30960 remains public43/5 until provider migration. Main owner42 untouched.
Chat6 real baseline/security passed; correct ui-acceptance.cjs passed (an initial
command used nonexistent parity-ui-acceptance.cjs; this was harness invocation).

Native OIDC prerequisite against published MyAccounts found changed token-request
redirect_uri was accepted despite PKCE. Source fix in separate org checkout
I:/Projects/myaccounts-chat-native binds original URI privately; whole-object
focused unit passed. Frontend frozen Yarn build/typecheck passed after changing
only locked download transport URLs from registry.yarnpkg.com to official npm
(same versions/integrities), using named C NTFS work and I download cache. Root
compile caught one internal CasWAF call; now passes the constructed exact callback.
Root regression/vet/native build and real migration/negative harness are running.
No provider release yet. Do not mistake this prerequisite for complete native apps.

Scoped redundant prototype-cold/baseline42-cold synthetic snapshots were removed
after absolute path, reparse and active-process checks; reclaimed~1.94GB on C.
Current fixtures/newest rollback and owner data retained. Source/output remainI.
Workspace route priority/owned Host repair unit/full suite passed but actual
Cloudflare route operation remains unverified. Full mandatory scope remains open.

## Group receipt candidate (not yet released)

New server-authored workspace_audience captures sorted active readable original
members, excludes sender/deleted/channel-only users, strips forged input and is
excluded ONLY as server metadata from the client retry digest. The full server/
store/PostgreSQL compile/tests passed; pure JS quorum tests passed. Client bubble
and contact previews require every original member. Read implies delivery even
if partial SDK updates omit recv. Unknown/legacy/removed counters stay Sent.
Post-ACK exact stored-data fetch obtains trusted audience for no-echo drafts.
Wire getMeta MUST include what:'data'; raw data-only silently failed in initial
prototype. Tests initially selected .chat-box under #scroller, but #scroller itself
is .chat-box; corrected to li. To model offline, close Charlie's entire synthetic
context, not merely one SDK subscription (the UI has another socket).

Real three-account group-receipts run7 passed all original-offline/delivered/read,
removed-unread+reload, forged-header and membership-change retry/one-copy checks.
Baseline/security/seven-viewport two-theme UI then passed on the native prototype.
Current dirty prototype SHA from chat6-receipts-native-build4.log, not public6.
Need final clean release build and final native regression before any new release.
Historical read retention after subscriber deletion/rejoin still requires a durable
receipt ledger. Do not mark CHAT-04 complete from this subset or claim app E2EE.

## Published6 and manual Retry correction7 (October20)

Chat6 ec0885ee and MyAccounts preview-20261020.1/87a1c98 are public with all
uploaded SHA/size/source mappings verified. Workspace44/11561f6d is public,
integrating those binaries and the owned-route ordering fix. Actual old42 gate
rejected6 before runtime extraction, automatic rollback preserved identities,
history and document bytes. Exact local44 fresh/paired42 upgrade and retained
browser SSO passed. Owner installation remains42, deliberately untouched.

A new real network fault test dropped only the actual successful server ACK.
The recipient received the message; after the SDK timed out, using the actual
Retry menu caused TWO recipient copies. The upstream context-menu path flushed
the queued entry and recreated it without its durable workspace_id. Prior tests
covered automatic/native retry but missed this actual menu. Release6/44 bodies
now disclose this defect; their immutable assets/tags have not been rewritten.

Correction7 wires the menu to the originating conversation and existing queued
publication. It keeps headers/content/attachments/UUID, changes only the wire
request ID, rechecks the automatic-replay race after subscription, and leaves
legacy ambiguous messages queued with guidance. Native acknowledgement must be
valid before clearing the composer. New manual-retry-acceptance.cjs exercises
the actual UI with two real accounts and a dropped real ACK, no fake success.
Need clean7 build, packaged fault/regression acceptance, publish7/paired45 and
actual download fresh/upgrade before updating owner. Do not mark full brief done:
default E2EE/device/recovery/rich/social/calls/native families remain incomplete.

That7 build/acceptance/publication is now complete: source0e968335, EXE
b1d8ecb27e8bf326845f41cb2ccf43d91f2f0c575d5a20fad1946a8b452eb051,
ZIPa2d6f53f65589315d006ef9ff7bc6435c7d7c93ac27103a8dcd56cb840c17082.
Release417956914 public; all15 uploaded digests/sizes/tag commit verified. Real
manual lost-ACK menu, baseline/security, live new-member query, group receipts,
7viewport/two-theme UI, offline/logout and restart passed exact final bytes on
isolated local44 and fresh43 fixtures. Five controller unit checks passed. Full
native tests passed using postgres,workspace,workspacetest: an initial invocation
omitted workspacetest and reached launcher flag parsing, not a product failure.
Workspace45/47b55ed now pins the actual7 ZIP and is building from org releases.
Owner42 unchanged; primary synthetic fixture is restoring actual42 for45 gates.

## Fresh45 By ID startup race (hold installer publication)

Workspace45/47b55ed is built/staged but NOT tagged/pushed/released. Exact7 old42
runtime admission/automatic rollback and retained ID/history/document bytes pass.
Fresh local45 installation/three-member sync passed, but baseline harness read
the By ID heading before Tinode login supplied the ID and failed its regex.
The readable ID appeared later; this exposed a real product bug as well as a
harness wait assumption: Copy was enabled and QR generation ran on mount against
an unavailable identity, with no refresh on later URI changes. An actual real-login
ACK delayed by3s (below SDK5s timeout) proves the rendered QR pixels do NOT encode
the displayed actual ID after login. Copy is also enabled before identity. An
initial6s diagnostic exceeded the SDK timeout and got504; it is a harness fault
setting, not evidence of a provider failure. No successful response was mocked.

Uncommitted8 blocks Copy/Open until a valid own user ID, shows connecting text,
refreshes QR on actual URI changes and ignores stale async QR completion. The
baseline harness now awaits the actual ID, not just its heading; dedicated new
topic-id-loading acceptance asserts pending state and actual QR pixels after the
real delayed ACK. Need complete source8/build/test/publish, then update UNPUBLISHED
45's pin and rebuild from a new clean commit. Preserve prepared47b55ed candidate
as release-workspace45; use a separate r2 stage. Never rewrite published7 or6.
Owner remains42. Broader mandatory E2EE/native/social/calling scope still open.

8 also passes immutable myUserId through Sidepanel→NewTopicView so identity is
an explicit React input rather than a mutable SDK lookup. Three lifecycle units
pass pending state, identity-change/stale completion and unmount. Existing five
retry-controller units now live in scripts/workspace too and pass. New real
3s delayed-ACK/QR-pixel acceptance remains to run against final8. No8 release yet.

Clean8 r1/source4216e4da7f5812578f7bb11ae61ffa6caeecde91 EXE
ad93f27b11e8b79fa6a4ffd03bbe3fb2861b98e744acf65eaba89d9f1b29037c passed
actual3s delayed-login guidance/disabled Copy/no invalid QR and exact rendered
QR matrix matching the real ID. Fresh45 baseline then passed. Retry/baseline/
security/live directory/group receipts passed, but UI navigation crashed blank:
getPinnedMessages on undefined. Do NOT publish r1 as8 or mark its UI pass.

New navigation acceptance reproduces that same actual crash deterministically
with ordered real server frames: adds2s latency from a positive data-end onward,
preserving later frame order. Leaving for Settings while leave ACK is pending
lets the old data-end call a handler whose view already has no topic. Source8 r2
now owns/guards/detaches topic callbacks immediately, protects deferred pins,
ignores stale subscribe completion and queues re-entry until pending leave ends.
Five actual-controller units pass retired callbacks, deferred pin, late leave,
pending-leave re-entry and stale subscribe ACK. New real navigation harness and
all final8 regressions/build remain required. Source4216 is not pushed/tagged;
8 and45 remain unpublished. Owner42 unchanged, actual7 rollback gate passed.

MyAccounts source87a1c98 now pushed main. Real development migration/negative
checks all passed and Chat state/document preserved. Final build is running in a
temporary detached NTFS worktree because source processing on I was very slow.
Canonical source/artifacts stay I; scoped C worktree/toolchain copies must be
removed after verification. No provider tag/release44 or owner update yet.
