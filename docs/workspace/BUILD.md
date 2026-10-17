# Local Windows build

Use Windows x64, Go 1.27+, Node 26/npm, Python 3.9+ and enough free build space.
No Docker or GitHub Actions is required. A complete first build needs Internet
access to download the pinned modules, npm packages and PostgreSQL runtime.

```powershell
python scripts/workspace/build.py --cache I:/Builds/Chat --go go
```

`dist/Chat.exe` is the portable entry point. Its embedded archive contains the
private PostgreSQL software, Tinode schema utility and locally bundled client.
Running it requires a separate protected NTFS data folder. No personal data,
default credentials, identity-provider secret or demo accounts enter the build.

The `postgres,workspace` build tags include PostgreSQL and One Workspace hosting.
Unconfigured cloud push/S3/SMS integrations are omitted from this build, with
their original source retained for upstream/full builds. Plain upstream builds
do not enter the Windows One Workspace launcher.

`workspace/client` contains the exact vendored webapp source and modifications.
`workspace-components.lock.json` records both upstream commits and the database
archive hash. `package-lock.json` and `go.sum` pin library downloads. The AUI
connection screen is compiled by `npm run workspace:ui`; do not edit its generated
JSX directly. The component adapter supplies the One Workspace theme.

If a slow checkout drive makes browser extraction expensive, copy the client
source to one named NTFS build folder and use `--client-build <folder>`. Preserve
the lockfile, generated connection source and outputs in the checkout/artifact
storage before removing that task-owned build folder. `--skip-client` reuses an
already completed browser build; it must not be used on an incomplete directory.

Distribute the corresponding source archive, root GPL license, web client Apache
license, PostgreSQL notices, dependency license inventory and checksums with the
executable. Build success does not claim messaging or recovery acceptance.
