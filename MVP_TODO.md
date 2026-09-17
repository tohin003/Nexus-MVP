# MVP checklist

- [x] Complete prose audit and current UX research (direct web fallback).
- [x] React/TS bootstrap, dependencies, typed domain, ontology.
- [x] Deterministic matching/intent/intro services and tests (34 intelligence + 40 repo + 4 entry).
- [x] Persistent seed/repository, validated import/reset, generation guard; build passes.
- [x] Welcome, six-step onboarding, editable intent interpretation, first matches.
- [x] Profiles/Passport, explainable discovery, connect-with-reason, accept/intro journey.
- [x] Inbox/messaging with receipts, unread, typing simulation, shared context.
- [x] Finite NEXUS Today and notification center with all six kinds.
- [x] Posts/create/reactions/comments/help; all six content kinds; post-or-intent publishing.
- [x] Circles discover/join/leave/create/discuss/people/projects/events.
- [x] Privacy/block/mute/report/suspension, admin review queue, non-admin gate.
- [x] Demo sign-in, recipient simulation, reset (clears draft), persistence, import/export.
- [x] Theme controls (light/dark/system) and responsive mobile frame + desktop.
- [x] 78 unit/integration tests; 22 browser E2E green against production build.
- [x] README, decisions, failure/test evidence and migration handoff.
- [x] Media: profile photo upload, photo posts, Moments stories, horizontal rails.
- [x] Live backend phase 1: Neon Postgres, Node-style Vercel functions, PBKDF2 auth
      (signup/signin/signout/me), username availability, profile persistence — 22/22
      API acceptance checks green (scripts/check-api.mjs).
- [x] Real accounts in the UI: email+password collected at onboarding's final step,
      debounced live username availability, real Sign in form on Welcome with Show/Hide,
      account snapshot isolation (demo data never leaks across accounts), server session
      sign-out, cookie restore on refresh.
- [x] Instagram-pattern media: multi-photo posts (≤20, ordered, add/remove/reorder,
      atomic batch validation), story batches as separate frames, snap pager with dots,
      scoped no-scrollbar rails with visible controls.
- [x] Social: cancel sent connection requests (sender-only), directional follows with
      Follow/Unfollow, honest Posts/Followers/Following profile stats.
- [x] 131 unit tests; full Playwright suite green (20+ incl. real-account and multi-media
      specs) against the production build.

## Next (not started)
- [ ] Real-account E2E verified against live production (spec written, run pending deploy).
- [ ] Server-side content APIs: feed, posts, stories, circles, DMs with server ACL
      (BACKEND_PLAN.md phases 2+); client API adapter beyond auth.
- [ ] Server sync for follows/connections (currently device-local, honestly labeled).
- [ ] Owner token rotation (VERCEL_TOKEN shared in chat earlier).

## Verified non-goals (unchanged)
No payments, dating, marketplace, voice/video, realtime server, external AI.
