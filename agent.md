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

## Why npm ci --prefix fails here (learned 2026-09-17)

`npm ci --prefix app` fails on Vercel even with a committed lockfile — npm resolves the
lockfile relative to CWD, not `--prefix`. Always use `cd app && npm ci`. Same for build.
This is committed in `vercel.json`; keep it that way.
---

The app is a browser-local demo: no backend, no env vars required.
