# Outage continuity and local emoji/stickers

## Task and boundary

User asked whether emoji/stickers work, and requested a plan and implementation
for offline UI plus WebRTC continuation when the server is down, anticipating
future Android/iOS wrappers. No new publication was requested in this turn.
Base Chat HEAD7e7207e0, branch codex/whatsapp-parity. Public Chat9/Workspace46 and
owner installation remain unchanged. No Actions, agents or owner test data.

Used repository-history, AUI and browser-screenshot. Original full parity brief
is still incomplete, especially production E2EE/device trust, calls and native
apps. Do not imply that live DTLS plus encrypted local storage solves that scope.

## Implementation

`docs/whatsapp-parity/CONTINUITY.md` is the plan, deployment limits and wrapper
contract. Local AUI emoji/sticker picker includes24 Unicode choices and6 original
vector stickers, using existing Drafty for server history. Shared continuity
controller/store have encrypted IndexedDB records, non-exportable AES-GCM key,
durable UUIDs, direct receipt only after receiver commit, distinct server-save
state, duplicate/conflict checks, limits/backpressure, account separation and
foreground/native lifecycle adapters. Offline shell/bootstrap also fall back
on HTTP5xx, not just network errors. Sign-out closes channels but preserves the
encrypted account-scoped unsynced outbox for the same account's next sign-in.

Gateway POST api/continuity is same-origin/session-bound, bounded mailbox with
mutual opt-in and current engine membership authorization. Engine verifies both
read/write/join permissions and active peer, derives conversation incarnation
from ordered subscription creation times. Two-hour leases never outlive login;
online poll rechecks, outage remote revocation is delayed until lease expiry.
Optional protected continuity-ice.json supplies admin ICE; no public relay is
silently contacted. LAN reachability tested; Internet TURN not yet tested.

Normal composer routes eligible offline1:1 text/stickers into its durable
outbox, exact UUID header retained for canonical save. Reconnect publication
fences old incarnations; direct delivery is never a fabricated server sequence.
Recipient exact UUID lookup checks current membership and actual recipient
visibility, then fetches each canonical sequence. Delete/leave clears that
conversation's continuity copies. Groups/files/replies/edits/calls keep existing
server path. New peer establishment after offline reload/network change needs
signaling; existing data channels can continue during outage. Wrappers have
injected adapters/lifecycle contract, not completed signed Android/iOS projects.

## Development and verification so far

All large tooling/builds I:/Projects/tooling/chat-parity-20261019. Fresh protected
synthetic root C:/Projects/.cache/chat-parity-20261019/continuity-chat-parity-20261020/fixture,
programs/files I task/continuity, portal32360, dedicated Chat32376. Seeded three
example.test users with private fixture-only credentials. C client mirror was
recreated using pinned npmci and canonical AUI generated outputs copied back.
Development binary is source-dirty0.1.0-dev.continuity, never a release9 rebuild.

Eight controller/native lifecycle checks pass; Go server/workspace/auth/store
tests pass with postgres,workspace,workspacetest tags. Browser first found native
fetch illegal-invocation binding and was fixed. Whole fixture shutdown then
proved real bidirectional WebRTC text/emoji/stickers, storage ciphertext/key
non-exportability, actual packet dedup and cached reload/queue. Recovery initially
missed earlier incoming data when own publication advanced SDK max sequence;
added exact receipt/sequence recovery. Sticker comparison now ignores JSON map
property order. Test login must await provider form, and after whole gateway
restart explicitly reauthenticate same browser profiles via auth/login before
asserting canonical history (gateway sessions are memory-bound).

Current development binary9a67f7c37f70150002e40fbc76a4c8da52d8f519894f4c266ca3dbe65ebec4c5
has exact-ID recovery; runtime222de61f494c7576d792218a2b60e24a62634f8b5c737d29f6320d7777b23358.
Newest build logs continuity-{client,native}-r5.log; Go continuity-go-r5.log.
Deploy-r5 pending/being applied. Next rerun continuity-acceptance.cjs and existing
browser/security/mobile regressions; inspect screenshots, fix any failures,
record exact final evidence, then normally stop/remove scoped C fixtures/mirror
after path/process/reparse checks and sanitized I evidence preservation. Keep
owner and its newest recovery untouched. No release/owner update claim.

## Final verified checkpoint

