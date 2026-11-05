# Postiz source integration

The complete Postiz application source is included as a pinned Git submodule at `integrations/postiz`.

- Upstream-derived repository: https://github.com/mghalaosimi-web/mghal-digital-automation
- Pinned source commit: `e94383568f7549c373a985f4521021c4353e1a37`
- License: GNU AGPL-3.0
- Source architecture: pnpm monorepo with Next.js frontend, NestJS backend, Prisma/PostgreSQL, Temporal orchestration, and a browser extension.

## Clone the complete source

```bash
git clone --recurse-submodules https://github.com/mghalaosimi-web/mghal-digital-os.git
```

If the main repository is already cloned:

```bash
git submodule update --init --recursive
```

## Deployment boundary

The root MGHAL Digital OS remains the deployed application. The Postiz source is intentionally isolated in its own submodule because it is a separate multi-service monorepo and must not be treated as a drop-in Next.js package. It requires its own Node/pnpm toolchain, PostgreSQL schema, backend, frontend, Temporal services, and provider configuration. Do not run its `prisma-db-push` or reset scripts against the MGHAL production database.

## AGPL-3.0 obligations

This source remains under AGPL-3.0. Preserve its copyright and license notices. If a modified version is operated as a network service, provide users the corresponding source of that modified version as required by AGPL-3.0. Keep changes to the submodule committed in its source repository and update this pinned reference when intentionally adopting them.
