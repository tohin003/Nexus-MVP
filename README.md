# NEXUS MVP

**People → Intents → Circles → Content.** A mobile-first, persistent local demo for finding people through complementary goals and skills—not follower counts.

## Run

Requires modern Node (verified with Node 24.14.1 and npm 11.11.0).

```sh
cd app
npm ci
npm run dev
```

Open **http://127.0.0.1:4173/**. Port is strict: stop the existing NEXUS process before starting another. No API keys or environment variables are required. All sign-in options enter the same fictional demo account, Prince.

```sh
cd app
npm test                         # deterministic domain + repository tests
npx playwright install chromium # first browser setup only
npm run test:e2e                 # browser acceptance + responsive/safety/media flows
npm run lint
npm run build                   # TypeScript and production assets
npm run preview                 # serve dist at :4173; stop dev first
```

Playwright reuses :4173 when already running, or starts Vite itself. Generated traces/reports are excluded from the Vite watcher to prevent test-induced reload loops.

## Deploy this client demo to Vercel

Import `tohin003/Nexus-MVP` and leave **Root Directory at the repository root**. The committed `vercel.json` installs dependencies in `app`, runs its production build, and publishes `app/dist`. Use Node 24.x. No environment variables or API keys are needed. Navigation uses URL hashes, so no server route rewrites are needed.

This deploys the interface, not a shared backend: each visitor gets independent browser-local demo data. Photos and messages do not sync between devices. Do not upload sensitive/client-confidential images to this demo. Clearing site data resets local content.

## Try the complete loop

1. Continue with Demo, confirm 18+, enter identity and a goal.
2. Pick Filmmaking, offer Storytelling, and request Video Editing.
3. Describe a filmmaking YouTube project in Jaipur; review/edit the interpretation.
4. Find your people, inspect Aarav's profile and evidence-based match reasons.
5. Connect with a reason. Home → Inbox → Requests exposes **Accept as Aarav (demo)**. This is an explicit simulation, not another person accepting.
6. Read the single NEXUS introduction, use a starter, and send a message. Replies/read receipts are clearly labeled simulations.
7. Discover people, intents, or Circles; join a Circle and publish an update or collaboration post.
8. Explore the finite Home briefing, notifications, Passport, profile editing, privacy, block/mute/report, and local admin review.
9. Reload: data persists. You → demo controls supports export/import; Settings supports confirmed reset and sign out.

## Implemented

- Six-step adult onboarding with tab-persistent draft, interest depth, skills/needs, natural-language intent and editable structured preview.
- Explainable matching, profiles/Passport, request/accept/pass, atomic one-time introductions, chat history/starters/typing/receipts.
- Home's finite daily briefing, Discover search and three categories, notification center.
- Eight seeded Circles with membership, goal/timeline, discussions, people, projects and events. Circle creation and member publishing.
- Share, Ask, Collaborate, Teach, Challenge and Meet; posts or matching intents; reactions, comments and help contributions; optional photo attachment on posts.
- "Moments" photo updates with 24-hour expiry, horizontal rail, add-your-own upload and manual viewer (a stories-style feature, not an Instagram clone).
- Suggested people on Home scroll horizontally; profile photo upload in Edit profile (resized client-side, stored locally only).
- Profile/theme/privacy editing, block/unblock, mute, reports, admin review/dismiss/warn/suspend, retained local analytics.
- LocalStorage versioned persistence, import validation, export, seed reset, guarded mutations, error recovery and empty states.
- 21 fictional personas with local portraits, 21 initial intents, 20 posts, 8 Circles, existing requests/chats/projects/events.
- Off-white and graphite themes, violet accent, full-bleed mobile and desktop phone frame.

## Local intelligence, not a live model

`app/src/services/intelligence.ts` is a replaceable service boundary. Interpretation uses keyword/cue rules, not external inference; original wording remains separate. Matching weights are **30% intent, 25% bidirectional skills↔needs, 15% interests, 10% location, 10% availability, 10% trust**. Missing evidence earns no points. Internal numeric scores never appear as fake precision in UI: only GREAT FIT, STRONG FIT, POSSIBLE FIT and grounded reasons. Introduction text uses existing profile/context data and is created once per accepted connection.

This demonstrates a product flow; it does **not** establish that real users are glad they met. Validate that hypothesis through consented pilot interviews, acceptance/reply rates, completed collaborations and direct post-introduction feedback.

## Architecture

- `app/src/domain`: typed entities, ontology, entry routing rules.
- `app/src/data`: realistic seed and asset provenance.
- `app/src/repo`: vanilla Zustand state, localStorage hydration/import/reset, React selectors.
- `app/src/services`: mutation permission checks and deterministic intelligence.
- `app/src/screens`, `components`, `ui`: screen modules and shared native-dialog/mobile primitives.
- `app/e2e`: browser acceptance and layout checks.

State key: `nexus-mvp-state-v1`; theme: `nexus-theme`; draft: `nexus-onboarding-draft-v1` in sessionStorage. Exports contain demo profile/message data; don't import sensitive real information. Browser-local permission checks are product behavior, **not a security boundary**.

## Known limits and production path

This is a single-browser demo, not production authentication, multiuser authorization, encryption, realtime delivery, push notifications, durable server storage or AI. The seed account is admin for exploration; that flag is not secure authorization. Closed/invite-only Circles gate content, but invite delivery is not implemented. Projects/events are seeded read views; propose new work in discussions. No payments, dating, infinite feed, short-form video, marketplace or voice/video. Uploaded photos are resized (avatar ≤384px, post/Moment ≤1200px, ~220 KB each) and kept in this browser's localStorage; storage quota is a real limit, so very large libraries may be refused.

Current QA uses Chromium DOM/accessibility/geometry and screenshots. The executing model cannot view images, so screenshot visual approval, real-device keyboard/safe-area checks, screen-reader review, Safari/Firefox and full WCAG certification are not claimed. See `MVP_TEST_REPORT.md` for actual evidence and remaining limitations. Avatar provenance is in `app/src/data/ASSETS.md`; replace placeholders with consented/licensed media before public release.

Production sequence: authenticated backend + database/RLS; server-enforced permissions and moderation audit trail; schema migration; realtime messaging and idempotent acceptance; abuse/rate controls and retention policy; opt-in server-side model adapter with validated structured output and deterministic fallback; consented small pilot; accessibility and cross-browser review. Never put provider secrets in `VITE_*` variables.

## Supporting documents

- `SPEC.md`: original specification (including embedded design reference).
- `NEXUS-UX-RESEARCH.md`: source-linked design research and explicit uncertainty.
- `MVP_PLAN.md`, `MVP_DECISIONS.md`: execution and architectural decisions.
- `MVP_TODO.md`, `MVP_STATUS.md`, `MVP_TEST_REPORT.md`: completion and validation evidence.
