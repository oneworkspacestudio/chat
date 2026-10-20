# Implementation status — 20 October 2026

The requested brief remains the delivery contract. This is a usable development
candidate, **not full WhatsApp parity or a production E2EE messenger**. Public
release versions and hashes are recorded below after their actual publication.

## Published foundation increment

[Chat0.1.0-preview.5](https://github.com/oneworkspacestudio/chat/releases/tag/v0.1.0-preview.5)
was built locally from clean source `21fe7325a68245372a1ef9cb22856d6ac5ec1ea8`.
Executable SHA256 is
`115d4f276129c5b58b843401bdca853072c4a84c8f2499718e7105228b8a7ea8`;
ZIP SHA256 is
`db72538e9e722da41a2d46a74b227b4ed2451e3605312e0f8cd402148d87a933`.
No GitHub Actions were used. The exact executable passed native/browser checks;
the public ZIP was downloaded and its digest verified. Workspace43 was then
published; actual public42→43 upgrade preserved IDs, history, app selection and
actual UI document filename/bytes. Default-online fresh installation passed
baseline/security/UI checks **after the directory snapshot was ready**. Its first
immediate Find query missed a newly created account, which prompted the next fix.
See `evidence/release-5-public-integration.json` for the exact boundary and hashes.

The actual public Workspace42 rejected the independent schema2 app manifest.
When offered the exact new executable through a complete compatibility-test
bundle, it attempted startup; Chat refused before runtime extraction or data
migration. Automatic rollback restored the exact public Chat4 executable,
immutable IDs, messages, attachment links, download filename and document bytes.
This is recorded separately from the final public Workspace43 bundle acceptance.

## Preview6 development verification (publication pending)

The new managed Find picker refreshes an open query while visible and online.
A real account created after the empty search appeared automatically, without
retyping or Retry, and could be selected before its first Chat sign-in.

New group messages carry a server-authored original recipient snapshot. The
actual three-account UI remains Sent with one original recipient offline,
changes to Delivered when all acknowledge receiving, and Read only when all
acknowledge reading. A read also proves delivery if a partial SDK update omitted
the recv counter. Sender drafts fetch their exact stored header after ACK.
Forged client audience is discarded, and UUID retry after membership changes
keeps the original sequence and one message. Removing an unread member and
reloading cannot shrink the historical audience into all-read. Text/accessible
labels accompany the receipt icons. Server/store and pure client tests passed.

Legacy group messages without an original audience are conservatively Sent.
Historical receipt proof after subscriber deletion/rejoining still needs a
durable receipt ledger; a lost recipient counter cannot establish Read. Message
info, receipt privacy policy and the complete CHAT-04 family remain incomplete.
These tested subsets do not mark the whole family complete or establish E2EE.

The companion MyAccounts fix binds token exchange to the exact original callback.
Actual public-client S256, signature/nonce, wrong/missing/alternate registered
callback, replay and concurrent single-use checks passed, including existing
database/token/SSO and Chat document/history preservation. Final clean release
and downloads are tracked separately. This is a native-auth prerequisite, not
complete native Android/iOS delivery. No owner installation is a test fixture.

## Asserted against real packaged services

Tests use synthetic Alice, Bob and Charlie accounts, an isolated MyAccounts
instance and the actual Windows Chat/PostgreSQL runtime. No successful message,
media or call response is mocked. The owner's installation is not a fixture.

- Baseline public Workspace 42 / Chat 4 sign-in, discovery before a member's first
  Chat login, IDs/QR, two-way messaging and reload were preserved as a cold fixture.
- Candidate SSO, discovery, two-way messaging and history reload passed again.
- Native restart preserved account links, retry sequences and attachment hashes.
- Same UUID retry produces the original sequence and one recipient delivery;
  changing its payload is rejected. Retry after message or conversation deletion
  returns Gone without republishing or reinserting deleted content in the SDK.
- Uploaded document bytes match at the authorized recipient. Anonymous users,
  signed-in outsiders, HEAD requests, forged attachment grants and removed group
  members are denied as applicable. A rejected grant does not consume a sequence.
- Socket ticket substitution and cross-account long-poll session reuse are denied.
- Per-account lists/favourites persist with ETag conflict protection; another
  user's list does not become the current account's list.
- Managed Chat uses a dedicated hostname; the old shared hostname cannot access
  its gateway API. The app switcher has actual absolute app links, owner filtering,
  Escape/focus restoration and no duplicate floating launcher.
- Seven viewport sizes in light and dark passed computed bubble-token checks and
  document horizontal-overflow checks. These are desktop Chrome emulations.
- Draft reload and IME Enter guard passed. Static-only offline cache, cached
  account reload, reconnect delivery once and acknowledgement-only draft clearing
  passed. Workspace logout revokes Alice's open Chat sessions/socket while Bob
  stays authenticated. No uncaught browser errors occurred in the final UI run.
  These are legacy plaintext flows; their encrypted variants remain incomplete.
- Real custom-list create/select/membership/rename/reorder/delete synchronized
  across independent sessions. The actual group UI created a group, added Bob
  and exchanged real group messages before the visual captures.
- The managed account/security view links to MyAccounts, presents the central
  name read-only and removes unusable native password/delete-account controls.
- Workspace distribution and suite unit tests passed. Tests needing Windows ACLs
  ran with named NTFS temporary fixtures; compilation/downloads remain on I:.
- A real Windows native process and real browser WASM exchanged MLS proof
  messages; both directions, AAD, replay/tamper and restored-sender fencing passed.
  This does not mean the application sends encrypted messages.

Harnesses: `scripts/workspace/browser-acceptance.cjs`, `parity-acceptance.cjs` and
`ui-acceptance.cjs`. Scoped test results/captures will be copied into `evidence/`
after review; the current sanitized results and representative captures are indexed
in `evidence/README.md`. No credentials or private key snapshots belong there.

## Still incomplete

The feature matrix tracks 62 families separately on web, Android and iOS. Most
families include requirements beyond the tested subsets above. Outstanding work
includes complete messaging/mutation/receipt/search/privacy acceptance; resumable
encrypted media, full voice/expressive/location/Drive flows; signed device trust,
default E2EE and legacy migration; polls/events/status/channel/community/broadcast
families; individual/group/guest calling with SFU/TURN/media keys; complete native
clients, configured push and device integrations; portable fresh-PC/key recovery;
actual old-manager offered-release and final fresh/install/rollback checks.

Authenticated reference WhatsApp build/version/captures are unavailable. No exact
pixel parity claim is made. Android/Apple signing, a Mac host, physical devices
and separate-network media checks are not verified. Those limitations do not
remove independent browser/backend features from scope.

Do not infer completion from a build, screenshot, protocol proof, release tag or
successful test for one subset of a larger capability.
