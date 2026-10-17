<div align="center">
<img src="docs/workspace/my_chat.svg" alt="Chat logo" width="112" height="112">
<h1>Chat</h1>
<p>Your conversations, together.</p>
<p><a href="https://github.com/oneworkspacestudio/chat/releases">Download for Windows</a> Â· <a href="docs/workspace/HOSTING.md">Hosting guide</a></p>
</div>

Chat is the One Workspace messaging app, built from [Tinode](https://github.com/tinode/chat)
and its [web client](https://github.com/tinode/webapp). It brings direct messages,
group conversations, message history and file attachments into your workspace.

## One account, connected conversations

Open Chat from One Workspace to reuse MyAccounts sign-in. There is no separate
Chat username or password. Each person gets a Chat identity on their first sign-in.
The client uses the One Workspace design system and a matching navy, mint and
silver icon. Browser libraries, translations and the icon font are served locally.

## Windows without Docker

Run Chat.exe. It manages Tinode and a private PostgreSQL runtime automatically.
With One Workspace, the installer supplies the protected data folder and registers
its own MyAccounts OIDC client. Standalone deployment uses the same executable
with a configured MyAccounts issuer and registered client; see the hosting guide.

Messages remain in PostgreSQL files under your chosen protected data folder.
Attachments remain ordinary files beside that database. No hosted Tinode account
or cloud database is required. One executable starts the app; it extracts bundled
runtime software on first use, so it is not a zero-file executable.

## Build locally

See [BUILD.md](docs/workspace/BUILD.md). Source includes the exact vendored web
client and modifications; dependency versions and database hashes are pinned.
GitHub Actions are disabled.

## Preview scope

Current version: 0.1.0-preview.2. See [acceptance scope](docs/workspace/ACCEPTANCE.md).
Do not infer production, mobile, call-hosting or recovery acceptance from a build.
Chat does not add end-to-end encryption to Tinode.

## Licenses and upstream

Tinode server: GPL-3.0. Web client: Apache-2.0. PostgreSQL and bundled dependency
licenses remain included. [Notices](NOTICE) Â· [upstream README](UPSTREAM-README.md).
The upstream projects are credited; this fork is maintained by One Workspace Studio.
