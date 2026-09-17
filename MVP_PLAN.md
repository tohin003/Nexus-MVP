# NEXUS MVP execution plan

Goal: introduce people to someone they are genuinely glad they met. PEOPLE → INTENTS → CIRCLES → CONTENT.

## Chunks and gates
0. Read all product prose, extract embedded reference, research current authoritative UX. Preserve later explicit decisions; flag research gaps.
1. Scaffold React/TypeScript/Vite, Tailwind and typed domain model. Isolated deterministic parser, matching and intro composer, realistic local assets/seed, persistent repository. Gate: typecheck and domain tests.
2. Shared mobile design primitives, hash navigation, welcome and five-step onboarding, interpretation preview and first matches, profile and connection flow. Gate: browser core journey.
3. Messaging with local demo recipient simulation, receipts, shared context; finite Home, Discover, notifications. Gate: integration and interaction tests.
4. Posts, purposeful Circles (discuss/people/projects/events), creation, contribution actions. Gate: persistence/membership tests.
5. Privacy/block/mute/report, guarded local moderation, demo restore/reset, local outcome analytics. Gate: service permissions tests.
6. Browser E2E full journey at 375/390/393/412/430 and desktop, light/dark screenshots, console/layout/accessibility checks; fix defects.
7. Production build, README and test evidence, limitations, running URL verification, final handoff.

## Architecture
`app/src/domain` owns types and taxonomy; `services/intelligence` interprets and ranks deterministically; `services/repo` owns application mutations; `repo/db` owns versioned localStorage persistence; `data/seed` owns fixtures and local portrait assets; `ui`/`screens` render state. No client API secrets. Native/backend migration deferred and documented.

## Parallel ownership
Main: integration, shared UI, shell, docs and browser validation.
Intelligence agent: intelligence.ts + its tests.
Seed agent: seed.ts and avatars.
Repository agent: db.ts, store.ts, repo.ts and repository tests.
Never concurrently edit agent-owned files without handoff.
