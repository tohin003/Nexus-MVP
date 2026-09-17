# NEXUS MVP — Status

## Current checkpoint (2026-09-17, handoff)
**MVP complete and validated.** Production build green; 78/78 unit/integration tests; 22/22 browser E2E green twice (dev server and production preview). All 16 checklist items in MVP_TODO.md are done with evidence in MVP_TEST_REPORT.md.

- Live verification: `npm run preview` serving dist at **http://127.0.0.1:4173/** (managed background job bash-26 at handoff; strict port — stop it before starting another server).
- E2E suites: `e2e/core.spec.ts` (full acceptance loop), `e2e/secondary.spec.ts` (safety/privacy/moderation/reset), `e2e/layout.spec.ts` (12 viewport/theme combos, 312 route audits, dialog keyboard checks).

## Late fixes (all validated by the final suite)
- Onboarding hints moved outside `<label>` (accessible-name correctness).
- Playwright artifacts excluded from Vite watcher (HMR reload storms broke tests).
- Route screens remount per name+param (Inbox requests deep link).
- Parser: "find someone good at X" is a need, not an offer (+6 tests → 34).
- Block modal Cancel added; demo reset clears the onboarding draft; Modal render-phase ref write removed; seed `me.isAdmin: true` (demo-only, documented).

## Durable failure log (session history)
- Web search HTTP 402 (provider balance) → recovered via direct authoritative fetches in NEXUS-UX-RESEARCH.md.
- read_image unavailable (model lacks image input) → reference PNG and all screenshots never visually reviewed; DOM/geometry/ARIA-tree QA used instead, stated in every report.
- First E2E failed on missing Home module (real incomplete implementation at the time); later failures were locator/exact-label semantics, not product logic.
- Secondary agent achieved no green run before handoff (seed-order + server-restart flakes); parent takeover produced the passing 9/9 run and then the integrated 22/22.
- Unit test initially assumed a non-admin seed; rewritten to explicitly force non-admin, actually exercising the admin gate.

## Handoff
Read README.md first, then MVP_DECISIONS.md (13 numbered decisions incl. watcher/label/remount rationale), MVP_TEST_REPORT.md (evidence + limitations), MVP_TODO.md. Git initialized at root with the full tree in the initial commit. Production sequence is documented in README.md.
