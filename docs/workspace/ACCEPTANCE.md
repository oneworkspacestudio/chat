# Chat preview acceptance

Chat remains a preview. The following scopes distinguish compilation, actual
installation and behavior that has not been exercised.

| Scope | Recorded result |
| --- | --- |
| Windows Go build | Passed from frozen committed source |
| Browser production build | Passed; webpack bundle-size warnings remain |
| Dependency/package hashes | Recorded with release checksums and provenance |
| Actual installed native startup | Passed with preview3 in Workspace34 |
| MyAccounts client registration and issuer discovery | Completed during installation/startup |
| Existing installation preservation | Prior logical credentials, app executable versions, settings and Vault origin/certificate retained |
| Browser OIDC handoff | Not exercised for Chat |
| Two-user messaging, groups, discovery and permissions | Pending |
| Attachments and access control | Pending |
| Reconnection, expiry, global sign-out and disabled-user lifecycle | Implemented; runtime acceptance pending |
| Backup restore, clean Windows host, service and reboot | Pending |
| Mobile/native clients | Pending |

The initial actual installation exposed missing push-notification JSON: Tinode
requires an explicit empty array even when push is disabled. Preview3 generates
that setting for all new starts. PostgreSQL initialization/schema116 succeeded
before that failure; the corrected deployment retained the database and keys.
The preview33 suite draft was withheld and the existing apps restored while the
correction was built. Workspace34 startup now reaches ready with all14 apps.

No automated test suite was requested or run. No agent test accounts or messages
were created. Normal deployment startup health is not messaging, clean-host or
recovery acceptance. Calls/TURN, SFU and external push hosting are not configured.
No end-to-end encryption is added to Tinode.
