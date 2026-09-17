# NEXUS Backend Migration Plan — Neon Postgres on Vercel (researched 2026, no app code changed)

Repo: `tohin003/Nexus-MVP` · deployed https://nexus-mvp-eta.vercel.app · current state: React 19 + Vite static SPA, **all data in localStorage** (`app/src/repo/db.ts`, Zustand vanilla store, key `nexus-mvp-state-v1`, whole-state persistence + whole-state read hooks in `app/src/repo/store.ts`), mutations in `app/src/services/repo.ts` (synchronous, client-side permission checks), seed in `app/src/data/seed.ts` (21 personas, intents, posts, circles, conversations, stories). No backend, no auth, team has **no database connected** (verified via API: no envs).

Current deploy config (`vercel.json`, repo root): `framework: "vite"`, `installCommand: "cd app && npm ci"`, `buildCommand: "cd app && npm run build"`, `outputDirectory: "app/dist"`. Client router is **hash-based** (`app/src/routerStore.ts`) — no server routes needed for the SPA.

Goal: a few dozen real tester users, premium UX, "industry level", Neon Postgres via the Vercel integration, frontend + API in **one Vercel project**, demo-first behavior preserved.

> Sources were fetched live from official docs (Vercel + Neon, `.md` mirrors fetch completely; HTML pages truncate). Anything not confirmable on an official page is marked **UNVERIFIED**. Full URL list at the end.

---

## 1. Vercel + Neon marketplace mechanics (2026)