Final development EXE d87fd2efa2948a90de8a2f43fae184b4ebc411ae4e0e85dbbd2cc1ea7098a326,
81,724,416 bytes; runtime2956ecc00ae01550749ad50ca3898ef74ec5a9b7b71d41866a70b19cb96e4600.
Version0.1.0-dev.continuity/sourceDirty=true, base7e7207e0; never a production
release or replacement for public9. All app source changes remain uncommitted.

The final pipeline rebuilt the browser/native executable, deployed the exact
digest to the guarded fixture, passed11 full default-Chrome outage checks
(including formatted text), redeployed the same bytes and passed all six existing
browser/parity-security/UI/mobile/navigation/manual-lost-ACK suites, then18
controller/lifecycle cases. Go server/workspace/auth-compile/store checks passed.
No mocked WebRTC, special IP-handling flag, physical phones or Internet TURN
acceptance. Shared-picker20-entry expansion remains DOM-only layout stress.

Additional fixes: Tinode wire serialization drops zero Drafty at/key fields;
normalize those defaults and clone immutable sticker templates. Exact receipt
lookups recover sequence holes when own publication preceded history hydration.
Late SDK identity initialization uses a live getter/verified authorization;
session401/410 closes links while preserving opt-in,403 disables it. Interrupted
channel sends still accept an already committed durable queue; late packets from
closed/replaced sessions cannot commit/ACK. One peer's sync failure cannot block
another's outbox. Non-opted-in chats retain their existing SDK offline/retry path.

Test helper lessons: SDK persist:false deletes the shared account database, so
auxiliary clients in this continuity harness use persist:true. Topic.publishMessage
swallows server errors, so negative publication checks use raw client.publishMessage.
Charlie acquired membership in other regressions; a separate fourth synthetic
continuity-outsider was seeded for the fresh non-member check. Await readiness
before browser startup. These were fixture/assertion errors, not fake product
successes. No owner account was used. Do not seed the owner installation.

Final aggregate `docs/whatsapp-parity/evidence/continuity-development.json` verifies
actual EXE/runtime/private test catalog hashes and changed browser-source mirror
equivalence, and includes scope, source hashes and named checks. Sanitized PNGs,
JSON and build-info are in I tooling/continuity-evidence. Final logs are
continuity-final-{build,browser,controller}.log plus continuity-regression-*.log;
runner continuity-final-pipeline.ps1 completed all gates. Earlier iteration logs
are historical and not final acceptance. README, SECURITY and implementation
status explicitly distinguish the new development scope from public9/full parity.

After preserving evidence, the synthetic suite was normally stopped. Absolute
path, ancestor/child reparse and active process checks passed before removing
only the named C continuity fixture and recreated client mirror (~1972.8MB).
Cleanup log is continuity-cleanup.log; C free12.7GiB at that checkpoint. Needed
source/builds/downloads remain I. Owner and its newest verified recovery remain
untouched; local owner health was200. No synthetic service remains running and
private credentials were not copied to I. The old C fixture/mirror paths are now absent.

Next publication, if requested: inspect Git, commit only intended task sources/
tests/docs/history, recreate the named NTFS client build, and perform a clean
--release build as Chat10 with proper new immutable tag/assets. Update compatible
Workspace47's org pin/package/release if publishing the suite. Never relabel the
source-dirty dev EXE or alter9/46. Current task did not authorize commit/push/
release or owner deployment. Future native apps still require bundled bootstrap,
validated authenticated API/OIDC adapters, secure keystore, push, signing and
physical acceptance; lifecycle interfaces alone are not completed wrappers.

## Automatic recovery follow-up — final verified checkpoint

User clarified same-URL loading, automatic handshakes without a mode change and
automatic sync on recovery. Work continued locally; no new publication or owner
deployment. Base HEAD/branch still unchanged, all changes remain uncommitted.
The prior build checkpoint above is historical.

Recent conversations now prepare automatically (explicit opt-outs retained).
Cached static fetches use a1.5s timeout, bootstrap2.5s. New
`continuity-signaling.mjs` caches bounded signed permissions encrypted with the
outbox and uses optional independent rendezvous. Primary401/403 never falls back
to cached authorization. `internal/continuityrelay` and `cmd/chat-rendezvous`
provide a separate native signaling service with Ed25519 verification, exact
origin/audience/conversation scope, bounded mailboxes and maximum2h leases.
Chat loads protected `continuity-relay.json`, signs with its private seed and
adds only its configured endpoint origin to CSP. Relay receives public key only.
No public independent service, TURN, Cloudflare configuration or native wrappers
were deployed. Same-PC relay testing does not establish WAN/phone acceptance.

