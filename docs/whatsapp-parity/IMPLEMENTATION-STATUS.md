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
the public ZIP was downloaded and its digest verified. Workspace43 packaging
and final public install/upgrade checks remain in progress at this checkpoint.

The actual public Workspace42 rejected the independent schema2 app manifest.
When offered the exact new executable through a complete compatibility-test
bundle, it attempted startup; Chat refused before runtime extraction or data
migration. Automatic rollback restored the exact public Chat4 executable,
immutable IDs, messages, attachment links, download filename and document bytes.
This is recorded separately from the final public Workspace43 bundle acceptance.

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