### 1.1 Installation (dashboard)
- Vercel-managed (native) Neon integration: open **https://vercel.com/marketplace/neon** → Install → *Create New Neon Account* (or link an existing Neon org as `Vercel:<team-name>`) → accept terms → choose **region + plan + database name** → Storage tab → *Connect Project* → pick project + environments (Development / Preview / Production) → Connect. Optional env-var prefix. Billing is Vercel-managed; management stays dashboard-only on Neon's side. (source: https://neon.com/docs/guides/vercel-managed-integration — fetched)
- Two variants exist: **Neon-managed** (links your Neon account, bills Neon) and **Vercel-managed** (native marketplace, bills Vercel). Both give copy-on-write preview branches. Do **not** use both automated integrations on the same project. (source: https://neon.com/docs/guides/vercel-overview — fetched by research subagent)
- Preview branching (optional, per project connection): *Advanced Options → Deployments Configuration → Preview*: enable “Required → Preview” and “Resource must be active before deployment”. Pushes create a Neon branch `preview/<git-branch>`; branch-specific env vars are **injected at deployment time and are NOT visible in the project’s Environment Variables settings**. Cleanup: Vercel-managed deletes the branch when the corresponding **Vercel deployment** is deleted (default preview retention ≈ 6 months) — not on Git branch deletion; Neon-managed cleanup runs on the next preview after Git branch deletion. This matters: **Free plan = 10 branches/project.** (sources: neon.com/docs/guides/vercel-managed-integration, neon.com/docs/guides/neon-managed-vercel-integration — fetched)

### 1.2 Programmatic provisioning with a Vercel token (agent-friendly)
Verified against current REST API docs (page `last_updated 2026-09-17`):
- **Create a marketplace storage resource**: `POST https://api.vercel.com/v1/storage/stores/integration/direct?teamId=…` (Bearer token). Body: `name` (≤128), `integrationConfigurationId` (`icfg_…`, from `GET /v1/integrations/configurations`), `integrationProductIdOrSlug` (`iap_…` or slug, from `GET /v1/integrations/configuration/{id}/products`). Optional: `metadata`, `externalId`, `protocolSettings`, `source` (default `marketplace`), `billingPlanId` — **omit to auto-discover free plans** — plus `paymentMethodId` (optional, default payment method) and `prepaymentAmountCents` (≥ 50, only for variable-amount prepayment plans). **HTTP 402 = missing payment method** for paid plans. (source: https://vercel.com/docs/rest-api/integrations/create-integration-store-free-and-paid-plans — fetched directly)
- **Connect the resource to a project**: `POST https://api.vercel.com/v1/integrations/installations/{integrationConfigurationId}/resources/{resourceId}/connections` (Bearer). Body: `projectId` (required), optional `envVarEnvironments` array (`production`/`preview`/`development`/`custom`) and `makeEnvVarsSensitive`. Returns 201. (source: https://vercel.com/docs/rest-api/integrations/connect-integration-resource-to-project — fetched by research subagent)
- Environment variable *reading* (not re-sync) is `GET /v10/projects/{idOrName}/env` (single-value decrypt: `GET /v1/projects/{idOrName}/env/{id}`), per current REST API index. (source: https://vercel.com/docs/rest-api — fetched)
- **What an agent can and cannot do end-to-end:** with an existing Neon installation/configuration, a token can create resources, auto-pick the free plan, and connect them to the project without dashboard clicks. The **first-time installation/authorization** of the Neon integration with only a bare token (no dashboard, no OAuth “Add to Vercel” consent) is **UNVERIFIED** — assume one manual dashboard click-through for the initial install; everything after that is automatable. The older `POST /v1/storage` / “create integration datastore” endpoints do **not** appear in the current API index; their status is **UNVERIFIED** — do not build against them. There is no documented provider→project “re-sync env vars” endpoint; re-reading env refs is not the same as re-sync (deleting the project connection and reconnecting re-syncs — **UNVERIFIED** behavior, use dashboard if rotation needed).

### 1.3 Env vars injected by the Neon integration
Per Neon’s current Vercel-integration docs (fetched):

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | **Pooled** connection string (PgBouncer; host contains `-pooler`) — use for app/functions |
| `DATABASE_URL_UNPOOLED` | Direct connection (no `-pooler`) — use for migrations / `pg_dump` / session features |
| `PGHOST`, `PGHOST_UNPOOLED`, `PGUSER`, `PGDATABASE`, `PGPASSWORD` | Component vars (PGHOST = pooled host) |
| `POSTGRES_*` | Legacy aliases kept for backward compatibility (exact current alias list **UNVERIFIED** on fetched page) |
| `NEON_AUTH_BASE_URL`, `VITE_NEON_AUTH_URL` | Only if Neon Auth is enabled |

Shape (illustrative, exact region/host per project): `postgresql://<role>:<password>@ep-<id>-pooler.<region>.aws.neon.tech/<dbname>?sslmode=require`. Prefix is configurable in the integration UI. Preview-branch credentials are per-deployment and not stored/viewable in project env settings.

### 1.4 Neon Free plan limits (current, verified) — sized for a few dozen testers
(source: https://neon.com/docs/introduction/plans + https://neon.com/pricing + https://neon.com/docs/introduction/scale-to-zero + https://neon.com/docs/connect/connection-pooling — all fetched)

| Limit | Free plan value | Fit for NEXUS testers |
|---|---|---|
| Projects | 100 | fine |
| Branches | 10/project | disable auto preview-branching or prune aggressively |
| Compute | **100 CU-hours/project/month** (0.25 CU × 400 h) | bursty tester traffic after 5-min scale-to-zero ≈ tens of CU-hours — fits |
| Autoscaling | up to 2 CU (8 GB RAM) | fine |
| Storage | **0.5 GB/project** | text-only rows trivially fit; **photos must NOT go in Postgres** (use Vercel Blob) |
| Egress | 5 GB/project/month | fine for text; watch image traffic (served from Blob, not Neon) |
| Scale to zero | after 5 min idle, **cannot disable** on Free | cold start per idle wake (few hundred ms, not an SLA) |
| History/PITR | 6 hours, ≤ 1 GB-month; 1 manual snapshot | set expectations for recovery |
| Monitoring | 1 day | — |
| Neon Auth | 60k MAU on Free | not used (own auth) |
| Exhaustion | compute suspended until next period/upgrade; storage-growing writes fail; **no data deleted** | add spending/usage alerts |

- Compute math: 0.25 CU × 400 h = 100 CU-h; a continuously-active 0.25 CU compute exceeds the allowance in a month — bursty is fine, always-on is not.
- **“Vacation mode after 5 days” is UNVERIFIED in current docs** (legacy concept). Current documented behavior: 5-minute scale-to-zero, and *branch archival* when a branch is >14 days old AND unaccessed for 24 h (auto-unarchives on connect/query). Do not cite vacation mode.
- Connections scale with CU: direct `max_connections` = 104 at 0.25 CU (≈ 97 usable); the pooler accepts up to 10,000 client connections. Use pooled URLs from serverless. (source: https://neon.com/docs/connect/connection-pooling — fetched)
- Free plan commercial-use permission: **UNVERIFIED** — docs describe Free as “prototypes, side projects, small teams”. Paid upgrade path exists (Launch: $0.106/CU-hour, storage $0.35/GB-month, extra branches $1.50/branch-month — verified on plans page).

### 1.5 Vercel Functions facts used by this plan (verified)
- `api/` directory at the **project root** deploys Node.js functions with zero config; TS supported (root `tsconfig.json` respected, except path mappings/project references); handlers may use Web `fetch`/`GET`/`POST` exports or classic `(req, res)` with `@vercel/node` helpers (`request.cookies`, `request.body`, …). (source: https://vercel.com/docs/functions/runtimes/node-js — fetched)
- **Fluid compute is enabled by default for new projects since 2025-04-23** (source: vercel-json docs note). Limits (source: https://vercel.com/docs/functions/limitations, last_updated 2026-08-24, fetched): default & max duration **Hobby 300 s**; Pro default 300 / max 800 s (1800 s extended beta); default memory 2 GB / 1 vCPU (memory configured in dashboard under Fluid, **not** in `vercel.json`); max memory Hobby 2 GB, Pro 4 GB; default region `iad1`; request/response body limit 4.5 MB.
- `vercel.json` keys used below are current: `framework`, `installCommand`, `buildCommand`, `outputDirectory`, `regions`, `functions` (`maxDuration`, `includeFiles`, per-function `regions`), `rewrites` (named params pass through as query params), `headers`, `crons` (max 20 jobs on Hobby — **UNVERIFIED**; syntax verified). Memory cannot be set in `vercel.json` under Fluid. (source: https://vercel.com/docs/project-configuration/vercel-json — fetched)
- Hobby pricing/limits (invocations, bandwidth, non-commercial clause): **UNVERIFIED** — check https://vercel.com/pricing before promising costs.
- Node.js 24 LTS is GA for builds and functions per Vercel changelog (linked from the Node runtime docs). Exact default runtime pinning: set via project settings or `engines` (**UNVERIFIED** detail).

---

## 2. Recommended architecture for THIS app (single Vercel project)

### 2.1 Decision: `api/` directory + `@neondatabase/serverless` HTTP driver + raw parameterized SQL (Drizzle optional)

**Why this stack for NEXUS specifically:**
1. **Single-project constraint** — root `api/` functions deploy alongside the static `app/dist` output in the same project with zero extra config. (The alternative, a separate Node `server.ts` entrypoint or Vercel *Services*, adds a second deployable; unnecessary here.)
2. **Serverless driver choice.** Neon’s *current* guidance for Vercel **Fluid** compute is: standard TCP `pg` Pool + `attachDatabasePool()` from `@vercel/functions` (warm connections) — *not* blanket HTTP (source: https://neon.com/docs/guides/vercel-connection-methods — fetched). However, NEXUS’s functions are short, stateless, single-endpoint request/response workloads — exactly the classic-serverless profile where Neon still documents the **HTTP driver** as the low-latency default (`neon(process.env.DATABASE_URL)` tagged templates, zero connection management, works with scale-to-zero). Recommendation: **HTTP driver (`@neondatabase/serverless` ≥ v1.0, Node ≥ 19) as the default**, with two rules:
   - multi-statement atomic flows → `sql.transaction([...])` **batch** (non-interactive; supports `isolationLevel`) or single-statement CTEs; for any *interactive* transaction (read-then-decide-then-write), prefer a **single SQL statement** (UPSERT/CTE) so HTTP mode stays safe;
   - if profiling later shows heavy fan-in per request, switch to `pg` Pool + `attachDatabasePool` (the code change is isolated in `api/_lib/db.ts`).
   WebSocket mode (`Pool`/`Client`, interactive transactions) is available but unnecessary for this workload; on serverless, WS pools must connect/use/close within one request (source: https://neon.com/docs/serverless/serverless-driver — fetched).
3. **Raw parameterized SQL over an ORM** for the API handlers: every read has an authorization predicate baked into its `WHERE` (see §3.3); hand-written SQL keeps those predicates explicit and reviewable. **Drizzle** (`drizzle-orm/neon-http` + `drizzle-kit`) is a good *optional* layer for typed queries + `drizzle-kit` migrations against `DATABASE_URL_UNPOOLED` (source: https://neon.com/docs/guides/drizzle — fetched). For MVP: plain SQL files + a tiny migrate runner is the fewest moving parts; adopt Drizzle when the team wants typed query ergonomics. (`@vercel/postgres` is in transition/deprecation — avoid. source: https://neon.com/docs/guides/vercel-postgres-transition-guide — fetched)
4. **Region:** pin `regions: ["iad1"]` (Vercel default) and create the Neon project in the closest AWS US-East region; both serverless fn and DB in the same region keep p95 API latency dominated by cold starts, not DB RTT (exact ms figures **UNVERIFIED**).

### 2.2 Build/layout mechanics (this repo specifically)
- Current `installCommand: "cd app && npm ci"` installs **only app deps**. Functions bundled from `api/` need backend deps resolvable at the project root → **add a root `package.json`** (backend deps: `@neondatabase/serverless`, `@vercel/functions`, optional `@vercel/blob`, `drizzle-orm`/`drizzle-kit`, `zod`) and either:
  - **Option A (recommended): npm workspaces** — root `package.json` with `"workspaces": ["app", "api"]`, `installCommand: "npm ci"`; or
  - **Option B:** `installCommand: "npm ci && cd app && npm ci"` with backend deps in the root package.json.
- Keep `framework: "vite"`, `buildCommand: "cd app && npm run build"`, `outputDirectory: "app/dist"`. Functions are picked up from root `api/` automatically; **no `builds` legacy config** (deprecated/incompatible with `functions`). TS inside `api/` is compiled by the Node runtime; keep `api/` out of the app’s `tsc -b` project.
- **No blanket SPA rewrite.** The router is hash-based (`#/route/param`), so unknown paths can stay 404 and `/api/*` routes resolve via the filesystem without rewrite interference. (If the router ever moves to history mode, add the standard `rewrites: [{ "source": "/((?!api/).*)", "destination": "/index.html" }]`.)
- **Dynamic path segments:** vanilla `api/` bracket-routing is not a documented guarantee for non-Next projects. Use query parameters (e.g. `POST /api/posts/reactions` with `{postId}`), or verified `rewrites` with named captures (`{"source": "/api/posts/:id", "destination": "/api/posts?id=:id"}`) when pretty URLs matter. (rewrite param behavior verified in https://vercel.com/docs/project-configuration/vercel-json)

### 2.2.1 Recommended `vercel.json` (target state — sketch, not applied)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "installCommand": "npm ci",
  "buildCommand": "cd app && npm run build",
  "outputDirectory": "app/dist",
  "regions": ["iad1"],
  "functions": {
    "api/**/*.ts": { "maxDuration": 15 }
  },
  "headers": [
    { "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ] },
    { "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store" }
      ] }
  ],
  "crons": [
    { "path": "/api/cron/story-expiry", "schedule": "17 3 * * *" }
  ]
}
```

### 2.2.2 Recommended `api/` layout

```
package.json                     # NEW: backend deps (+ workspaces per Option A)
api/
  _lib/                          # shared, never routed (utility files per Vercel advanced-config docs)
    db.ts        # neon() singleton on DATABASE_URL (+ optional pg/attachDatabasePool variant)
    session.ts   # cookie parse/set, requireUser(), requireAdmin()
    http.ts      # json(), error envelope, zod-free validators mirroring repo.ts limits
    acl.ts       # visibility predicates (blocks, privacy, circle membership) as SQL fragments
    ids.ts       # uuid helpers, slugify username
    notify.ts    # notification insert helper
    seedDemo.ts  # optional showcase demo-persona seeding
  auth/signup.ts  auth/signin.ts  auth/signout.ts  auth/me.ts
  profile.ts     privacy.ts
  people.ts      # discovery (privacy-filtered)
  intents.ts     intents/interest.ts
  connections.ts connections/requests.ts connections/requests/respond.ts
  posts.ts       posts/react.ts posts/comments.ts posts/help.ts
  circles.ts     circles/membership.ts
  conversations.ts conversations/messages.ts conversations/read.ts
  stories.ts     stories/seen.ts
  blocks.ts      mutes.ts
  reports.ts     admin/reports.ts admin/report-action.ts
  notifications.ts
  media/upload.ts                # → Vercel Blob (photos/Moments)
  cron/story-expiry.ts           # hygiene delete of expired stories
  health.ts
scripts/migrate.mjs             # direct connection; migration lock; never an API route
db/
  migrations/0001_init.sql …
```

---

## 3. Auth design

### 3.1 Password hashing
- **Argon2id** via `@node-rs/argon2` (prebuilt NAPI binaries — no node-gyp on Vercel builds): `m=19456 (19 MiB), t=2, p=1` — the OWASP minimum-equivalent profile. (source: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html — fetched; verify the exact current parameters table when implementing)
- If avoiding native deps: Node built-in **`crypto.scrypt`** with OWASP-equivalent `N=2^15, r=8, p=3` (32 MiB) or `N=2^17, r=8, p=1` (128 MiB; fine within the 2 GB function memory). Store PHC-format strings (`$scrypt$N$r$p$salt$hash`) so the work factor is upgradeable per-login.
- Optional pepper (HMAC-SHA-256 post-hash) stored as a Vercel env var **outside the DB** (`PEPPER`); adds defense-in-depth if the DB leaks.
- Policy: min length 10, max 200; reject top-~1k common passwords (small bundled list); never log passwords.

### 3.2 Sessions: opaque httpOnly cookie (recommended) vs JWT
| | Opaque session cookie (recommended) | JWT (access) |
|---|---|---|
| Revocation (banning a tester instantly) | delete/revoke row — immediate | requires denylist ⇒ stateful anyway |
| Moderation + admin gating | trivial (query `users.is_admin`, `suspended`) | needs refresh logic |
| Size / complexity | tiny; one table | signing keys, rotation, refresh tokens |
| Vercel fit | one DB session/user lookup per request (measure latency; no 1 ms guarantee) | same DB read needed for revocation-safe design |
- **Decision:** `nexus_session` cookie: `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000` (30 d sliding). Token = 256-bit random (base64url); store **SHA-256(token)** in `sessions.token_hash`; rotate on signin; revoke all on password change. CSRF: `SameSite=Lax` + verify `Origin` header on all non-GET endpoints. Never put `DATABASE_URL` or any secret in `VITE_*` vars (client bundle is public).
- Rate limiting: `rate_limits` table keyed by `(ip_hash, kind)` + per-email counter for signin/signup (e.g. 10/min/IP, 5/15min/email); consider Vercel WAF rate rules later (**UNVERIFIED** current availability on Hobby).

### 3.3 Endpoint contracts (auth)
Error envelope everywhere: `{ "error": "<same friendly message the local repo throws today>" }` so existing UI error surfaces keep working.

| Endpoint | Method | Body | 200/201 response | Errors |
|---|---|---|---|---|
| `/api/auth/signup` | POST | `{email, password, username, name}` | `{user, onboardingComplete:false}` + `Set-Cookie` | 409 email taken / username taken; 400 validation; 429 rate |
| `/api/auth/signin` | POST | `{email, password}` | `{user}` + `Set-Cookie` | 401 invalid credentials (same msg for unknown email/bad pw); 429 |
| `/api/auth/signout` | POST | — | `{ok:true}` + clearing cookie | — |
| `/api/auth/me` | GET | — | `{user, privacy}` or 401 `{error:"Not signed in"}` | 401 |
| `/api/profile` | PATCH | `ProfileFields` (same whitelist as `repo.profileFields`) | `{user}` | 400 (`Name is required.`, `That username is already in use.`, `Choose up to three roles.` …) |
| `/api/privacy` | PATCH | `Partial<Privacy>` (server re-validates booleans + enum) | `{privacy}` | 400 |

`user` JSON is the existing `User` shape minus secrets (no `password_hash`, never `reports`), with `id` = uuid and `avatar` = Blob URL. `/api/auth/me` hydration replaces `state.signedIn`/`meId` semantics on the client.

### 3.4 Where each client-side check must move server-side (security mapping)
Today `app/src/services/repo.ts` checks are **UX, not security** — anyone with devtools bypasses them. The client keeps them for premium UX; the server re-implements each as the only enforcement. `meId`, `signedIn`, `isAdmin`, `suspended`, and every `privacy` field currently come from the client store and must be replaced by the **session-derived** server actor on every request.

| Concern | Client code today (repo.ts / store.ts) | Server enforcement (endpoint + rule) |
|---|---|---|
| Sign-in / suspension gate | `requireActor` (l.17): `signedIn`, `suspended` | `requireUser()` middleware on **every** mutating + sensitive read endpoint; suspended ⇒ 403 “Your account is suspended.” |
| Self / suspended / blocked target | `allowedOther` (l.49) checks **my** blocks only | Every interaction with a target user: target exists, not suspended, not self, and **neither direction** blocked (`blocks` checked both ways) |
| `connect(from,to)` must include me | l.152 — trusts client `from` | Server derives actor from session; `from := session.user.id` always; body supplies only `to` + `why` |
| Recipient-only accept/decline | l.170, l.200 | `session.user.id === request.to_user_id` |
| Demo auto-accept outgoing | `demoAcceptOutgoing` (l.213) | **Removed server-side entirely** (demo-only simulation; never exists as an endpoint) |
| Conversation access | `chat` l.249 `memberIds.includes(me)` | `conversation_participants` membership check in every messages GET/POST/read |
| whoCanMessage | l.252 `whoCanMessage === 'connections-only'` | On conversation create + each send: if target `privacy.whoCanMessage='connections-only'` ⇒ require **active** `connections` row between pair (a real FK join, not the `connectionId` pointer stored on the conversation) |
| Circle join (privacy/capacity/ended) | `circles.join` l.345 | Transaction that locks the circle row (`SELECT FOR UPDATE`) before checking `privacy='open'` and `count(*) < member_limit`, then inserts membership; all joins serialize on that row. A bare count-and-insert at READ COMMITTED is NOT race-safe, `end_date` check; owner cannot leave (l.359) |
| Circle post visibility | `postsInCircle` l.376, `accessiblePost` l.383 | Feed/post GET: `circle_id IS NULL OR circle is open OR session user IN circle_members`; private-circle react/comment/help all re-check membership server-side |
| Post ownership rules | react/comment/icanHelp l.402–426 | Re-validate kinds/reactions enums; `icanHelp`: not own post, `post_help` PK makes duplicates impossible; reaction toggle = upsert/delete on `post_reactions` PK (self-consistent counts always derived, never client-counted) |
| Blocks cascade | l.316 (decline pending, purge notifications) | One server transaction: insert block, decline pending requests both directions, hide/fail message sends both ways |
| Mutes | l.320 | Filter content server-side in feed/story/message queries (`NOT EXISTS mutes`); `muted` flag on conversations stored per-user (`conversation_mutes`) |
| Story (Moment) privacy | `stories.list` l.430: not expired, author not suspended, not blocked/muted, `author.privacy.discoverable` unless self | SQL predicate identical, plus `expires_at > now()`; `markSeen` requires the story to be visible to *this* session; delete: author-only (l.459) |
| Discovery privacy | **`useDiscoverableUsers` in repo/store.ts (l.39) — not only repo.ts**; also `showCity` | `/api/people` applies: `privacy->>'discoverable' = true`, not suspended, not blocked (both directions), not passed, not self; `showCity=false` ⇒ server nulls `city` **before** serialization (redaction is a server concern) |
| Reports | `reports.file` l.329 checks existence only (**IDOR**: any target id) | Reporter must be able to access the target (same ACL as the underlying read) ; reports are never readable by non-admins (today the whole AppState, incl. `reports`, ships to the client) |
| Admin moderation | `requireAdmin` l.488 + all `moderation.*` | `session.user.is_admin` server-side; `/api/admin/*` only; suspend/unsuspend/warn/dismiss write `reviewed_by/at`; suspension takes effect on next request via `users.suspended` |
| Validation/lengths | `required()` limits: intent 3000, why 1000, message 5000, comment 3000, caption 280, title 200/100, username 40, name 100, reports 200/5000, tags ≤12, roles ≤3, memberLimit 2–500 | Re-enforce all on server (`api/_lib/http.ts` validators); client limits stay as UX |
| ID handling | client-generated `uid()` | Server-generated UUIDs; client never sends ids for new rows |

---

## 4. Data model (Postgres DDL sketch)

Mapping of the 17 localStorage “tables” in `AppState` (db.ts) → Postgres. JSONB kept only where the shape is written/read atomically by one feature (interpretation, privacy, reputation, structured, notification meta). Collections that need per-row authorization or fan-out are **normalized** (comments, reactions, helpedBy, members, blocks, mutes, passes, story views).

```sql
create extension if not exists citext;
create extension if not exists pgcrypto; -- gen_random_uuid()

-- users (localStorage: users[] minus auth fields; 'me' row disappears)
create table users (
  id                  uuid primary key default gen_random_uuid(),
  email               citext not null unique,
  username            citext not null unique check (username ~ '^[a-zA-Z0-9_.-]{3,40}$'),
  password_hash       text not null,                       -- PHC string (argon2id/scrypt)
  name                text not null check (length(name) <= 100),
  headline            text not null default '',
  avatar_url          text not null default '',            -- Blob URL (was data:/local path)
  accent_hue          smallint not null default 210,
  city                text not null default '',
  bio                 text not null default '',
  currently           text not null default '',
  roles               text[]  not null default '{}' check (cardinality(roles) <= 3),
  interests           text[]  not null default '{}',
  skills              text[]  not null default '{}',
  needs               text[]  not null default '{}',
  availability        text not null default 'flexible',
  experience          text not null default 'beginner',
  reputation          jsonb   not null default '{}'::jsonb,   -- 6 counters, single-writer
  trust_badges        text[]  not null default '{}',
  privacy             jsonb   not null default '{"discoverable":true,"whoCanMessage":"anyone","showCity":true,"showInLocalSuggestions":true}'::jsonb,
  is_demo             boolean not null default false,      -- seeded showcase personas
  is_admin            boolean not null default false,
  suspended           boolean not null default false,
  onboarding_complete boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- sessions (no localStorage equivalent)
create table sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  token_hash   bytea not null unique,          -- sha256(opaque token); raw token only in cookie
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at   timestamptz not null,
  revoked_at   timestamptz,
  user_agent   text,
  ip_hash      text
);
create index on sessions (user_id);

-- intents
create table intents (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users(id) on delete cascade,
  original_text  text not null check (length(original_text) <= 3000),  -- never destroyed
  title          text not null,
  details        text,
  interpretation jsonb not null,               -- IntentInterpretation (single-writer JSONB)
  status         text not null default 'active' check (status in ('active','matched','completed','archived')),
  visibility     text not null default 'public' check (visibility in ('public','circles','private')),
  expires_at     timestamptz,
  created_at     timestamptz not null default now()
);
create index on intents (user_id, created_at desc);
create index on intents (status) where status in ('active','matched');

-- interestedCount + interestedByMe → normalized (was denormalized counter on Intent)
create table intent_interests (
  intent_id  uuid not null references intents(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (intent_id, user_id)
);

-- requests (ConnectionRequest[])
create table connection_requests (
  id           uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references users(id) on delete cascade,
  to_user_id   uuid not null references users(id) on delete cascade,
  why          text not null check (length(why) <= 1000),
  status       text not null default 'pending' check (status in ('pending','connected','declined')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  check (from_user_id <> to_user_id)
);
create unique index connection_requests_one_pending
  on connection_requests (least(from_user_id, to_user_id), greatest(from_user_id, to_user_id))
  where status = 'pending';

-- connections  (a < b canonical ordering prevents duplicates)
create table connections (
  id         uuid primary key default gen_random_uuid(),
  a_user_id  uuid not null references users(id) on delete cascade,
  b_user_id  uuid not null references users(id) on delete cascade,
  level      text not null default 'connected' check (level in ('connected','interacted','collaborated','trusted')),
  created_at timestamptz not null default now(),
  check (a_user_id < b_user_id),
  unique (a_user_id, b_user_id)
);

-- conversations + messages
create table conversations (
  id               uuid primary key default gen_random_uuid(),
  connection_id    uuid references connections(id) on delete set null,
  shared_context   text[] not null default '{}',
  intro_message_id uuid,
  created_at       timestamptz not null default now()
);
create table conversation_participants (        -- replaces memberIds[2]
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id         uuid not null references users(id) on delete cascade,
  primary key (conversation_id, user_id)
);
create table conversation_mutes (               -- per-user mute flag (was single `muted`)
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id         uuid not null references users(id) on delete cascade,
  primary key (conversation_id, user_id)
);
create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid references users(id) on delete cascade,  -- null for kind='intro' (was senderId 'nexus')
  kind            text not null default 'text' check (kind in ('text','intro','system')),
  body            text not null check (length(body) <= 5000),
  created_at      timestamptz not null default now(),
  delivered_at    timestamptz,
  read_at         timestamptz,
  check ((kind = 'text' and sender_id is not null) or
         (kind in ('intro','system') and sender_id is null))
);
create index on messages (conversation_id, created_at);

-- circles must be created before posts because posts.circle_id references circles.
create table circles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) <= 100),
  emoji text not null default '◎', description text not null default '',
  purpose text not null check (length(purpose) <= 1000),
  goal text not null default '', category text not null default 'Creative',
  owner_user_id uuid not null references users(id) on delete cascade,
  member_limit int not null default 20 check (member_limit between 2 and 500),
  privacy text not null default 'open' check (privacy in ('open','invite','closed')),
  city text, start_date timestamptz not null default now(), end_date timestamptz,
  created_at timestamptz not null default now(),
  check (end_date is null or end_date > start_date)
);

-- posts (photos in post_photos; comments/reactions/helpedBy normalized)
create table posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  kind       text not null check (kind in ('share','ask','collaborate','teach','challenge','meet')),
  title      text not null check (length(title) <= 200),
  body       text not null check (length(body) <= 10000),
  circle_id  uuid references circles(id) on delete cascade,
  tags       text[] not null default '{}' check (cardinality(tags) <= 12),
  structured jsonb,                              -- optional {skillsNeeded,location,time,paid}
  created_at timestamptz not null default now()
);
create index on posts (created_at desc);
create index on posts (circle_id) where circle_id is not null;

create table post_photos (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  storage_key text not null unique,
  position smallint not null default 0 check (position >= 0),
  mime_type text not null,
  width int check (width > 0), height int check (height > 0),
  byte_size bigint not null check (byte_size > 0),
  unique (post_id, position)
);
-- Adapter maps the first authorized photo URL to legacy post.photo.
-- Private-circle media requires private storage plus authorized short-lived delivery;
-- a public Blob URL bypasses circle authorization and is not appropriate for private media.

create table post_reactions (                    -- Record<Reaction,number> + myReaction
  post_id    uuid not null references posts(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  reaction   text not null check (reaction in ('useful','interesting','lets-do-it','support')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)                 -- one reaction/user; toggle = update/delete
);
create table post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references posts(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  body       text not null check (length(body) <= 3000),
  created_at timestamptz not null default now()
);
create index on post_comments (post_id, created_at);
create table post_help (                         -- helpedBy[]
  post_id    uuid not null references posts(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- stories (Moments; seenByMe normalized; expiry enforced by predicate + cron hygiene)
create table stories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  photo_url  text not null,
  caption    text not null default '' check (length(caption) <= 280),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);
create index on stories (expires_at);
create table story_views (
  story_id  uuid not null references stories(id) on delete cascade,
  user_id   uuid not null references users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

-- circles created above; memberIds normalized, dayNumber derived from start_date
create table circle_members (
  circle_id uuid not null references circles(id) on delete cascade,
  user_id   uuid not null references users(id) on delete cascade,
  role      text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);
create table circle_events (
  id        uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles(id) on delete cascade,
  title     text not null,
  detail    text not null default '',
  at        timestamptz not null,
  location  text not null default ''
);
create table circle_event_rsvps (                 -- goingIds[]
  event_id uuid not null references circle_events(id) on delete cascade,
  user_id  uuid not null references users(id) on delete cascade,
  primary key (event_id, user_id)
);
create table circle_projects (
  id            uuid primary key default gen_random_uuid(),
  circle_id     uuid not null references circles(id) on delete cascade,
  title         text not null,
  owner_user_id uuid not null references users(id) on delete cascade,
  status        text not null default 'active' check (status in ('active','done'))
);

-- social state (blockedUsers / mutedUsers / passedUserIds)
create table blocks (
  user_id         uuid not null references users(id) on delete cascade,
  blocked_user_id uuid not null references users(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (user_id, blocked_user_id),
  check (user_id <> blocked_user_id)
);
create table mutes (
  user_id        uuid not null references users(id) on delete cascade,
  muted_user_id  uuid not null references users(id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (user_id, muted_user_id),
  check (user_id <> muted_user_id)
);
create table passes (
  user_id        uuid not null references users(id) on delete cascade,
  passed_user_id uuid not null references users(id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (user_id, passed_user_id)
);

-- notifications (currently client-computed)
create table notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  kind          text not null,
  actor_user_id uuid references users(id) on delete set null,
  body          text not null,
  meta          jsonb not null default '{}'::jsonb,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index on notifications (user_id, created_at desc);

-- reports (admin-only visibility; target_id polymorphic — no FK, validated in app)
create table reports (
  id          uuid primary key default gen_random_uuid(),
  target_kind text not null check (target_kind in ('user','post','message','intent')),
  target_id   uuid not null,
  target_label text not null default '',
  reason      text not null check (length(reason) <= 200),
  detail      text not null default '' check (length(detail) <= 5000),
  reporter_id uuid not null references users(id) on delete cascade,
  status      text not null default 'open' check (status in ('open','reviewing','resolved')),
  action      text not null default 'none' check (action in ('none','dismissed','warned','suspended')),
  action_note text,
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  created_at  timestamptz not null default now()
);
create index on reports (status, created_at);

-- optional
create table analytics_events (                   -- was capped in-memory list
  id          bigserial primary key,
  user_id     uuid references users(id) on delete set null,
  name        text not null,
  properties  jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create table rate_limits (
  key          text not null,
  window_start timestamptz not null,
  count        int not null default 0,
  primary key (key, window_start)
);
```

**Pragmatic JSONB calls:** `interpretation`, `privacy`, `reputation`, `structured`, `meta` (notifications) stay JSONB — single-writer, schema-evolving, never per-row authorized. Everything used in authorization predicates (`privacy.discoverable`, `whoCanMessage`) could be promoted to generated columns later (`privacy->>'whoCanMessage'`) if query plans need it. No RLS for MVP (single service role used by functions); security = endpoint predicates + unique/check constraints. Media (post photos, Moments, avatars) → **Vercel Blob**, never bytea/data-URLs in Postgres (protects the 0.5 GB Free cap).

---

## 5. Migration & coexistence (demo-first SPA + server accounts)

- **Mode flag:** `VITE_API_MODE` (`local` | `server`). The existing localStorage path stays 100% functional (anonymous demo with the 21 seeded personas) — nothing in `repo/db.ts` is deleted.
- **Adapter layer:** new `app/src/services/api/` client implementing the **same namespace surface as `repo`** (`auth, profile, intents, connections, messages, blocks, mutes, reports, circles, posts, stories, notifications, privacy, moderation`) but **async**. Two consequences to plan for:
  1. every `actions.*` call site that currently relies on synchronous success needs pending/error handling (optimistic update + rollback, or await + spinner);
  2. **reads are the bigger work**: `store.ts` exposes the whole `AppState` (`useNexus`, `useUsers`, `useReports`…) to every component. Server mode must hydrate a client read-cache from scoped endpoints (`/api/auth/me`, `/api/people`, feed pages, `/api/conversations`, …) into the same store shape, and drop endpoints that must never exist (no “GET all reports”, no “GET all users+emails”).
- **No auto-merge on signup:** the local snapshot (with `meId='me'`) is never pushed wholesale to the server. Signup creates a fresh server profile; an explicit, later “import my demo content” tool can convert locally-authored intents/posts into server rows.
- **Existing key `nexus-mvp-state-v1` stays demo-only.** Server mode keeps no PII in localStorage — only the httpOnly cookie (never readable by JS) + a non-sensitive UI marker.
- **Demo personas in a multi-user world:** server-side showcase users are seeded with `is_demo = true` (fixed UUIDs/usernames) and are **excluded from real discovery, requests, and messaging** (server-side filter). Full interactive demo personas remain a *local-mode-only* concept: `demoAcceptOutgoing`, `typingSim`, `delayedReceipt`, and fabricated read receipts (repo.ts l.213–311) are gated to local mode and never run for live accounts — otherwise testers would receive synthetic DMs from other humans’ accounts. Decision point for the owner: seed a handful of `is_demo` showcase profiles server-side (recommended for first-run premium UX) or none.
- **Onboarding flow reuse:** welcome → signup (email/password/username) → existing onboarding steps call `PATCH /api/profile` → server sets `onboarding_complete`. `signedIn` derives from `/api/auth/me`.
- **Migrations in CI/preview:** keep scripts in root `scripts/`, not routed `api/`. Run a dedicated migration command with `DATABASE_URL_UNPOOLED` and a direct connection holding `pg_advisory_lock` throughout; never run production migrations on every function cold start. Preview builds can apply migrations after integration-injected branch credentials are available. Production uses a gated, single-run migration step before promotion; use expand/contract changes so old deployments remain compatible. Never point Preview/Development at the production database.
- **E2E:** existing Playwright suites keep running against local mode; add server-mode specs against a preview deployment (Neon preview branch gives per-PR isolation).

---

## 6. Risks, costs, phased rollout

### Risks
1. **Neon Free compute-hours**: bursty tester use fits (see §1.4); an always-on compute or a runaway query loop can exhaust 100 CU-h → compute suspended until next period. Mitigation: scale-to-zero (default), single pooled connection path, spending alerts, upgrade path documented.
2. **0.5 GB storage / 5 GB egress**: photos in Postgres would blow this — Vercel Blob for all media from day one.
3. **Branch cap (10)**: Vercel-managed preview branches live until the *deployment* is deleted (≈6-month retention) — disable preview branching or prune; alternatively set Neon branch `expires_at` (≤30 days) via the Neon API (source: https://neon.com/docs/guides/branching-neon-api — fetched).
4. **Cold starts**: Vercel function + Neon wake after idle; acceptable for a few dozen testers; keep functions small, avoid heavy cold imports.
5. **Security posture change**: today nothing is enforced; on day one of Phase 1 every ACL in §3.4 must be live or content should stay disabled behind the auth wall. Also: **`.env.vercel` in the repo root contains a live-looking `VERCEL_TOKEN`** (gitignored, but exposed locally and pasted into chat history) — **rotate that token** and never place tokens in repo files; use `vercel env pull` for local dev.
6. **Sync-vs-async rewrite risk**: the repo API is synchronous; the adapter change touches UI call sites. Mitigation: keep method names/args identical, return promises, batch-call sites per screen.
7. **Cookie auth on preview URLs**: SameSite=Lax works same-origin; verify cookies on the `*.vercel.app` preview domains during Phase 1 e2e.

### Costs (verified where noted)
- Neon Free: $0 (limits above). Launch: $0.106/CU-hour, storage $0.35/GB-month, extra branches $1.50/branch-month (source: Neon plans page). For a few dozen testers: expected **$0/month** on Free; worst case single-digit dollars on Launch.
- Vercel Hobby $0 (invocation/bandwidth limits and the non-commercial clause **UNVERIFIED** — check https://vercel.com/pricing); Pro per-seat pricing **UNVERIFIED**. Vercel Blob free tier/pricing **UNVERIFIED** — check https://vercel.com/docs/storage/vercel-blob before committing to Blob.

### Phased rollout (single experienced dev, agent-assisted; includes tests)
| Phase | Scope | Effort |
|---|---|---|
| **0 — Platform setup** | Dashboard-install Neon integration (one click) → verify injected envs; root `package.json` + `vercel.json` update; `api/` skeleton + `/api/health`; migrate runner; preview-branch policy | 1 day |
| **1 — Auth + profiles + adapter skeleton** | users/sessions DDL; signup/signin/signout/me + argon2id/scrypt; httpOnly cookie; `requireUser`; profile + privacy PATCH; client mode flag + async adapter for auth/profile; Playwright auth specs | 4–6 days |
| **2 — Content + social graph** | intents (+interest), people discovery (privacy/blocks/passes), requests/connections (+intro message), conversations/messages (send, read receipts real), posts (+reactions/comments/help), circles (join/leave/create with capacity tx), stories (+Blob uploads + seen), notifications, reports, admin moderation (`/api/admin/*`, `is_admin`); port every repo.ts validation; full ACL matrix from §3.4 as integration tests; Blob upload endpoint; demo personas excluded from real graph | 8–12 days |
| **3 — Realtime + polish** | `since`-cursor polling → SSE streaming (Fluid) for conversations/notifications; story-expiry cron; presence/typing indicators (optional); observability (logs, slow-query review); load soak against CU-hour budget | 4–6 days |
| **Total** | | **≈ 3.5–5 weeks** |

Sequencing note: Phase 1 alone should ship behind the existing premium UI (welcome/onboarding screens) so testers get accounts immediately; Phase 2 is the bulk and should land feature-by-feature (intents → posts → circles → messages) with the demo mode untouched until each lands.

---

## 7. Exact env vars to set in Vercel

**Injected automatically by the Neon integration (do not set manually):**
`DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED`, `PGHOST`, `PGHOST_UNPOOLED`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`; legacy `POSTGRES_*` aliases (exact alias list **UNVERIFIED**); preview-branch credentials are deployment-injected, not stored.

**Set manually (Project → Settings → Environment Variables):**
| Name | Example / value | Environments |
|---|---|---|
| `VITE_API_MODE` | `server` (demo stays `local`) | Production, Preview |
| `SESSION_TTL_DAYS` | `30` | all |
| `PEPPER` | random 32B (optional argon2 pepper) | Production, Preview (sensitive) |
| `CRON_SECRET` | random 32B (`Authorization: Bearer` guard for `/api/cron/*`) | Production (sensitive) |
| `BLOB_READ_WRITE_TOKEN` | auto if using the Vercel Blob integration | Production, Preview (sensitive) |
| `APP_ORIGIN` | `https://nexus-mvp-eta.vercel.app` (Preview: exact preview origin) | Production / Preview separately |

Pin Node 24.x through Vercel Project Settings and root `package.json` engines; do not rely on an arbitrary `NODE_VERSION` env variable to select the runtime.

Never prefix a secret with `VITE_` — client code is public. The local `.env.vercel` token should be **rotated** and deleted (see Risks #5).

---

## 8. Implementation gates and verification matrix

This is a researched DDL/architecture sketch, not an executed migration. No application code was changed or build/test run for this report. Validate SQL on an isolated empty Neon branch before implementation approval.

- Complete DDL invariants before shipping: two participants per DM, unique canonical DM pair, participant foreign key for human message senders, same-conversation intro-message reference, exactly 24-hour story expiry, strict validation of JSONB shapes and all vocabulary fields. `intents.visibility='circles'` currently lacks explicit audience IDs: add `intent_circles(intent_id,circle_id)` before enabling that visibility, or reject it server-side until its semantics are defined. Current schema preserves the field but does not alone enforce it.
- Preserve privacy in media too: store object keys for restricted stories/circle media and return short-lived authorized access; do not expose permanent public URLs. Validate decoded MIME, dimensions, bytes, ownership and quotas; strip EXIF; authorize uploads before issuing short-lived upload credentials. Story expiration is enforced on reads regardless of cron timing.
- Add email verification and password-reset token tables/endpoints before broad tester rollout; hashed single-use tokens, bounded TTL, generic responses, verified delivery provider. If deferred for invite-only testing, document manual recovery and explicitly do not claim email ownership has been verified. Administrative privileges must be granted only by an operator, never signup/profile payloads.
- Use cookie name `__Host-nexus_session` in HTTPS production (Secure, HttpOnly, Path=/, no Domain); a separate non-Secure dev cookie only on localhost. Verify exact Origin against trusted environment config on unsafe methods, including signin/signup/logout; JSON content type and CSRF defense are required. Cookie Max-Age alone is not sliding expiration: enforce DB absolute expiry and bounded renewal policy. No session signing secret is required for random hashed opaque tokens.
- Acceptance suite: A/B/C separate authenticated browser contexts; anonymous access denied; A cannot read B/C DMs or another user's notifications/reports; reverse blocks enforced immediately; nondiscoverable/showCity/local-suggestion redaction; private intent/circle/post/story direct-ID access denied; non-admin moderation denied; pending request reciprocal race; simultaneous last-slot joins; duplicate message retry idempotency; duplicate signup/username collision; expired/revoked sessions; suspend active sessions; account-switch cache purge; API errors never become HTML; static assets and hash links continue to load.
- Add idempotency keys for message/create mutations and prefer explicit `PUT reaction` / `DELETE reaction` over retry-sensitive toggles. Maintain stable `(created_at,id)` pagination cursors. Persist only server-authorized read projections; never fall back silently from a failed server write into local demo mode.
- Demo fixtures have no real credential ownership: never let someone claim a seeded username/profile without an explicit migration mapping. `isDemoUser` currently marks the evaluator persona, NOT all sample users; do not reuse it as a reliable fixture classifier.
- Rate limits must be shared and atomic; never rely on per-function memory. Hashing memory multiplied by Fluid concurrent requests matters. For raw scrypt N=2^17, configure Node maxmem above 128 MiB overhead, generate >=16-byte random salts, and compare derived bytes in constant time. Benchmark native Argon2 packaging on an actual preview deployment rather than assuming prebuilt-binary support.
- Critical transactional flows (join capacity, request acceptance + connection + participants + intro + notices) need actual transaction correctness. Single CTE statements are not automatically concurrency-safe. For easier correctness under Fluid, prefer the documented `pg` Pool + `attachDatabasePool` and interactive transactions if HTTP batching makes locking awkward. ORM/Drizzle choice is orthogonal to transport and does not provide authorization automatically.
- Realtime: start visibility-aware polling only while tabs/chats are active. DB-driver WebSockets are NOT client realtime. Vercel functions are not persistent WebSocket servers; for Phase 3 use an external managed realtime provider with authorized channels, or bounded SSE with reconnect/replay and verified duration/costs. Stop polling on hidden tabs to permit Neon scale-to-zero.
- Backup and rollback gate: encrypted independent backup plus tested restore, narrow 6-hour free restore horizon documented, backward-compatible migrations, stable preview seed (not real user/password/session clones), preview protection for public-repo fork deployments, sanitized request logs and moderation audit records.

## 9. Source list (fetched during this research)

**Vercel (official docs, `.md` mirrors):**
- https://vercel.com/docs/project-configuration · https://vercel.com/docs/project-configuration/vercel-json (fetched; rewrite-param behavior, `functions`, `crons`, `headers`, `regions`)
- https://vercel.com/docs/functions/runtimes/node-js (fetched: root `api/`, TS, fetch/`@vercel/node` handlers)
- https://vercel.com/docs/functions/limitations (fetched by subagent: durations/memory/regions/4.5 MB)
- https://vercel.com/docs/frameworks/frontend/vite (fetched: SPA deep-link note, env vars)
- https://vercel.com/docs/build-output-api/configuration (fetched: BOA v3 shape)
- https://vercel.com/docs/rest-api/integrations/create-integration-store-free-and-paid-plans (fetched directly — `POST /v1/storage/stores/integration/direct`)
- https://vercel.com/docs/rest-api/integrations/connect-integration-resource-to-project (fetched by subagent — resource→project connect)
- https://vercel.com/docs/rest-api (index — env endpoints `/v10/...`)

**Neon (official docs):**
- https://neon.com/docs/introduction/plans · https://neon.com/pricing (Free limits, CU-hour math, overage behavior)
- https://neon.com/docs/introduction/scale-to-zero · https://neon.com/docs/guides/branch-archiving (5-min suspend; archival)
- https://neon.com/docs/connect/connection-pooling (pooled vs direct; `-pooler`; connection counts)
- https://neon.com/docs/serverless/serverless-driver (HTTP tagged template/`.query()`, batch `sql.transaction()`, WS Pool/Client)
- https://neon.com/docs/guides/vercel-managed-integration · https://neon.com/docs/guides/neon-managed-vercel-integration · https://neon.com/docs/guides/vercel-overview (install flow, env names, preview branching/cleanup)
- https://neon.com/docs/guides/vercel-connection-methods (current Fluid-era guidance: TCP pool + `attachDatabasePool`)
- https://neon.com/docs/guides/vercel-postgres-transition-guide · https://neon.com/docs/guides/drizzle · https://neon.com/docs/guides/branching-neon-api
- https://neon.com/docs/auth/overview (Neon Auth = Managed Better Auth — not used here)

**Other:**
- https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html (fetched: Argon2id/scrypt parameter guidance)
- https://registry.npmjs.org/@neondatabase/serverless/latest (npm registry, not neon.com: current ~1.1.0, Node ≥ 19)

**Explicitly unverified items** (first-token Neon installation via bare Vercel token; legacy `POSTGRES_*` alias list; POST /v1/storage old endpoint status; credential re-sync endpoint; Hobby cron-job count; Hobby commercial-use clause on both Vercel and Neon; Vercel/Blob pricing; Node default runtime pin details; exact `-pooler` URL example; “vacation mode”; Pool `fetchEndpoint` option scope).