Gateway bootstrap/401 include a public process instance marker. Only changed
instance sessions automatically recover via existing MyAccounts; same-instance
revocation/expiry stays signed out. Explicit logout suppresses recovery. Both
conversation route formats restore only for the same authenticated account.
Successful canonical receipts also record sequence IDs; exact history recovery
rehydrates saved incoming records if SDK history later lacks them.

Final tested development EXE8b86e8f22a53bff3d0b959e17eb1b7baf925c576f5dd9143097dc103d744f4f6,
81,734,656bytes, runtimebb95239e7f3487a395fa49e58f31a22e96fd9927bd3e6d30a1170cf2860226f0;
rendezvous59479d6aa5a5acb77b266a62d56754acfa1156e0fb401ccbc388fb2d5a1f65ce.
Version0.1.0-dev.automatic-continuity/sourceDirty=true. Do not relabel as release10.
`evidence/automatic-continuity-development.json` (under docs/whatsapp-parity)
records exact source hashes and matching NTFS browser mirror/installed EXE.
11 real Chrome checks passed, including both browsers reloading the SAME URLs,
fresh WebRTC handshake/delivery with Workspace fully stopped, automatic SSO
recovery, exactly-once visible history and real revocation.18 controller and7
signaling checks plus Go workspace/relay checks passed. Three final regression
suites passed: browser, parity/security, UI, including cross-app logout.
UI test explicitly opts out before checking the legacy SDK offline-draft path.

First follow-up browser failure was a test relay origin mismatch (localhost
versus the real isolated127.0.0.1 host), correctly rejected. Next test exposed a
real saved incoming history gap; exact cache-presence recovery fixed it.
Installer first refused old I fixture program directories; used new
I tooling/continuity-auto/{Apps,Files}. Regression runner had to restart the
fixture after the browser's spawned Workspace process ended with its job.
None of these were owner failures. No security check was bypassed.

Tooling remains I:/Projects/tooling/chat-parity-20261019. New scripts/logs use
continuity-auto names; `rerun-auto-continuity.ps1` builds/deploys/runs outage
acceptance and `verify-auto-continuity.ps1` runs the three suites.
Sanitized final screenshots/results/build-info are in continuity-auto-evidence.
Private synthetic root and NTFS browser mirror are disposable C paths and must
be removed with cleanup-auto-continuity.ps1 after proof capture. No private
credentials, signing seeds or databases may be copied into evidence or Git.

Next release remains Chat10/Workspace47 if requested, with clean committed
sources and new immutable artifacts. Independent deployment requires a host
outside the Workspace PC and configured ICE for Internet reachability; the
owner's existing Chat9/Workspace46 URLs do not gain this from local source edits.

Cleanup completed after evidence capture: normally stopped the synthetic suite,
checked absolute paths/reparse ancestors and children/process references, then
removed only the named C fixture610.6MiB and client mirror316.3MiB. Both paths
are absent. C free12.78GiB; owner8990 health200. Owner/latest recovery untouched.
Final source hashes still match the new evidence and git diff --check passes.

## Public discovery and shared navigation — 20 October follow-up

User rejected having to host another signaling service, accepted public Nostr/
Trystero discovery, then requested implementation and the supplied sidebar
button correction using the design system. No commit/push/release or owner
deployment requested this turn. All previous work and this increment remain
uncommitted on the same branch/base. Do not label older private-relay acceptance
as evidence for this new transport.

Pinned `trystero@0.26.0` in the client lockfile. New
`workspace/continuity_discovery.go` automatically persists a P-256 authority in
protected app data and signs two-hour maximum, login-bounded device permissions.
Claims bind UID, peer, incarnation, origin, private room and browser public key.
Separately labelled HMAC-derived room/password contain no predictable user IDs.
Authority corruption fails closed. Client P-256 private keys are non-exportable
IndexedDB CryptoKeys; grants/secrets remain AES-GCM outbox records.

`continuity-discovery.mjs` wraps Trystero's authenticated pre-join hook: both
server-signed certificates and fresh device possession proofs must pass before
message actions activate. Challenges bind both transient connection IDs and
the token/room. Relays are allowlisted in browser and CSP: nos.lol,
relay.damus.io, relay.primal.net. Their NIP-11 metadata was read; this does NOT
prove message delivery or long-term usage permission/availability. Explicit
Cloudflare public STUN replaces library defaults; admin ICE can override it.
No paid TURN/service/account or GitHub credential is created. Private native
rendezvous remains optional legacy. Public relays see IP/timing/pseudonymous
discovery, encrypted SDP; application certificates/payloads use WebRTC.

