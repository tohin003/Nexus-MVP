# Validation report — final

**Result: all requested acceptance checks executed and passing on 2026-09-17. Media update (same day): profile photo upload, photo posts, Moments stories and horizontal rails implemented and validated — 89/89 unit, 24/24 E2E, build clean.**

## Media feature evidence (2026-09-17 update)

- `e2e/media.spec.ts` (2 tests): profile photo upload → client resize (300px source kept un-enlarged) → preview → save → survives reload → invalid-file rejection (`bad.txt` shows JPEG/PNG/WebP alert) → removal persists after reload. Photo post: attach → preview → publish → renders in own Home feed (`alt="Photo for …"`) → survives reload; suggested-people rail verified horizontally scrollable (`scrollWidth > clientWidth`, scrolls, no document-level overflow).
- Stories API unit tests (`src/services/stories.test.ts`, 11 new): auth-gating, 24h expiry, seen-state, own-delete, invalid media rejection, v1→stories migration, post photo validation.
- New layout-exemption rule: only `aria-label="Suggested people"` / `"Recent Moments"` rails with `overflow-x: auto` may scroll horizontally; any other nested overflow still fails.
- Client-side resize verified end-to-end: canvas → JPEG data URL, avatar ≤384px / post ≤1200px, ~220 KB cap; quota preflight (write-then-commit) keeps drafts intact when storage is full.

## Commands (final versions, all exit 0)

| Command | Result |
| --- | --- |
| `npm run build` | tsc clean; 1920 modules; CSS 31.18 kB, seed 34.79 kB, main 455.42 kB (gzip 131.32 kB) |
| `npm test` | **89/89** (intelligence 34, repo 51 incl. 11 media/story, entry 4) |
| `npm run lint` | oxlint: 0 errors, 9 advisory warnings |
| `npm audit` | 0 known vulnerabilities |
| `npm run test:e2e` | **24/24** (22 original + 2 media) in ~25 s vs production `vite preview` |

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
