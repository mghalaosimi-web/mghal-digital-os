# Production Operations Runbook

This runbook describes the current single-owner deployment. It does not imply that social publishing, background workers, or multi-user authorization are implemented.

## 1. Owner login

The login field accepts the exact value configured as `OWNER_API_TOKEN` on the Render web service.

- The value must contain 32–512 characters.
- A 23-character value is invalid; the UI correctly asks for 9 more characters.
- Appending arbitrary characters to an old key will not work. The submitted value must exactly match the server value.
- Never put the key in source control, a browser-visible `NEXT_PUBLIC_*` variable, screenshots, logs, or chat messages.

If the current key is unavailable, generate a new one on a trusted local machine:

```bash
openssl rand -base64 48
```

Then open the Render service's Environment page, replace `OWNER_API_TOKEN` with the newly generated value, save, and wait for the deployment/restart to finish. Keep the generated value in a password manager. Enter that exact value in the login screen.

Do not rotate the key while relying on an existing login session: after rotation, sign in again with the new value. A rotation invalidates the ability to create new sessions with the old key.

## 2. Required and optional environment

| Variable | Requirement | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Required | Neon PostgreSQL connection string |
| `OWNER_API_TOKEN` | Required | Single-owner login secret, 32–512 characters |
| `UPSTASH_REDIS_REST_URL` | Required in production | Login rate-limit Redis endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Required in production | Redis REST credential |
| `OPENAI_API_KEY` | Optional | Server-side AI draft generation |
| `OPENAI_MODEL` | Optional | Model identifier used by draft generation |

Never expose any secret in client code or commit it to the repository.

## 3. Post-deploy checks

Run these checks after a deployment or environment change:

1. `GET /api/health` should return HTTP 200.
2. `GET /api/ready` should return HTTP 200 and report the database and Redis login rate limiter as reachable, with owner authentication configured. Readiness now performs a live Redis PING; configured-but-unreachable Redis returns HTTP 503.
3. Open the application and authenticate with the exact current `OWNER_API_TOKEN`.
4. Create a workspace, project, task, knowledge item, and content draft.
5. Edit and delete test records; verify that activity appears in the workspace dashboard.
6. Create a scheduled content item with a future date, edit its title without changing the date, then move it out of SCHEDULED and verify that its schedule date is cleared.

A successful deployment alone is not proof that all integrations work. Check runtime responses and logs without printing secrets.

## 4. Known product boundaries

- Authentication is currently a single-owner token gate, not multi-user identity or role-based access control.
- AI generation only creates a draft. It does not publish content.
- Editorial scheduling stores dates and displays them in the calendar; it is not yet a background publishing worker.
- Social publishing requires provider OAuth applications, approved scopes, and secure credentials.
- Backups, restore drills, end-to-end tests, monitoring, and a durable worker/retry system remain launch requirements.
- The Render service currently uses the Free plan and may sleep when idle.

## 5. Incident handling

- **Login says the key is too short:** use a key of at least 32 characters; do not pad the old value.
- **Login returns 401:** the submitted key does not exactly match the configured server key.
- **Login returns 503:** verify the owner token configuration and Redis rate-limit service availability.
- **Readiness returns 503:** verify the Neon connection string and database reachability.
- **AI generation returns 503:** configure the optional OpenAI environment variables.
- **AI generation returns 429:** inspect provider quota/billing; do not retry in a tight loop.
