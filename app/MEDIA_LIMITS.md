# Photo posts and Moments

- **Feed:** 0–20 ordered photos; text-only and legacy `Post.photo` posts still work. New posts store `photos` in publishing order and `photo` as the first-photo compatibility alias.
- **Stories / Moments:** 1–20 photos per NEXUS batch. Each becomes a separate frame with its own ID, seen flag, delete action and 24-hour expiry. Selection order is retained. The optional shared caption (280 characters) is applied to every frame. **20 is a NEXUS batch decision, not a verified Instagram Stories limit.** The feed limit matches Instagram's documented 20-item carousel limit.
- **Input:** JPEG, PNG, WebP; at most 10 MB each, 80 MB per native selection, under 40 megapixels. File type/count/size checks run over the whole batch before decoding; decode/resize is sequential to bound memory. No partially prepared batch is added to the draft.
- **Output/storage:** metadata-stripped JPEG, longest edge initially 1200 px (384 for avatars), at most 220,000 data-URL characters per photo. Large native batches are compressed toward a shared 1,200,000-character target. Whole serialized local state retains its existing 1,800,000-character budget; the cover alias counts toward this budget too. The count limit is not a promise that 20 maximum-sized images fit in an already-full browser. Actual localStorage quota/disabled-storage failures are checked before repository publication and retain the draft. No remote media upload.
- **Composition:** native `multiple` picker; later selections append; ordered thumbnail grid; labeled earlier/later/remove buttons; preparation disables edits and publishing. Avatar upload remains single-file.
- **Viewing:** native horizontal CSS scroll-snap, manual advancement (no autoplay), counter, clickable dots, previous/next buttons, Left/Right/Home/End keyboard support, inactive slides removed from keyboard navigation. Photo rails, story strip and suggestion pager hide only their own horizontal scrollbars; visible alternatives remain. Vertical page/modal scrolling stays native.
- **Persistence:** legacy single-photo backups remain valid; malformed `photos`, over-cap arrays, invalid media and inconsistent cover aliases are rejected atomically. Stories keep their existing schema.

## Focused coverage

`src/services/multi-media.test.ts`: compatibility, ordered arrays, 20/21 limits, malformed imports, atomic invalid batches, story frame order/expiry/seen/delete, real storage exceptions and aggregate budget, input count/MIME/size validation.

`e2e/multi-media.spec.ts`: actual multi-file picker, appending, reordering, removing, invalid selection preservation, publishing/reload, dots/buttons/keyboard, ordered separate story frames. `e2e/media.spec.ts` retains single-photo/profile regression coverage with updated composer selectors.
