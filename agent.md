# Agent instructions

## Vercel access (agents: read this first)

This project deploys to Vercel via **agent automation** — no interactive login needed:

1. Token file: `.env.vercel` at repo root (gitignored). Format:
   `VERCEL_TOKEN=<token>`
2. Auth pattern: `curl -s -H "Authorization: Bearer $(grep ^VERCEL_TOKEN= .env.vercel | cut -d= -f2)" https://api.vercel.com/...`
   or export it: `export VERCEL_TOKEN=$(grep ^VERCEL_TOKEN= .env.vercel | cut -d= -f2)`
3. **This project on Vercel:** name `nexus-mvp` (id `prj_cQPxk1l7l2KBaQiPSrc1aQISY9aH`), team id `team_N5idOJlO1oMP54wXhPZsaDQM`.
4. Build config is committed in `vercel.json` at repo root: `cd app && npm ci`, `cd app && npm run build`, output `app/dist`. Deploy from root (do not set Root Directory in the dashboard; `vercel.json` overrides dashboard settings).
5. Deployments are git-integrated with `tohin003/ Nexus-MVP` (branch `main`). Normal flow = push to `main`, Vercel builds automatically. For a manual deploy, use the API (`POST /v13/deployments`) or the CLI with `--token` from `.env.vercel`.
6. **Env vars:** project has none configured and the app needs none (browser-local demo). If a future feature needs one, set it agent-side via `POST /v9/projects/{id}/env` (or CLI `vercel env add NAME value` with `--token`), then redeploy to apply.
7. Agent safety rules:
   - Never print, log, or commit the token. Never copy it into any committed file. `.env.vercel` must stay gitignored — verify with `git check-ignore .env.vercel` before any `git add`.
   - Never run `git add -A`/`-A` staging blindly — always review `git status` first; this repo is public.
   - `app/public/avatars/Prince.jpeg` is intentionally untracked (unreferenced personal-looking image, public repo). Do not commit it without the owner's explicit instruction.
   - Rotate the token in the Vercel dashboard and update `.env.vercel` if it may have leaked (it was shared in plain chat once).

## Verified deployment root-directory fix (2026-09-17)

Earlier diagnosis blaming `npm ci --prefix` was incorrect. Actual deployment logs showed
`cd: app: No such file or directory` because Vercel project `rootDirectory` was `app`.
The project was patched with `{ "rootDirectory": null }` (empty string is invalid).
The root-level `vercel.json` commands now run from the repository root as intended.
Do not assume `vercel.json` overrides `rootDirectory`; inspect project settings.
Deployment `dpl_AgppYreCoW7bMxMYyFG9EDtbHfFE` reached READY/PROMOTED and
https://nexus-mvp-eta.vercel.app/ returned HTTP 200 after this correction.

## Neon provisioning checkpoint

Dedicated **Free** resource `nexus-testers` created for this project only:
- Integration configuration: `icfg_9Ag5hE8THC34CvQmpRg99yHj`
- Vercel store: `store_KSpkRLpk8PPwP2g8`
- External Neon resource: `hidden-dust-79137519`, region `iad1`
- Plan: `free_v3`, no payment method required. Do not create duplicates or upgrade billing.
- **Connected (2026-09-17):** `POST /v1/storage/stores/{storeId}/connections` with body
  `{ projectId, envVarEnvironments: ["production","preview","development"], type: "integration" }`
  → HTTP 201. Env vars (DATABASE_URL etc., 16 keys) injected into all environments.
- Note: the original `nexus-mvp` project (prj_cQPx…) was deleted outside this session;
  the live project is **nexus-mvp-46rx** (`prj_3s4pHLMzKc007WfJJ36fXf4HStZJ`, domain
  `nexus-mvp-46rx.vercel.app`, same GitHub repo). Owner confirmed using it.
- **Deployment Protection (SSO) disabled** via `PATCH /v9/projects/{id}` `{ "ssoProtection": null }`
  — it 302'd API paths to `vercel.com/sso-api`, which read as hangs from curl.
- **CRITICAL API lesson:** serverless handlers MUST use the Node `(request, response)`
  signature and `res.end(...)`. Returning a Web `Response` from a default export leaves
  connections unanswered forever (log warning "default export returned a `Response`").
- Schema: `npm run db:migrate` (root; `scripts/schema.sql`, idempotent, 20 tables).
  `DATABASE_URL` is readable via the API (`/v1/projects/{id}/env/{envId}`) — never print it.
- API acceptance: `node scripts/check-api.mjs` (18 checks, live DB, no server needed).

## Backend phase status (2026-09-17)

- **Live:** `/api/health`, `/api/ping`, `/api/auth/signup|signin|signout|me` — verified on
  production (signup→me→duplicate 409→signin→signout→401, all green over HTTPS).
- **Next (see BACKEND_PLAN.md):** people/feed/intents/posts/circles/messages endpoints with
  server-side ACL (blocks, privacy, circle membership), demo-persona isolation, then the
  client adapter (`VITE_API_MODE`). Demo/localStorage mode remains the default UI path.
---

The app is a browser-local demo: no backend, no env vars required.
