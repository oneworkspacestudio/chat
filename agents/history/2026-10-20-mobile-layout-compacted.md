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

