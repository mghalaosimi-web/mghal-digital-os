# Postiz source integration

The Postiz application source is included as a pinned Git submodule at `integrations/postiz`.

- Source repository: https://github.com/mghalaosimi-web/mghal-digital-automation
- Pinned source commit: `e94383568f7549c373a985f4521021c4353e1a37`
- Resolved source tree: `c5d1e7a5387ccf8c3680dd2d4401c781dc2df5fa`
- Audited tree size: 1,181 entries (recursive Git tree; not truncated).
- License: GNU AGPL-3.0; the source tree contains its original `LICENSE` and `.env.example`.
- Architecture: pnpm monorepo with Next.js frontend, NestJS backend, Prisma/PostgreSQL, Temporal orchestration, and a browser extension.

## Nested Git dependency audit

The source repository's `.gitmodules` declares `libraries/plugins/src/list/public-api` using `git@github.com:gitroomhq/public-api.git`. However, the exact pinned commit's recursive tree contains neither that path nor any gitlink (mode `160000`). This is a stale or unused declaration in the pinned source revision, not a checked-out nested submodule. Recheck it if the source commit is upgraded. No SSH key or credential should be stored in this repository.

## Clone the source

```bash
git clone --recurse-submodules https://github.com/mghalaosimi-web/mghal-digital-os.git
```

If the main repository is already cloned:

```bash
git submodule update --init --recursive
```

## Deployment boundary

The root MGHAL Digital OS remains the deployed application. Postiz is a separate multi-service monorepo, not a drop-in Next.js package. Its compose stack includes the Postiz application, PostgreSQL, Redis, Temporal, Temporal PostgreSQL, Elasticsearch, and supporting Temporal services. It requires its own Node/pnpm toolchain, database schema, backend, frontend, orchestration, persistent storage, and provider configuration.

Do not run Postiz's `prisma-db-push` or reset scripts against the MGHAL production database. Do not replace the current Render build/start commands with Postiz commands. The source's `.env.example` is a configuration template only: Cloudflare R2, OAuth, AI, payment, email, and other provider values are not configured by including the source. Keep MGHAL independent of Postiz services until a separately resourced and tested deployment design exists. No paid service or new paid resource is authorized by this source import.

## AGPL-3.0 obligations

Preserve the source copyright and license notices. If a modified version is operated as a network service, provide users the corresponding source of that modified version as required by AGPL-3.0. Keep Postiz changes in its own source history and update this pinned reference only when intentionally adopting a reviewed change.
