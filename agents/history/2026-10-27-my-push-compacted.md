# Native Android My Push transport

User requests self hosted Firebase-style app instead of requiring Firebase.
This worktree retains previous native-device changes, plus server/push/workspace
plugin and workspace/self_push.go. Full handoff in I:/Projects/my-push under
agents/history/2026-10-27-my-push-compacted.md. No publication/install/tests.

Manager supplies loopback My Push URL/public HTTPS endpoint/scoped service key.
Runtime chooses workspace plugin ahead of legacy optional FCM config. Only
authorized nonsilent message recipient IDs are forwarded locally; phones get
opaque sync signals. Bootstrap registers30min device credential derived from
existing native grant, serialized against revocation/current directory. Phone
removal, identity revoke and reconciliation request push revoke; unreachable
broker credential expires within30min and never grants message access. Existing
native socket/message/reply membership path retained. Browser provider unchanged.

Matching Android preview2 has no Firebase SDK and uses visible remoteMessaging
service + WorkManager fallback. Native wake privileges/force-stop/sleep limits
remain. No native background calls or new E2EE claim. docs/workspace/ANDROID.md
and README updated; old Firebase-project requirement is superseded.

Local Windows Chat-dev.exe compiles with existing prior matching browser/runtime
payload; no new web JS change in this turn. Artifacts and corresponding sources
I:/Projects/tooling/my-push-20261027. No device/Doze, live server or synthetic API
acceptance run. Original I:/Projects/workspace-chat unrelated Linux work untouched.
Reconcile current main/managed requirements and actual release versions before
any authorized publication; no GitHub Actions or owner fixture.

## 27 October authorized acceptance

User authorized attached-phone testing and publication/install. Synthetic fresh
NTFS three-app fixture passes independent Alice/Bob MyAccounts sign-in, native
linking, public bearer bootstrap, scoped My Push provisioning, authenticated
Centrifuge WebSocket, Bob-to-Alice Chat delivery, opaque wake payload, durable
pending queue, acknowledgement and immediate Chat-device revocation. Test artifacts
remain outside source. Phone installed debug2 but UI acceptance awaits unlock;
no Doze/reboot/physical notification action claim. Releasing evaluation previews,
not full WhatsApp parity. No GitHub Actions. Preserve existing Linux gateway work
in the separate original workspace-chat checkout.

## Chat11 public delivery and acceptance

Published Chat11 at15996b0d with complete corresponding source/update metadata;
all14 release assets verified against local SHA256/size and channel promoted.
History-only later commits do not move the release tag. Release mirror checks
normalize Windows CRLF for text while retaining byte checks for artwork.
Final native protocol tests pass16 checks with My Push2/Workspace94: two-user
sign-in, native link/bootstrap, real server publish ACK then opaque public wake,
durable queue/ACK, native socket auth/content/reply, browser-session restoration
and immediate revocation. Do not treat optimistic/direct-fallback UI text as a
committed server message. Separate acceptance evidence is authoritative; the
builder's build-info flag does not mean externally run tests were absent.

Normal protected93→94 update added Push automatically and respected26 fixture
exclusions. Primary owner update then installed Chat11, all28 services healthy;
existing credentials/config and unselected app bytes retained. No owner data was
a functional fixture. MyAI14/Maps8/Tasks4 retained. Signed Android2 is installed,
exact public APK hash checked, app closed and Appium session deleted. Physical
notification/reply/Doze/reboot acceptance remains pending locked-phone unlock;
secondary install pending user MyAccounts login. No native incoming-call/full
WhatsApp or Linux gateway certification. Original separate Linux edits untouched.

All synthetic C data/build mirrors, task services and three Quick Tunnels cleaned.
Source/artifacts/receipts remain on I. Do not rerun completed primary update;
recreate fresh isolated synthetic state for physical tests. See Workspace's
public docs/ANDROID-DELIVERY.json for sanitized current delivery status.
