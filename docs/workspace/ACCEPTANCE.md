# Chat preview acceptance

## Preview4: isolated Windows checks, 18 October 2026

The owner requested synthetic MyAccounts accounts and browser messaging checks.
Used a fresh, protected NTFS installation of Workspace and MyAccounts, separate
from the owner's live suite. Four synthetic example.test members were created.
No owner account or private conversation was used as a development fixture.

| Scope | Recorded result |
| --- | --- |
| Native Windows Go and browser production build | Passed; webpack size warnings only |
| Go gateway/directory/media regression checks | Passed |
| JavaScript ID parser regression checks | Passed |
| MyAccounts browser OIDC | Separate Alice and Bob browser contexts passed |
| People search | Name, username, verified email, MyAccounts stable ID, case-insensitivity, unknown user and self exclusion checked |
| Before first login | Charlie and a newly created Dave found without Chat login or server restart |
| By ID | No crash; QR image, copy ID, native user ID, QR URI and invalid-input guidance passed |
| Direct messaging | Alice to Bob and Bob to Alice delivered in independent browser sessions |
| History | Messages retained after browser reload without repeated account sign-in |
| Groups | Create, invite Bob, receive and reply passed |
| Attachments | 300 KB file upload and recipient download passed with exact bytes |
| Unauthenticated access | Member directory and attachment denied; file response sandbox retained |
| Account lifecycle | Forbidden member disappears from search and their gateway session is revoked |
| Database restart | Existing fixture database recovers and starts after stopping/restarting the suite |
| Private logging | New engine instance omits raw tickets and message body packets |
| Global sign-out, token expiry and network interruption | Not fully exercised in this task |
| Clean Windows host, service, reboot, database backup restore | Pending |
| Mobile, calls/TURN/SFU and external push | Pending/not configured |

Regressions fixed: qrcodejs failed as a constructor on By ID; email-only discovery
required first Chat login; native media lookup received a different /chat base
path from its configured serve URL; database migrations raced WAL recovery;
presence notifications could reference a contact not loaded yet; raw upstream
packet logging included authentication/message content.

The earlier preview3 owner deployment verified startup only, not messaging.
Preview4's results above come from the separate fixture. These checks do not
establish production, clean-host, recovery or end-to-end-encryption acceptance.
Chat remains a preview. Existing installation keys and native identities are
preserved. Only verified email supplies email discovery; issuer+subject remains
the account key. Full directory synchronization is provided by Workspace35+.

Repeatable browser checks: scripts/workspace/browser-acceptance.cjs. Supply
CHAT_TEST_PRIVATE_ROOT, CHAT_TEST_ORIGIN, PLAYWRIGHT_MODULE and optionally
CHAT_TEST_BROWSER against a fresh local fixture. Protected test-users.json holds
at least Alice, Bob and Charlie with username/name/email/id/password fields;
only synthetic example.test identities are accepted. Never use the live suite.
Run node --test workspace/client/scripts/topic-id.test.mjs and go test ./workspace
for the focused regression checks.
