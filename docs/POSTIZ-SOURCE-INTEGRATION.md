# Postiz source integration

The Postiz application source is included as a pinned Git submodule at `integrations/postiz`.

- Source repository: https://github.com/mghalaosimi-web/mghal-digital-automation
- Pinned source commit: `e94383568f7549c373a985f4521021c4353e1a37`
- Resolved source tree: `c5d1e7a5387ccf8c3680dd2d4401c781dc2df5fa`
- Audited tree size: 1,181 entries (recursive Git tree; not truncated).
- License: GNU AGPL-3.0; the source tree contains its original `LICENSE` and `.env.example`.
- Architecture: pnpm monorepo with Next.js frontend, NestJS backend, Prisma/PostgreSQL, Temporal orchestration, and a browser extension.

The source tree also declares a nested `.gitmodules` entry for `libraries/plugins/src/list/public-api` using an SSH URL (`git@github.com:gitroomhq/public-api.git`). The pinned recursive tree did not expose a gitlink for that path, so verify its access and checkout before attempting a complete Postiz build. Do not put SSH keys or credentials in this repository.

## Clone the source

```bash
git clone --recurse-submodules https://github.com/mghalaosimi-web/mghal-digital-os.git
```

If the main repository is already cloned:

```bash
git submodule update --init --recursive
```

If the nested SSH dependency fails to clone, verify repository access and configure a secure local Git URL rewrite to HTTPS where supported; do not embed credentials in the URL or commit credentials.

## Deployment boundary

The root MGHAL Digital OS remains the deployed application. Postiz is a separate multi-service monorepo, not a drop-in Next.js package. It requires its own Node/pnpm toolchain, PostgreSQL schema, backend, frontend, Temporal services, and provider configuration. Do not run its `prisma-db-push` or reset scripts against the MGHAL production database.

The source's `.env.example` is a configuration template only. Its Cloudflare R2, OAuth, AI, payment, email, and other provider values are not configured by including the source. Do not copy credentials or production environment values between the two applications. Keep MGHAL independent of Postiz services until a separately tested deployment design exists.

## AGPL-3.0 obligations

Preserve the source copyright and license notices. If a modified version is operated as a network service, provide users the corresponding source of that modified version as required by AGPL-3.0. Keep Postiz changes in its own source history and update this pinned reference only when intentionally adopting a reviewed change.
