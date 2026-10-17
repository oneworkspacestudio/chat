# Initial One Workspace Chat

## Request and source
Owner requested a Tinode fork in oneworkspacestudio, One Workspace styling/icon,
MyAccounts login and installer integration. Created public fork chat from
tinode/chat at eb90ef83acae6542f52719377ee5a76d267a5618. Vendored webapp source at
670717633c5218d7e9115038ab96f87e847e621b under workspace/client, with Apache notices.
Actions disabled before pushing changes. Build locally only.

## Implementation
Single Chat.exe supervises the same executable's native Tinode engine and private
PostgreSQL18.6 runtime plus tinode-db.exe. No Docker/service/database installation.
The PostgreSQL Maven archive SHA256 is pinned in workspace-components.lock.json.
Protected NTFS data folder, machine DPAPI keys, randomized local database password
and ephemeral loopback backend ports. Extracted runtime is content-addressed and
Windows jobs own descendants. PostgreSQL WAL retained; no restore acceptance yet.

Dedicated OIDC client: state/nonce/PKCE, verified ID-token issuer/audience/expiry.
App sessions are HttpOnly/path-scoped; native engine tickets last one minute and
are single-use, signed per installation. Server maps issuer+subject through a
unique native auth record; verified email only supplies discovery tags. Basic/anon
registration disabled. Keep native token handler enabled: Tinode uses it internally
when completing a login. Gateway sessions protect transport and attachments, enforce
browser Origin and cancel connections on logout/expiry. No provider token goes to
the client. Browser token/cache persistence disabled for shared-device isolation.

Client retains Tinode features with separate Workspace CSS tokens, a matching
navy/mint/silver SVG, local React/i18n/font assets and no CDN requirement. Connection
screen authored with write-aui-ui, compiled deterministically with parser0.2.1;
manual changes belong in .aui/adapter, not generated JSX. Optional cloud push, S3
and SMS adapters omitted only under workspace build tag; original source retained.

Workspace integration adds app ID chat, Chat.exe, /chat route, /chat/auth/callback,
port base+16, per-app folder, SSO launch/probe/logout cookie cleanup, org update
group, installer selection/build parameters and README icon/table/guide. Existing
optional app omissions remain respected by updates; adding a newly released app
uses installer app selection. Other apps and owner live suite have not been used
as development fixtures.

## Build and evidence boundary
Workspace manager Go compilation and Chat Go compilation passed; browser production
bundle compiled with webpack size warnings only. No automated or multi-user tests
were requested/run. Message, attachment, reconnection, lifecycle and restore
acceptance remain pending. Initial release is a preview, not production.
Source and licensing inventories retained; no credentials/private user data.

Main build/download/output roots are tooling/chat-build on I. Initial npm/PG
extraction on exFAT was slow; named NTFS C:/Projects/.cache/chat-build contains
only disposable client build/npm cache. Browser output and generated source have
been preserved on I. Remove that exact NTFS cache only after path/process checks;
never touch owner data or unrelated build roots. No app preview was started.
Final executable packaging, publication, installer bundle and cleanup receipts
will be appended after completion. Do not claim a planned/uploaded asset published.

## Preview2 integration review fix

Preview1 was published with12 verified assets, before any owner deployment.
Final source review found Tinode's generic localStorage keys could collide with
other apps on the Workspace origin. Preview2 prefixes every preference key with
oneworkspace.chat., ignores malformed cached JSON and uses the same helper for
removal. Persistent auth/message cache remains disabled. No live owner browser
was used as a test fixture and no runtime acceptance is claimed. Workspace33
must pin preview2, not the superseded initial component. Preserve published
preview1 assets; do not retag/replace them. Build/update receipts to be appended.

The preview2 gateway also sandboxes direct attachment responses (HTML/SVG cannot
execute scripts on the shared Workspace origin). Workspace33 explicitly calls
Chat's own loopback logout using only the Chat cookie before clearing suite
cookies, cancelling upgraded connections; clearing a cookie alone is insufficient.
These are implementation/source-review fixes, not passed runtime acceptance.

## Actual installation startup correction / preview3

Preview2 published with12 verified assets. Owner-requested app installation used
the supported stopped-state install-apps flow after a cold Accounts/config backup;
existing executable bytes and data retained. First native startup failed after
PostgreSQL initialization/schema116 because Tinode push.Init unmarshals missing
push JSON and rejects nil. No Chat user/login/message was created.

Preview3 explicitly generates push:[] when notifications are disabled. Other
optional native config initializers were inspected (video/plugins accept absence).
Do not patch generated engine.json only; all new installs need this source fix.

Workspace33 draft416008298 withheld; uploader stopped before publication, assets
and tag remain historical. Temporarily removed only Chat app definition from
installed33 catalog to restore13 existing apps; Chat software/data and new OIDC
client retained, no Account backup restored/overwritten. Workspace health200/ready.
Do not use this owner install as a development fixture; this was the authorized
actual app deployment. No automated/multi-user/messaging acceptance claimed.
Target componentv0.1.0-preview.3 and full Workspacepreview34. Preserve all owner
backups and partial Chat data; no data deletion or identity reset.

## Corrected actual installation now running

Supported install-apps deployment of Workspace34/Chat preview3 completed after
a second cold Accounts/config/program backup. All14 app definitions present;
normal startup reaches ready and Chat's gateway health passes. Previous logical
credentials, app executable versions, suite settings and Vault origin/certificate
verified retained. Existing Chat keys/database and the registered OIDC client were
reused. No cold Account backup was restored over current owner data. No agent test
accounts/messages, browser identity flows, multi-user messaging, uploads or
recovery exercise performed. Health/startup evidence is not full acceptance.

Receipts/scripts: tooling/workspace-chat-release34/deployment.json and protected
private maintenance directories; component artifacts tooling/chat-build-preview3.
Final source: Chat260f138c0d19d6c7b2d75e796dc493b08680ca1b; suite387694983fd53df82790ce40edcaf62f737155ec.
Chat ZIP SHA256a0615356e0dca35c3c80bbd9d5f733eded0847bf7fb43f1b1f8f25d2adebaba8;
Workspace bundle SHA2562bc6f97fb049974b701f786624582f0c0ecb7e1c7d69e814ad207a89ed8c3fb6.
Installer SHA256bb518ad842fe7ba854fa0f901e8c0ef0fc6b22f956b918ddd5302ad0e3fdd75c.
Public release uploads still pending at this handoff edit; append confirmation
after every remote asset is verified and the drafts are published. Actions stay
disabled. Do not commit completion documentation while publisher HEAD checks run.

Named NTFS browser build cache removed after both builds with source/output hash,
reparse and process checks. No fixture service/tunnel left running. Only intended
installed suite services run. C free space fluctuated during large local builds;
read-only pagefile/process diagnostics only, no system-memory settings changed
and no owner data/unknown caches or backups removed.

## Preview3 publication confirmed

Published v0.1.0-preview.3 from260f138c0d19d6c7b2d75e796dc493b08680ca1b with12
assets; all returned GitHub SHA256 digests/sizes match packaging receipts. Public
anonymous metadata/download checks passed. Earlier previews1/2 retained and
clearly marked superseded with the startup issue and preview3 link. No Actions.
Updated public acceptance matrix records actual startup separately from pending
browser OIDC, messaging, attachments, lifecycle, clean-host and restore acceptance.
This documentation-only completion commit does not retag or replace binaries.
