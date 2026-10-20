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
connection, people-search and ID screens is compiled by `npm run workspace:ui`; do not edit its generated
JSX directly. The component adapter supplies the One Workspace theme.

If a slow checkout drive makes browser extraction expensive, copy the client
source to one named NTFS build folder and use `--client-build <folder>`. Preserve
the lockfile, generated AUI screen sources and outputs in the checkout/artifact
storage before removing that task-owned build folder. `--skip-client` reuses an
already completed browser build; it must not be used on an incomplete directory.

Distribute the corresponding source archive, root GPL license, web client Apache
license, PostgreSQL notices, dependency license inventory and checksums with the
executable. Build success does not claim messaging or recovery acceptance.

## Candidate acceptance and source mapping

`--release` requires a clean committed checkout and checks that any NTFS client
build copy matches its source. The receipt records the source commit and dirty
state. Build from the intended commit, generate AUI, preserve generated sources,
and run acceptance against the resulting packaged bytes before publishing.

`browser-acceptance.cjs`, `parity-acceptance.cjs` and `ui-acceptance.cjs` require
an isolated native MyAccounts/Chat installation and synthetic `example.test`
accounts. Credentials stay in its protected NTFS fixture, outside the repository.
Use the test fixture variables documented in each harness, never owner data.

`workspace/crypto` is a separately built OpenMLS proof, not part of Chat.exe.
Its Cargo.lock pins dependencies. Build its library natively and as
`wasm32-unknown-unknown`, then use the matching wasm-bindgen CLI (the exact version
in Cargo.lock) for web bindings. `cargo test --locked` checks the proof and
`cargo build --locked --bin protocol-proof` builds the synthetic stdin/stdout
interop helper. `crypto-interop.cjs` connects that actual Windows process to a
real browser WASM client. Set `CHAT_CRYPTO_PROOF_ROOT` to the proof artifact
folder and `PLAYWRIGHT_MODULE` to your local Playwright installation. Signing,
native mobile clients and production device/keystore/recovery are not implied.

`manual-retry-acceptance.cjs` uses two real synthetic browser sessions, deliberately
drops only a real successful server ACK, and exercises the actual message Retry
menu after timeout. It asserts the original durable ID, a fresh wire request ID,
and exactly one recipient message after reload. No successful backend response is
mocked. Use the same isolated loopback fixture variables as the other harnesses.

`topic-id-loading-acceptance.cjs` delays a real login ACK3s (below the SDK5s
timeout), checks pending actions and compares rendered QR pixels against the
actual ID. Set CHAT_QRCODE_MODULE when dependencies live in an NTFS mirror.
`navigation-acceptance.cjs` delays ordered real server frames and leaves the
conversation before data-end/leave completion, then tests rapid re-entry.
Run the controller/lifecycle unit scripts against the actual controller source;
CHAT_BABEL_MODULE and CHAT_BABEL_MODULES_PLUGIN support dependency mirrors.

Native managed engine tests need the workspacetest tag to suppress launcher init:
`go test -tags postgres,workspace,workspacetest ./workspace ./server ./server/store ./server/db/postgres`.
Use a named NTFS GOTMPDIR for Windows ACL-dependent tests; build/download caches
may stay on another drive. Omitting workspacetest invokes launcher flag parsing,
which is not a successful engine test.
