# Mobile layout correction — 20 October 2026

The supplied phone captures exposed an overflowing seven-action navigation bar,
an account name used as the app header, the upstream shrug empty state, a visible
filter scrollbar, and a Workspace close action after the entire app catalog.

## Reference actually reviewed

Reviewed the rendered Android and iOS screen examples and the navigation/filter
description in Meta's [WhatsApp design case study](https://www.meta.com/design-at-meta/blog/whatsapp-user-interface-update/)
(published 9 May 2024; accessed 20 October 2026). Also checked current official
search/filter help. No signed-in current consumer WhatsApp reference account was
available: these changes do not establish pixel parity with a particular 2026
Android/iOS release or physical-phone acceptance.

The mobile hierarchy follows the reference's compact app header, search above
conversation filters, full-width list, lower-right compose action, outlined
navigation icons, full-screen conversation and separate secondary options.
One Workspace's existing blue/light/dark tokens and Chat logo remain. Only
working destinations are offered: Chats, Archived and Settings. Calls, Updates
and Communities are still incomplete; no decorative destinations were added.

## Implementation

- New mobile trees live in `mobile-header.aui`, `mobile-menu.aui` and
  `mobile-nav.aui`; desktop retains the existing rail.
- New chat and Workspace actions have accessible labels and 44px targets.
- Profile, appearance and sign-out are reachable from More options. Archive and
  settings remain real existing routes; the selected destination is identified.
- Filters scroll horizontally without exposing a desktop scrollbar.
- Empty states explain the actual list/search/archive state and offer the real
  directory picker when appropriate.
- Conversation rows, toolbar, bubbles and composer use phone density and touch
  targets. Their existing messaging, draft, attachment and receipt handlers remain.
- Workspace is a constrained native modal: header/Close and footer stay outside
  its scrolling app grid. Escape restores its opener without clearing the
  underlying conversation or draft. Native dialog focus containment remains.

## Verification contract

`scripts/workspace/mobile-layout-acceptance.cjs` requires an isolated native
Workspace/Chat/MyAccounts installation with synthetic accounts. It exercises
real discovery, two-user messaging, navigation, settings and draft preservation,
five narrow/short viewports in both themes, enlarged root text, keyboard focus,
and visible close targets. A separate DOM-only expansion to20 catalog entries
stress-tests the grid's layout; it does not claim twenty installed/usable apps
or mock a successful backend response. Final packaged results are recorded
separately after they run. Existing browser/security/offline regressions remain
part of acceptance.

Conversation timestamps use actual latest-message/touched times and locale-aware today/yesterday/date formatting. Unread badges align to the list edge. Long press/right-click opens the actual existing chat context menu; its keyboard-accessible options link remains available on focus. The Workspace dialog is centred within the visible viewport.

