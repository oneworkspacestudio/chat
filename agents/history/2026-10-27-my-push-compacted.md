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
