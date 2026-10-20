# Mobile layout correction

User supplied two Android custom-tab captures: overflowing seven-action bottom
rail, profile name instead of Chat header, cramped list/filter UI, Workspace Close
below the catalog. Scope is a mobile UI correction to the prior parity work.

Baseline: Chat8/9df73077, Workspace45/edf3a8a and MyAccounts20/87a1c98 are public,
owner installation healthy with dedicated chat.m8e.co.uk. Existing source docs
follow-ups are Chat088b0a18, Workspace3dccd00, providerf631efc. No Actions.

Applied repository-history, write-aui-ui and browser-screenshot. Reviewed actual
rendered Android/iOS examples in Meta's official 2024 design case study, accessed
2026-10-20; no current authenticated reference account. Preserve that limitation.

Implemented mobile AUI header/menu/three real tabs/compose, useful empty states,
outlined icons, responsive phone density and touch targets. Workspace AUI modal
now separates fixed header/Close and footer from scrolling3-column app grid.
Native Escape/focus restoration preserves the underlying conversation. Full
E2EE/calls/native/rich/social scope is still incomplete; no parity claim.

All builds/artifacts I:/Projects/tooling/chat-parity-20261019. Named client C
mirror recreated with pinned npm ci. Fresh protected synthetic root is
C:/Projects/.cache/chat-parity-20261019/mobile9-chat-parity-20261020/fixture,
programs/files I task/mobile9, portal31960, dedicated Chat31976. Owner never used
as fixture. Seeded three example.test users, private credentials only in root.

Development deploy first correctly refused changed Chat digest against protected
catalog; no security check disabled. Development helper now updates only this
guarded synthetic catalog's exact digest before restarting. Initial test ran
before readiness and failed connection; wait for healthy first. Initial mobile
suite passed layout/message/modal checks but its exact General text locator
missed the uppercase/icon settings link; switched to semantic link role. These
development results are not final packaged acceptance. Phone-density refinement
and accessible back labels followed the first manual screenshot review.

Next: finish browser build, preserve generated AUI, clean source commit and native
Chat9 release build. Run final real mobile + existing browser/security/UI/offline/
retry/navigation regressions; inspect captures. Then immutable Chat9 and compatible
Workspace pin/release/update. Retain owner/newest recovery. Stop/ref-check scoped
test suites and remove disposable C caches after evidence preserved on I. Preserve
four unrelated untracked Workspace histories. Do not retag or overwrite8/45.

First clean85ea0c96 candidate passed full packaged mobile/baseline/security/offline/UI/retry/QR/navigation/restart and13 controller checks. Final manual review then added actual conversation timestamps, native long-press context menu support, right-aligned unread badges and centred Workspace modal.85 was held, never tagged/published as9. Repeat exact-byte final gates after the refinement build. Health helper localhost2s polling timed out despite healthy apps;127.0.0.1 with10s avoids IPv6 fallback delay. It was a fixture-checker issue, not a claimed startup failure.


Final2eca735e clean Chat9 built; EXE4d3274a94b680c4170ab72228909d447abe9ad14feeb44ae13029d05764e205e, ZIP8bb4b18d578d84b17d4b1d8ecc1f44927bfe0ab78ef30fbe315f6d22dee43474, runtimebe31b8a0448efbc105c04b2f99b48376920c103ab01dea89a3a5e02405a50e5e. All final real mobile/baseline/security/UI/offline/manual-retry/QR/ordered-navigation/restart checks passed again and13controller units. Real timestamps/menus and centred overlay inspected. Public release418079522 has15assets verified draft/public. Draft ref initially404 because gh defers creating it; explicit lightweight2eca tag was pushed and verification rerun before publication. No Actions. Workspace46/f9a9d21 now pins public9 and adds shared-picker CSS/harness; building from org assets on I. Update/installer/owner/cleanup gates remain next.
## Completed publication and installed verification

Chat9 public418079522/tag2eca735e has15 assets; Workspace46 public418088158/
f9a9d21 has28. All server size/SHA/tag mappings verified. Actual anonymous46
installerba04974e and bundlec7b6ab15 downloads match the tested bytes. Fresh offline
bundled install (Accounts+Chat,18optouts), ten mobile size/theme captures, six
shared-picker cases and paired Workspace45→46 preservation passed. Paired fixture
already had Chat9; no claim of8→9 in that fixture. Native source/runtime9 hashes
and first held85 candidate distinction remain above.

Normal owner operation selected workspace/chat only. First helper incorrectly
also selected unchanged Accounts and was refused before stopping anything; removed
that unavailable group. Applied exact local final46 while upload finished, then
verified byte equivalence with anonymous public downloads without reinstalling.
All18 app processes +Cloudflare and2builtin routes remain healthy; public Workspace,
Accounts and https://chat.m8e.co.uk/chat/healthz return200. Public shared picker CSS
contains the new frame rules. Owner conversation/browser sign-in was never a
fixture; no Safe Browsing or physical-device claim.

Native update completed cleanup: removed1 older owner backup (~3861.8MB), retained
verified update-20261020T065625-2e5806f6a86f with manifestSHA
46b356c0378a98c5487584f8eedb73cab5dcadbcea4661752ed91268287ac35e.
Never delete that newest owner recovery. Both protected synthetic C installations
were normally stopped, process/path/reparse checked and removed after sanitized
I evidence preservation. The named client cache was checked against committed
CSS/process references and removed. Source/builds/downloads stay I; C free~16.7GiB.

Final sanitized aggregate is docs/CHAT-MOBILE-ACCEPTANCE.json in Workspace and
Chat evidence/release-9-workspace46-integration.json. Published tags/assets are
immutable; documentation follow-ups need no binary rebuild. Next code release
must use new versions (Chat10/Workspace47), not replace9/46. Current mobile UI
correction is complete. Full original parity/E2EE/devices/recovery/rich/social/
calls/native brief is still incomplete. No Actions, agents or goals were used.
