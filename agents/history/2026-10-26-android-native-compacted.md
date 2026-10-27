# Native Android companion development

Branch codex/android-native in I:/Projects/chat-android, base d8ec777a8cb2a7827b0f9a7fca9af1268155da2e. Companion Workspace branch codex/android-workspace in I:/Projects/one-workspace-android at b6f88cc base. Preserve original workspace-chat uncommitted Linux work. Current request authorizes local implementation/build, not new publication/install or tests. See the companion Workspace history for full source boundaries.



- android/: Java/Material app uk.co.m8e.workspace, API28+, target35, version1 /
  0.1.0-preview.1. Uses real existing branded PNGs, safe-area content, searchable
  saved app grid, Apps/Chat/Settings, light/dark, shared WebView cookies, HTTPS
  trust discovery/legacy secure redirects, file picker, user-initiated document
  windows as a separate non-exported activity, normal Android back navigation,
  camera/microphone/location consent for trusted displayed origins.
- Native Firebase Messaging + WorkManager: opaque wake hints, short authorized
  Tinode connections, MessagingStyle notifications, private lock-screen version,
  previews off by default, conversation shortcuts/badges, direct reply/read/tap.
  Queued actions carry device identity; encrypted replies stay out of WM input.
  Account/device/generation checks fence stale writes and actions. Unknown
  publish ACK is not blindly retried. No perpetual hidden WebView/process claim.
- Android Keystore encrypted device credential/history, app backup disabled;
  cold-start Firebase public options initialized in Application. 15-minute
  periodic fallback respects Android power/force-stop/permission controls.
- Manager optional public /.well-known/one-workspace.json advertises only public
  origins; actual per-account app catalog remains authenticated. Older managers
  can still launch apps using authenticated existing HTTPS redirects.
- Chat companion native API: same-origin cookie link + device hash in protected
  DPAPI state,30-day grants,20/account cap, current directory authorization,
  gateway-bound short tickets, bearer-only background socket/bootstrap, native
  Chat cookie restoration, per-user linked-phone list/removal, revocation and
  cancelled streams/sessions. Provider config only from protected Chat data;
  service-account private key never goes into APK/source/push. FCM adapter opaque
  allowlist drops body/sender name/attachments and scopes UID+public Chat origin.
  Optional bad push config does not intentionally stop core web Chat.
- Source/docs/build scripts/Gradle wrapper + distribution hash/dependency lock,
  bundled notices, release signing fail-closed without explicit private key env.
  Full WhatsApp parity, native background voice/video/Telecom and production E2EE
  are not implemented by this increment. See android/README.md and Chat ANDROID.md.

## Compilation / artifacts

All builds local. Current Android source mirror matches all92 canonical source
files; Gradle assembleDebug succeeds. APK signature/metadata verified:
17,439,877bytes, SHA256 ca46217a3c433e5f4e00bc93093d4f68c23f250347fc448f947553de6f499d04.
Development/debug signing only, not a production signing identity.
Current Windows manager compiles (development version). Current Chat server
compiles as0.1.0-dev.android,101,269,504bytes, SHA256
2b25a900501403374fc96fdeb37169a8d3d9eae0bdb80146a40b2a69c9ba6923;
runtime997931dc9c87e63bf5cbaf36ae655b455908f2bb57732ba37b61f413e3d3b6eb.
Chat browser production build succeeds with existing webpack size advisories;
changed browser sources match the build mirror. No test suite, phone/emulator,
Doze, live push, lost-device, server-restart or native call acceptance performed.

Artifacts and sanitized receipts: I:/Projects/tooling/workspace-android-20261026.
OneWorkspace-Android-0.1.0-preview.1-debug.apk, Android source ZIP, complete Chat
source ZIP, development companion EXEs, SHA256SUMS.txt and build-receipt.json.
Private live servers/users/files were never opened/mutated as a fixture.

## Required next step

User was asked asynchronously whether a Firebase project already exists; no
answer received during implementation. Instant closed-app delivery remains
unconfigured, and new companion server code is not installed. Need that project
choice/configuration and an explicit publication/install request before GitHub
releases/live deployment. Obtain a permanent Android release signing key before
production distribution; do not call the debug APK a production release. Device
acceptance needs a separately authorized synthetic setup. Preserve all other
concurrent component pins/releases and original Linux work. C task build cache
cleanup is recorded separately; all source/final artifacts remain on I:.

Cleanup complete: stopped task Gradle daemons, verified source/artifact receipts,
checked exact absolute C task root, ancestors/children for reparse points and
active process references, then removed only the named C build/cache tree.
834,286,879 logical bytes removed. C free-space snapshot6.96GiB; concurrent
work/system paging may change it. No live installation, data or backup deleted.
Source, APK, companion candidates and corresponding source archives remain on I:.
No live/Firebase/phone acceptance claim or external publication was performed.