Controller preserves durable ACK, exact-ID sync, online authoritative401/403,
expiry/opt-out/logout behavior. Four authenticated/pending devices per room,
16KiB packet and64KiB buffering budgets, handshake timeout and permit renewal.
Source review added generation-fenced/serialized permission writes so late
responses cannot undo explicit opt-out. Groups/files/calls/native background
and full E2EE remain outside this increment.

AUI rail now has primary/secondary sections and actual active destination
values. Shared Button resets inherited min-width/margins/height and fixes
hover foreground specificity. Rail96px, controls64px, consistent outline icons,
token-based light/dark colours. Final isolated generated-component captures
show readable labels/hover/focus and the retained three-tab mobile layout.
Initial screenshots failed because the temporary harness lacked the app's
automatic JSX/prod settings; corrected harness captures supersede them.
No owner data or installation used.

Builds passed: production browser, Go workspace, Windows packaged EXE.
No automated tests or public-relay outage/separate-network acceptance ran
this turn. New development binary0.1.0-dev.public-discovery, sourceDirty=true:
EXE2a6bdc5946e62f01dcacc82f5f92116205b5d1195c0de27faa3995b8ef3ba31a,
81,786,368bytes; runtime727ee803f16340481228839409fedb18e90d492d2d3b8077045df332c58c6ce4.
Trystero increases the raw browser entry by about82KiB; webpack's bundle-size
advisory remains. Added MIT notices for Trystero/core/Nostr and noble secp256k1
to bundled license files. Docs explicitly distinguish new implementation from
the earlier real private-relay acceptance.

Tooling: I:/Projects/tooling/chat-parity-20261019/public-discovery-* logs/preview,
capture-public-sidebar.cjs, record-public-discovery.cjs. Metadata evidence is
`docs/whatsapp-parity/evidence/public-discovery-development.json`; source hashes
and mirror equivalence are checked before cleanup. Chat.exe remains dist/Chat.exe.
No public version/tag/owner install changed; next publication still needs an
explicit current request, clean source and new immutable releases. First needed
functional verification is real public Nostr discovery, cached two-browser
reload with Workspace stopped, identity/expiry/revocation/opt-out denial, then
exact-ID recovery. Keep all such work on synthetic accounts, never owner data.

After recording build/source equivalence and visual evidence, the isolated
preview was stopped. `cleanup-public-discovery.ps1` checked exact resolved
allowlisted paths, ancestor/child reparse points and active process references,
then removed only C:/Projects/.cache/chat-parity-20261019/client and
C:/Projects/.cache/chat-public-sidebar-20261020. Reclaimed317.5MiB, C free10.94GiB.
No live/private owner data or recovery backup was removed. The browser mirror
must be recreated with build-client.ps1 (without SkipDependencies) for later work.
Preview PNGs, evidence and the development executable remain on I:.

## Chrome outage acceptance and preview10 preparation

The user now authorizes Chrome network-disabled verification, source push and
releases, built locally without GitHub Actions. Workspace has independently
advanced to48 with Social2; preserve those changes and use49 for the paired suite.
No owner installation is a fixture. Fresh protected synthetic root on C with
program payloads on I tooling/continuity-public, four example.test identities.

Real Chrome development acceptance passed13 checks on the public-discovery
binary: automatic authenticated WebRTC; public relay reconnect after both
profiles reload with the whole suite stopped; direct text/emoji/stickers;
durable ciphertext, duplicate suppression, automatic session recovery; Chrome
network disabled and queued send surviving another reload; exact-ID network
restoration;503 bootstrap recovery; real membership revocation. No private
relay configured, no successful RTC responses mocked. Same PC only, not separate
Internet networks or physical devices. Screenshots inspected.

Source review found the UID local variable shadowed the permission-write
predicate in signaling. Renamed it and added a regression requiring the actual
predicate, late-response opt-out cancellation and public-grant revocation.
18 controller checks,10 signaling checks,5 WebCrypto checks and native gateway/
server/store/rendezvous tests pass. New Go test covers persisted authority,
signed scope, symmetric room derivation, epoch separation and corrupt-key denial.
Final clean packaged acceptance and immutable Chat10/Workspace49 publication
remain next. Release receipts must describe exact built bytes separately.
