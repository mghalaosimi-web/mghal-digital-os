# Production Operations Runbook

This runbook describes the currently deployed single-owner application. It does not imply that multi-user authorization, social publishing, file storage, or background workers are complete.

## 1. Owner login

The login field accepts the exact value configured as `OWNER_API_TOKEN` on the Render web service.

- Accepted length: 32–512 characters.
- The browser trims accidental whitespace around the pasted value; the secret itself must still match the server value exactly.
- A longer key is valid if it matches the configured value. Length alone does not prove that it is the correct key.
- Never put the key in source control, a browser-visible `NEXT_PUBLIC_*` variable, screenshots, logs, or chat messages.
- Do not rotate a working key unless there is a security reason or the owner explicitly requests rotation.

If login returns 401, the submitted value differs from the server value. Check that the clipboard contains the intended key and paste that exact value. Do not append characters or pad an existing key.

## 2. Required and optional environment

| Variable | Requirement | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Required | Neon PostgreSQL connection string |
| `OWNER_API_TOKEN` | Required | Single-owner login secret, 32–512 characters |
| `UPSTASH_REDIS_REST_URL` | Required in production | Login rate-limit Redis endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Required in production | Redis REST credential |
| `AI_API_KEY` or `OPENAI_API_KEY` | Optional | Server-side AI draft generation |
| `AI_MODEL` or `OPENAI_MODEL` | Optional | Model identifier |
| `AI_BASE_URL` | Optional | OpenAI-compatible API base URL |

Never expose secrets in client code or commit them to the repository.

## 3. Post-deploy checks

1. `GET /api/health` should return HTTP 200 for process liveness.
2. `GET /api/ready` should return HTTP 200 only when the owner token is configured and PostgreSQL and Redis are reachable.
3. Open the application and authenticate with the exact current `OWNER_API_TOKEN`.
4. Create a workspace, project, task, knowledge item, and content draft.
5. Edit and delete test records; verify that activity appears in the workspace dashboard.
6. Create a scheduled content item with a future date, edit its title without changing the date, then move it out of SCHEDULED and verify that its schedule date is cleared.

A successful deployment alone is not proof that all integrations work. Check runtime responses and logs without printing secrets.

## 4. Known product boundaries

- Authentication is currently a single-owner token gate, not multi-user identity or role-based access control.
- UserSession and WorkspaceInvitation tables exist, but registration, session management, and invitation workflows are not implemented.
- AI generation creates a draft only. It does not publish content.
- Content-channel variants have API and UI code, but the `ContentVariant` table is not present in the current production database. Variant endpoints return HTTP 503 with `CONTENT_VARIANTS_MIGRATION_REQUIRED` until a reviewed production migration is completed. Do not work around this with `prisma db push` or ad-hoc production SQL.
- Editorial scheduling stores dates and displays them in the calendar; it is not yet a background publishing worker.
- Social publishing requires provider OAuth applications, approved scopes, and secure credentials.
- Durable file storage, backups, restore drills, end-to-end tests, monitoring, and a worker/retry system remain launch requirements.
- The Render service uses the Free plan and may sleep when idle.

## 5. Incident handling

- **Login says the key is too short:** use a key of at least 32 characters; do not pad an old value.
- **Login returns 401:** the submitted key does not exactly match the configured server key.
- **Login returns 403:** inspect request origin and forwarded-host handling; do not disable origin validation as a workaround.
- **Login returns 503:** verify owner-token configuration and Redis rate-limit availability.
- **Readiness returns 503:** verify the Neon connection and Redis reachability.
- **AI generation returns 503:** configure the optional AI provider variables.
- **AI generation returns 429:** inspect provider quota; do not retry in a tight loop.
