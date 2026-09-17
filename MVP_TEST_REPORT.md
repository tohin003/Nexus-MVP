# Validation report — final

**Result: all requested acceptance checks executed and passing on 2026-09-17.**

## Commands (final versions, all exit 0)

| Command | Result |
| --- | --- |
| `npm run build` | tsc clean; 1918 modules; CSS 32.82 kB, seed 34.23 kB, main 441.44 kB (gzip 127.39 kB) |
| `npm test` | **78/78** (intelligence 34, repo 40, entry 4) in ~0.25 s |
| `npm run lint` | oxlint: 0 errors, 10 advisory warnings (React-Compiler purity/refs notes on deterministic `Date.now()` filters, a render-time ref mirror, single-effect state resets) |
| `npm audit` | 0 known vulnerabilities |
| `npm run test:e2e` (dev server) | **22/22** in 50.7 s |
| `npm run test:e2e` vs production `vite preview` | **22/22** in 34.8 s — final gate |
| Layout matrix (in the 22) | 12/12: light+dark × 375/390/393/412/430/1440, 312 route audits + 24 keyboard dialog checks, 0 console errors, 0 image failures, 0 horizontal overflow |

## Browser acceptance evidence (Chromium, DOM/geometry — no visual claims)

- `e2e/core.spec.ts` — full loop: Welcome → 18+ → identity → interests (Filmmaking) → skills (Storytelling) → needs (Video Editing) → natural-language intent → **editable structured interpretation** → first matches (Aarav, evidence-based reasons) → profile view → Connect-with-reason sheet → demo recipient acceptance → **single NEXUS introduction** → starter chip → send → delivered/read receipts → **survives reload** → Home → Discover search/people/intents/circles → join Circle → publish collaboration post to circle → reaction persists → zero page errors.
- `e2e/secondary.spec.ts` — privacy toggles + who-can-message + light/dark/system theme persistence; profile validation/save/reload/discard-keep; block confirm/cancel/persist/unblock; report → admin review → dismiss/warn/**suspend** (parametrized, incl. suspension status on the target profile, resolved filter, reload persistence); non-admin admin-gate; reset cancel + confirmed reset (keeps theme, clears storage and onboarding draft); sign-out keeps data and gates protected screens.
- `e2e/layout.spec.ts` — every main route at five mobile widths + desktop in both themes: single h1, all images loaded with alt text, no nested or document-level overflow, ≥44 px nav targets, native dialog focus containment/Escape/restore; report artifact `app/test-results/layout-report.json`.

## Issues found and fixed during validation

1. **Onboarding accessible labels**: hint text inside `<label>` made exact-name resolution fail; hints now render outside the label.
2. **HMR reload storm**: Vite watched Playwright-generated trace HTML, reloading the app mid-test (once reset onboarding mid-run); test artifacts excluded from the watcher.
3. **Inbox tab state**: `#inbox` → `#inbox/requests` kept the Messages tab; screens now remount per name+param.
4. **Parser regression**: "find someone good at video editing" classified editing as offered; nearest-governing-cue fix (needs editing, offers storytelling) + 6 tests.
5. **Block modal had no Cancel** (X only); Cancel added, matching other confirmations.
6. **Reset left the onboarding draft** in sessionStorage; reset clears it.
7. **Modal ref write during render** flagged by oxlint; onClose now read directly.
8. **Seed admin flag**: demo account is admin so moderation is reachable; unit test forces non-admin to verify the gate itself.

## Honest limitations

- QA ran in Chromium only: no real iOS/Android devices, WebKit/Firefox, hardware safe-areas, OS soft keyboards, or screen readers were exercised; no full WCAG/contrast certification (contrast values are reasoned but unaudited).
- The executing model cannot view images: **screenshots were never visually reviewed** (validated binaries/DOM only). Reference PNG 602×903 never visually inspected.
- Desktop is a centered phone frame, not a wide layout; admin QA covered the non-admin gate plus representative review flows, not every moderation state; localization/timezone variants untested.
- Local demo only: no real users, server auth, encryption, or realtime delivery; recipient acceptance/replies are disclosed simulations. The core hypothesis (people glad they met) requires consented pilot measurement, not this artifact.
