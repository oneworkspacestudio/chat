# Acceptance journeys

Each record must contain initial state, expected/actual outcome, backend assertions, cancellation/failure recovery and evidence. Baseline preview4 acceptance is retained separately.

## FLOW-01

Existing user: Workspace sign-in → Chat tile → old chats preserved → open conversation → send → recipient replies → reload.

Status: Legacy messaging subset passed; complete released upgrade/encrypted-history journey incomplete.
Initial state: public Workspace42/Chat4 synthetic Alice/Bob/Charlie fixture, then manually deployed candidate (not official updater).
Actual: MyAccounts sign-in, automatic Chat entry, discovery, native IDs, actual two-way messages and reload passed. Native restart preserves IDs and attachment hashes.
Evidence: evidence/baseline-regression.json and evidence/native-security.json.
Remaining: final published download/update, mixed legacy/encrypted history and fresh-install acceptance.

## FLOW-02

New contact: New chat → search a member who has never opened Chat → select → compose → show secure-setup pending if keys do not exist → recipient enrols keys → an authorised sender device encrypts/sends → recipient receives. Include sender-offline and already-enrolled-recipient variants.

Status: Directory/plaintext delivery subset passed; secure setup/encryption journey incomplete.
Actual: Alice finds Charlie before Charlie first opens Chat; name/username/verified-email/ID and QR URI work. Real independent sessions exchange messages.
Evidence: evidence/baseline-regression.json.
Remaining: recipient-device enrolment, verified keys, encrypted pending queue and sender-offline delivery after enrolment.

## FLOW-03

Device link: add device → expiring QR → trusted approval → verify → sync → revoke device → future access denied.

Status: Not yet executed for this candidate.

## FLOW-04

Message actions: send → recipient receives/reads → reply → reaction → edit → message info → pin → search/jump → delete for everyone.

Status: Retry/deletion subset passed; full action chain incomplete.
Actual: real native acceptance returns a sequence, identical UUID retry reaches recipient once, changed payload rejects. Deleted message and deleted/reopened conversation UUIDs return Gone rather than resurrecting content.
Evidence: evidence/native-security.json.
Remaining: full reply/reaction/edit/info/pin/search/jump and all deletion permission/interval combinations.

## FLOW-05

Attachments: select photos/documents → previews/captions → cancel one → send others → recipient views/downloads exact document bytes.

Status: Exact bytes and access-control subset passed; complete attachment journey incomplete.
Actual: real upload, authorized download equality, unshared/outsider GET and HEAD denial, forged reference denial, removed-member denial. Failed grant leaves the following valid send working.
Evidence: evidence/native-security.json.
Remaining: complete batch previews/captions, progress/cancel/resume and encryption.

## FLOW-06

Voice: hold-record → cancel; then lock → pause/resume → preview → send → recipient plays/seeks/changes speed.

Status: Not yet executed for this candidate.

## FLOW-07

Group: create → invite → approve → change roles → mention → remove member → confirm revoked access to future content.

Status: Basic actual group UI and revocation subset passed; complete group journey incomplete.
Actual: create group in UI, add Bob via member form and exchange actual messages. Separate native test invites/removes a member; group-only attachment then denies that member and outsiders.
Evidence: evidence/browser-ui.json and evidence/native-security.json.
Remaining: full admin/invite approval/member role/mention policy and encrypted epoch transitions.

## FLOW-08

Poll/event: create timed poll → vote/change → results/close → create event → RSVP → edit/reminder → open call link.

Status: Not yet executed for this candidate.

## FLOW-09

Status: create → restricted audience → eligible viewer/reply → ineligible viewer denied → expire/delete.

Status: Not yet executed for this candidate.

## FLOW-10

Channel/community: create and follow channel → publish/react → community with announcement and member groups → role and outsider checks.

Status: Not yet executed for this candidate.

## FLOW-11

Call: caller/recipient on separate networks → ring/answer → audio/video → mute/camera/screen share → disconnect/reconnect → end/history.

Status: Not yet executed for this candidate.

## FLOW-12

Group/guest call: create link → guest waiting → host admits → group media → remove guest → transfer authorised device → leave.

Status: Not yet executed for this candidate.

## FLOW-13

Offline: compose/send while disconnected → visible pending state → restart/reconnect → exactly one message delivered → read state converges.

Status: Legacy text offline/reconnect subset passed; encrypted/full crash journey incomplete.
Initial state: authenticated synthetic browser with account-scoped history/outbox and installed static-only worker.
Actions: disconnect actual sockets and network; compose/send; reload offline; restore network.
Actual: correct cached account/draft survives; real recipient receives once; sender clears draft only after native acknowledgement; no uncaught errors. Static cache contains no API/media/credential response.
Evidence: evidence/browser-ui.json.
Remaining: encrypted keystore/outbox, process-crash/upload interruption/reordering variants and physical phones.

## FLOW-14

Privacy: blocked contact, hidden receipt, locked chat and disabled account each behave correctly across browser and phone.

Status: Identity/role/logout subset passed; complete privacy journey incomplete.
Actual: outsider and removed-group-member media denied; valid different-account ticket and long-poll SID rejected; Workspace revokes Alice's current sockets/sessions while Bob stays signed in.
Evidence: evidence/native-security.json and evidence/browser-ui.json.
Remaining: complete block/receipt privacy/chat lock/disabled-account cases across browser and actual native clients.

## FLOW-15

Storage/recovery: export selected chat/media → consistent encrypted backup → restore to fresh PC → recover keys → verify history/attachments.

Status: Not yet executed for this candidate.

## FLOW-16

Upgrade: existing released fixture → new Chat and Workspace packages → preserve IDs, selected apps, login, history, routes and rollback.

Status: Prototype restart and admission checks passed; official released updater journey not yet executed.
Actual: native restart preserves fixture IDs/bytes/receipts. An actual candidate executable rejects old-manager launch shape before creating/opening its data directory. Unit manifest/capability and suite tests passed.
Remaining: actual published42 manager offered new release, independent refusal/full-bundle rollback before migration, final paired download/fresh/upgrade/selected-app/rollback checks. Manual prototype replacement is not updater acceptance.

## FLOW-17

Mobile background: locked phone → incoming message/call → notification action → correct account/conversation → permission/interruption recovery.

Status: Not yet executed for this candidate.

## FLOW-18

Appearance: every major screen in light/dark, keyboard navigation, large text, narrow screen and shared app switcher.

Status: Declared viewport/theme/navigation subset passed; full reference/accessibility journey incomplete.
Actual: five declared viewports in both themes, computed incoming/outgoing tokens, no horizontal document overflow, app switcher Escape/focus restoration and actual list CRUD across independent sessions.
Evidence: evidence/browser-ui.json and indexed PNG captures.
Remaining: authenticated dated WhatsApp comparisons, every menu/screen, full contrast/large-text/keyboard/screen-reader audit and physical mobile acceptance.
