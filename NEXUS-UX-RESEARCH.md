# NEXUS: mobile social UX research and design-system starter

## Evidence and scope

**Core recommendation:** build a calm, people-first product with expressive moments around creating an intent and joining a circle—not an engagement-first content feed.

Research attempted the requested `web_search`, but both calls failed with **HTTP 402: Insufficient Balance** at the configured search provider. Authoritative URLs were subsequently retrieved using `web_fetch`; some JavaScript-heavy pages were read through a text-rendering proxy. Apple HIG pages include 2025/2026 changes, Material 3 Expressive is anchored to its **May 13, 2025** announcement, and Discord includes an **August 4, 2026** design-system update.

**Evidence labels:** **Source rule** = explicitly supported by fetched guidance; **NEXUS recommendation** = proposed implementation informed by those sources, not a vendor specification or proven conversion result. Some older foundational sources remain applicable; their dates are identified. Exact current navigation for every requested app could not be verified. Those gaps are not filled with invented screenshots or tab orders.

Native **pt/dp and CSS px are different units**. Web values below are CSS pixels at default zoom unless explicitly marked native.

## 1. Apple HIG: iOS 18/26-era foundations

1. **Use stable, labeled destinations, not actions, in the bottom bar.** Apple says preserve each section's navigation state, keep tabs available even when empty, avoid overflow, and include short labels. **NEXUS:** four destinations—**People, Circles, Inbox, You**. Intents are embedded in People and profiles; content lives within circles. Use a contextual **New intent** button, not a pretend navigation tab. [Apple: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
2. **Make titles establish hierarchy without consuming every screen.** Current HIG recommends semantic text styles and a **17 pt default** on iOS; avoid thin weights and support text enlargement. **NEXUS:** root title **34/41 px**, detail header **20/26**, body **17/25**, with a compact sticky header after the root title scrolls away. These web sizes are our mapping, not Apple's CSS specification. [Apple: Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
3. **Use one sheet for one short task.** HIG defines medium at approximately half of expanded height and large at fully expanded height; show a grabber for resizable sheets and a visible dismissal alternative. Cancel/Close is leading; Done is trailing for a single-view sheet. Avoid stacked sheets. **NEXUS:** filters at approximately **50% / 90% of app viewport**; message composition and lengthy creation flows get a full-height route. Preserve drafts and warn only if dismissal loses work. [Apple: Sheets, updated March 2026](https://developer.apple.com/design/human-interface-guidelines/sheets)
4. **Glass is a navigation material, not a card style.** Current HIG explicitly says **do not use Liquid Glass in the content layer** and use it sparingly for functional controls. Regular glass handles text better than clear glass; clear is intended above rich media. **NEXUS:** optionally blur the tab bar; keep people, intent, and circle cards opaque. [Apple: Materials, 2025 update](https://developer.apple.com/design/human-interface-guidelines/materials)
5. **Prioritize comfortable targets.** Current HIG lists **44×44 pt default** and **28×28 pt minimum** iOS controls; do not misquote 44 as the current absolute minimum. **NEXUS:** adopt the more generous **48×48 px interactive footprint**, with **24 px icons**, across the mobile web UI. Provide button alternatives to swipes and drag dismissal. [Apple: Accessibility, 2025 refinement](https://developer.apple.com/design/human-interface-guidelines/accessibility)
6. **Keep motion brief, interruptible, and causally coherent.** HIG does not prescribe one universal iOS easing or duration. **NEXUS:** **150–200 ms** state changes, **250–350 ms** sheet transitions; honor `prefers-reduced-motion` with instant changes or short fades, no parallax or bounce. [Apple: Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
7. **Design empty destinations instead of hiding them.** HIG specifically says explain unavailable content rather than disable the tab. **NEXUS:** icon + factual title + one-sentence explanation + one meaningful action: “No circles yet / Find people working toward something you care about / Explore circles.” Distinguish first-use emptiness, zero filter results, loading, and errors. [Apple: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)

## 2. Material 3 Expressive: 2025 guidance

1. **Use expressive hierarchy, not indiscriminate decoration.** The update is an evolution of M3, **not M4**. It introduces 14 new/updated components, emphasized type, richer colors, and 35 decorative shapes. **NEXUS:** one dominant action per screen, differentiated by containment, weight, and color. [Material: Start building with M3 Expressive, May 2025](https://m3.material.io/blog/building-with-m3-expressive)
2. **Separate spatial and effects motion.** M3 Expressive uses **spatial springs** for movement/geometry and **effects springs** for color/opacity. Avoid overshoot on opacity and color. On web, use a spring library only where continuity matters; retain CSS easing fallbacks for routine state changes. Do not market old duration tokens as the new physics system. [Material: Expressive motion introduction](https://m3.material.io/blog/building-with-m3-expressive)
3. **Map color by semantic role.** Distinguish `primary/on-primary`, `primary-container/on-primary-container`, `surface/on-surface`, muted text, and outlines; the “on” token belongs to its paired surface. **NEXUS:** accent for main actions and selected states, tonal accent containers for shared intent/context, neutrals for most content. A one-accent palette is our brand decision—not an M3 requirement. [Material: Color tactics](https://m3.material.io/blog/building-with-m3-expressive)
4. **Let shape encode meaning.** Decorative shape variety should not destroy recognition. **NEXUS:** circular people avatars, rounded-square circle/group icons, moderately rounded content cards, capsule primary buttons. Reserve experimental crops or morphs for at most one or two product moments. [Material: Shape and hero-moment tactics](https://m3.material.io/blog/building-with-m3-expressive)
5. **Keep familiar controls and labels.** Google's research reports poorer usability when conventional song lists became scattered images and email action labels disappeared. **NEXUS:** keep vertical lists, visible names, and text labels; express brand through scale, surfaces, and restrained motion. [Google Design: research behind M3 Expressive](https://design.google/library/expressive-material-design-google-research)
6. **Use verified CSS motion fallbacks.** Official M3 utility easing: `cubic-bezier(.2,0,0,1)`; emphasized entry: `cubic-bezier(.05,.7,.1,1)`; emphasized exit: `cubic-bezier(.3,0,.8,.15)`. Short durations are **50/100/150/200 ms**; medium **250/300/350/400 ms**. Choose a small subset, not every token. [Material: Easing and duration tokens](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs)

## 3. Onboarding: progressive, value-first, conversational

1. **Show useful output before requesting comprehensive setup.** Apple recommends experiential, brief, optional onboarding and postponing nonessential customization. **NEXUS:** show example people/circles, ask for a current intent, then show relevant results; request account creation when saving or contacting. Gate earlier only where privacy, safety, or product access genuinely requires it. [Apple: Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding)
2. **Distinguish progressive disclosure from a long wizard.** Progressive disclosure reveals secondary capabilities when requested; a wizard merely breaks required work into steps. **NEXUS:** initial **three-step hypothesis**—intent → interests → optional location—with an editable summary and visible Back. Test this count; it is not an industry optimum. [NN/g: Progressive Disclosure, foundational 2006 article](https://www.nngroup.com/articles/progressive-disclosure/)
3. **Use conversational language without simulating a human.** Ask “What would you like to make happen?” with structured answers. Avoid fake typing delays, forced free-text chat, or an AI persona unless there is a real assistant. Show and allow editing previous answers. **This is a NEXUS recommendation**, grounded in Apple's short, interactive onboarding guidance—not a verified 2025 conversion benchmark. [Apple: Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding)
4. **Use chips as multi-select inputs, not Next buttons.** Material recommends checkmarks for selected filter chips, concise labels usually **≤20 characters**, **8 dp minimum spacing**, and **48 dp interaction targets**. **NEXUS:** visible **40 px** chips in nonoverlapping **48 px** hit areas, **8 px** visible gaps, wrapping layout, an explicit “Choose up to 5” only if the cap is genuinely needed; use a real button for Continue. [Material: Chips](https://m3.material.io/components/chips/guidelines)
5. **Make progress truthful and reversible.** **NEXUS:** “Step 2 of 3” plus a small determinate bar for a fixed flow. Do not count deferred profile completion as unfinished onboarding. Preserve answers on Back, reload, and authentication return. For branching flows, prefer named stages over a misleading percentage. [NN/g: Staged versus progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
6. **Ask permission at the moment of value.** Offer manual city selection before requesting geolocation; notifications after joining a circle or starting a conversation; contacts only on an explicit import action. **Never require contacts to demonstrate discovery.** [Apple: Onboarding—additional requests](https://developer.apple.com/design/human-interface-guidelines/onboarding)

## 4. Social/community navigation patterns

### Product evidence and verification limits

| Product | Defensible pattern / evidence status | NEXUS implication |
|---|---|---|
| Instagram | Exact 2025/26 bottom-tab order and Discover/Profile arrangement **not verified in this research**; account-level experiments make a single assumed layout risky. | Do not base NEXUS IA on a remembered Reels/Create/Messages order. |
| Threads | Current navigation and post-2025 messaging placement **not verified**; guessed official announcement URLs returned 404 and were excluded. | Separate public participation from private conversations, but validate the exact comparator UI later. |
| Discord | Official **2023 historical** mobile redesign documented Servers, Messages, Notifications, You, with search in Messages and profile/settings in You. This is not proof of today's tab order. Official **2026** source verifies current people-circle / thing-squircle shape semantics and a simplified composer. | Separate communities and personal conversations; do not import Discord's full channel hierarchy. |
| BeReal | Current official page emphasizes a daily two-minute ritual and friends' real-life sharing; exact nav structure not verified. | A strong core ritual can matter more than adding destinations. Avoid coercive timers in NEXUS. |
| Airbuds | Site redirected toward App Store; exact destination and current navigation could not be verified. | Music/shared-activity discovery remains a comparator to inspect, not a sourced nav claim. |
| Partiful | Current official site verifies event-first invitations, guest lists, RSVP, updates, date polls, and photo albums; exact app bottom-nav order not verified. | Organize around a shared occasion and its next action. |
| Substack | Current official app page separates discovery, subscriptions, discussions, and subscriber chats; exact tab order/profile placement not verified. | Keep “my communities/content” distinct from discovery and chat. |

Sources: [Discord historical navigation](https://discord.com/blog/improving-our-mobile-experience), [Discord 2026 shapes/composer](https://discord.com/blog/improving-mobile-with-squircles-styles-and-spacing), [BeReal](https://bereal.com/), [Partiful](https://partiful.com/), [Substack app](https://substack.com/app).

**Implementation rules:**
1. **Four stable bottom destinations:** People, Circles, Inbox, You; **64 px visual bar plus safe-area accommodation**, **24 px icons**, **12/16 px labels**. This is our IA proposal, not a competitor consensus. [Apple tabs](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
2. **Put discovery where the user expects the object.** People contains intent-led people discovery; Circles has Joined/Explore; Inbox contains conversations, Requests, and search. Avoid a generic Discover tab containing every object type. [Discord historical separation](https://discord.com/blog/improving-our-mobile-experience), [Substack](https://substack.com/app)
3. **Keep profile/account predictable.** Put editable identity, current intents, settings, privacy, and saved items in You; preserve scroll and selection on tab switches. [Apple tabs](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
4. **Keep creation contextual.** “New intent” in People; “Create circle” in Circles; compose in Inbox. Avoid a central plus that means different things without explanation. [Apple: navigation versus actions](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
5. **Badge commitments, not engagement bait.** Numeric unread counts for direct conversations and explicit mentions; no badge for generic recommendations. Every activity item should deep-link to its relevant object. [Apple tabs](https://developer.apple.com/design/human-interface-guidelines/tab-bars), [Discord actionable notifications](https://discord.com/blog/improving-our-mobile-experience)

## 5. Messaging UX

1. **Use a scannable conversation list.** **NEXUS:** **80 px minimum row**, **48 px avatar**, **16/22 px name**, one or two preview lines, **12/16 px timestamp**. Unread combines semibold name, dot/count, and accessible “3 unread messages”; don't rely on color alone. Allow favorites/pins above recent conversations. [Discord Messages patterns](https://discord.com/blog/improving-our-mobile-experience), [Apple accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
2. **Retain the reason people connected.** **NEXUS:** thread header shows name plus a tappable shared-context line—“Both planning a weekend photo walk”—linking to the originating intent/circle. Keep this to **one or two lines**, expandable rather than a tall permanent card. Header opens members, shared media, and conversation controls. [Discord shared-details pattern](https://discord.com/blog/improving-our-mobile-experience), [Geneva contextual communities](https://www.geneva.com/about)
3. **Show real, transient typing state.** Geneva explicitly supports typing indicators. **NEXUS:** reserve a **20 px status line**, show “Maya is typing…” only from live events; expire after roughly **5 seconds** without renewal. Use static text under reduced motion and avoid announcing each animation frame. Timing is a product default, not a sourced standard. [Geneva features](https://www.geneva.com/about)
4. **Distinguish sent, delivered, read, and failed.** **NEXUS recommendation:** accessible status text on the latest outgoing message; “Read” only after an actual visibility/read event, not a fetched response. Provide receipt privacy settings and retry for failure. Never fabricate presence or receipts. [Apple: perceivable feedback and accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
5. **Keep the composer spacious.** **NEXUS:** attachment menu, expanding text input, and a **48 px send target**; hide low-frequency tools behind plus. Suggested replies may be chips, never auto-send. Discord's 2026 update explicitly moved less-used actions into plus to recover writing space. [Discord 2026 composer](https://discord.com/blog/improving-mobile-with-squircles-styles-and-spacing), [Material chips](https://m3.material.io/components/chips/guidelines)
6. **Make safety accessible, not prominent by accident.** **NEXUS recommendation:** Block and Report in the thread/profile overflow, message-level Report via long-press **and** keyboard-accessible menu, and direct safety actions on message requests. Separate mute, block, and report labels; explain consequences and report completion. This placement is a proposed safety pattern; attempted Discord help verification was blocked. [Apple: gesture alternatives](https://developer.apple.com/design/human-interface-guidelines/accessibility)

## 6. Profiles and non-dating people discovery

1. **Lead with purpose and contribution, not appearance ranking.** **NEXUS:** avatar **56–64 px** in discovery rows; name, current intent, “can offer,” and availability before media. Use a scrollable list or card grid, not full-screen one-person swipe decisions. This is a NEXUS hypothesis to test, informed by group/activity-led Geneva discovery. [Geneva](https://www.geneva.com/about)
2. **Replace “People you may know” with useful cohorts.** “Working on similar things,” “Available this weekend,” “In your circles,” and “Can help with your intent.” Keep manual city/time filters editable; do not infer sensitive traits. [Geneva location + interest discovery](https://geneva.com/)
3. **Explain recommendations using verifiable facts.** **NEXUS:** show **two specific reasons**: “Both learning ceramics” and “Available Saturday.” Link to edit matching preferences. Avoid opaque “98% compatible” scores and invented commonality. [Material informative containment](https://m3.material.io/blog/building-with-m3-expressive)
4. **Use low-pressure actions.** Primary “Ask about this intent”; secondary Save; overflow Hide suggestion. A draft opener references the shared intent but requires explicit Send. Never use hearts, hot-or-not framing, or rejection animations. [Material contextual chips versus major buttons](https://m3.material.io/components/chips/guidelines)
5. **Treat identity as adjustable and bounded.** **NEXUS:** optional pronouns and coarse location; visible profile preview; explicit audience controls for intents; full profile uses **88–96 px avatar**, short bio, current intents, circles, then content. Circle avatars and rounded-square group icons reinforce object type. [Discord 2026 semantic shapes](https://discord.com/blog/improving-mobile-with-squircles-styles-and-spacing)

## 7. Purposeful circles and communities

1. **Make purpose and next action visible immediately.** **NEXUS:** circle header = purpose sentence, host, member count, cadence, next milestone/event, and one join/participate CTA. “Ship a first short film in six weeks” is more actionable than a vague “Creators” label. [Partiful event-first coordination](https://partiful.com/), [Geneva](https://www.geneva.com/about)
2. **Separate durable knowledge from live chat.** Geneva offers chat rooms, forum rooms, events, roles, and pins. **NEXUS MVP:** Overview, Conversation, Plans/Resources—do not start with dozens of empty channels. Add room types only when real activity needs them. [Geneva room types](https://www.geneva.com/about), [NN/g progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
3. **Design an explicit joining state machine.** Preview → Request/Join → Pending if moderated → Welcome → First useful action. State public/private, entry expectations, and who can see posts before joining. Ask only a short purpose-specific question when moderation needs it. [Geneva membership questionnaires and roles](https://www.geneva.com/about)
4. **Build coordination into the group.** Date polls, RSVP, timezone-aware schedules, reminders, and a pinned next step reduce chat archaeology. **NEXUS:** a persistent compact “Next up” card, not an algorithmic feed above the event. [Partiful polls, RSVP, updates](https://partiful.com/)
5. **Show meaningful health signals.** Prefer “Next session Friday,” “8 members contributed this week,” or “3 open requests” over raw member counts alone. Give hosts moderation tools and members mute/leave controls. Avoid manufactured urgency, streak penalties, and engagement-only success metrics. **These are NEXUS product recommendations.** [Geneva roles/events](https://www.geneva.com/about), [Discord communities](https://discord.com/community)
6. **Use small recurring rituals.** Weekly “What are you trying next?” prompts or opt-in check-ins can create continuity; make them skippable and asynchronous. BeReal demonstrates ritual-centered product positioning, not proof that its time pressure belongs in NEXUS. **Heart to Heart** is ambiguous without a specific product URL and was not verified; no features are attributed to it. [BeReal](https://bereal.com/)

## 8. Design-system direction for 2026

1. **Editorial hierarchy is well-supported; oversized type everywhere is not.** Use **34–40 px display** for root/hero moments, **22–28 px sections**, and **16–17 px body**. Emphasized type is an explicit M3 Expressive update. Keep the majority of interaction text practical. [M3 Expressive typography](https://m3.material.io/blog/building-with-m3-expressive)
2. **Semantic shape is more useful than fashionable shape variety.** People circles, communities rounded squares, content rounded rectangles. Discord's 2026 update provides a direct contemporary example. [Discord design-system update](https://discord.com/blog/improving-mobile-with-squircles-styles-and-spacing)
3. **Graphite + one accent is a NEXUS positioning choice, not a universal 2026 trend.** Both restrained and rich expressive palettes coexist. Keep surfaces neutral, reserve violet for action/selection, and use separate semantic status colors. [Google research: calmer preferences and context](https://design.google/library/expressive-material-design-google-research)
4. **Use tonal depth before heavy shadow.** Elevate dark surfaces by lightening their tone; use a thin boundary when needed. **NEXUS:** ordinary cards **no shadow**; menus/sheets `0 12px 40px rgb(0 0 0 / .24)` as a starting point. [Apple Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
5. **Constrain glass to functional chrome.** Optional **20 px backdrop blur** with a substantially opaque backing is our web approximation, not native Liquid Glass. Never depend on blur for legibility; supply an opaque fallback and test scrolling performance. [Apple Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
6. **Web tactile feedback must be visual first.** **NEXUS:** a **100 ms** pressed fill change, optional **0.98 scale**, immediate checkmark after selection, and clear success/error text. The Vibration API has limited availability; do not promise native iOS haptics. Optional vibration is only progressive enhancement. [MDN Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API), [Apple Motion](https://developer.apple.com/design/human-interface-guidelines/motion)

## 9. Dark-mode implementation

1. **Use graphite by choice, not dogma.** NEXUS base **#111214**, card **#191B1F**, elevated **#22252B**, high **#272A30**. Pure black is not forbidden: Discord explicitly offers OLED Onyx. The important rule is legibility and hierarchy. [Apple Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode), [Discord Onyx](https://discord.com/blog/improving-mobile-with-squircles-styles-and-spacing)
2. **Meet WCAG per actual adjacent pair.** Normal text **≥4.5:1**; large text **≥3:1** at **24 CSS px regular or approximately 18.67 px bold**; meaningful non-text controls/states generally **≥3:1**. Prefer **7:1** for primary/small text when practical. Placeholders also count; muted is not an exemption. [WCAG 2.2 contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
3. **Define mode-specific semantic tokens, not inverted colors.** In dark mode use lighter violet **#B7A4FF**, dark on-accent text **#21183D**, and a subdued violet container **#2D2540**. Don't reuse a saturated light-theme purple indiscriminately. [Apple adaptive colors](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
4. **Make higher layers lighter.** Cards → menus/sheets progressively brighten, following Apple's base/elevated model. Decorative separators can be subtle; if a boundary is needed to identify an interactive control, use the stronger outline token and verify contrast. [Apple Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
5. **Respect the system and accessibility preferences.** Default to `prefers-color-scheme`; set `color-scheme: light dark`. If a web-app override is offered, label System/Light/Dark and default System—an intentional web-product choice, since Apple's native HIG discourages redundant app-specific appearance controls. Support reduced motion, high contrast/forced colors, and opaque material fallbacks. [Apple Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
6. **Audit assets separately.** Avoid glaring white-backed illustrations; provide mode-appropriate interface art and test text over images. Do not indiscriminately darken people's photos or change their skin tones. [Apple images in Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)

## 10. Mobile web in a desktop phone-like viewport

1. **Make the phone frame a presentation wrapper, not a scaled screenshot.** **NEXUS:** desktop content width **390–430 px**, suggested **420 px**; height `min(900px, calc(100dvh - 48px))`. At narrow widths remove the frame, outer padding, and decorative bezel. Never `transform: scale()` the whole app to fit. These dimensions are recommendations, not platform standards. [web.dev viewport units](https://web.dev/blog/viewport-units)
2. **Account for browser chrome with dynamic units.** Use a `100vh` fallback followed by `100dvh`; ensure flex children can shrink with `min-height:0`. `dvh` responds to dynamic browser chrome but does **not** by itself solve all on-screen keyboard occlusion. Test Safari/Chrome, orientation changes, and a focused composer. [web.dev viewport units](https://web.dev/blog/viewport-units)
3. **Use real safe-area values.** `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`; horizontal padding `max(20px, env(safe-area-inset-left, 0px))`; bottom bar padding `max(12px, env(safe-area-inset-bottom, 0px))`. Do not disable zoom. The authoritative WebKit foundation is from **2017**, still relevant. [WebKit safe-area guidance](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
4. **Never invent safe areas on real devices.** Desktop decorative bezel/insets should be independent CSS tokens; browser `env()` values are normally zero on desktop. If the frame needs a simulated inset, apply it only to that wrapper, not as hard-coded iPhone padding throughout the product. [WebKit: safe areas are not margins](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
5. **Keep overlays in the same coordinate system as the app.** **NEXUS:** one shell containing header, a single main scroll area, nav, and a local overlay portal. Scope scrims/sheets to the phone viewport on desktop; do not pin them to the entire browser while the app remains 420 px wide. Trap focus only in modal dialogs, allow Escape, restore focus, and prevent background scrolling. [Apple sheet context](https://developer.apple.com/design/human-interface-guidelines/sheets)
6. **Honor desktop input and browser navigation.** Provide visible keyboard focus, real links for routes, browser Back support, mouse-accessible alternatives to gestures, and 200% text-resize checks. A phone frame is not permission to ship touch-only behavior. Use **48 px** target footprints even though WCAG 2.2 AA's base target-size criterion is **24×24 CSS px with exceptions**. [Apple Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [WCAG target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

# NEXUS design-system starter

**Design intent:** warm, precise, quietly expressive. People and purposeful activity lead; content provides evidence and continuity.

All tokens below are **proposed NEXUS defaults**. They are not copied native specifications.

## Color tokens

| Role | Light | Dark | Usage |
|---|---|---|---|
| Canvas | `#F7F7F5` | `#111214` | Main background |
| Surface | `#FFFFFF` | `#191B1F` | Cards and rows |
| Surface elevated | `#FFFFFF` | `#22252B` | Sheets, menus |
| Surface high | `#ECEDEF` | `#272A30` | Selected/hovered neutral regions |
| Text primary | `#18191C` | `#F5F5F7` | Names, titles, body |
| Text secondary | `#62646C` | `#B5B8C2` | Descriptions |
| Text muted | `#6D7079` | `#959BA7` | Metadata; verify lighter light-mode surfaces |
| Decorative divider | `#DADCE1` | `#383C45` | Nonessential separators only |
| Control outline | `#858892` | `#777D89` | Boundaries necessary to identify controls |
| Accent | `#6441C8` | `#B7A4FF` | Main action, link, active indicator |
| On accent | `#FFFFFF` | `#21183D` | Filled primary button label |
| Accent container | `#EEE8FF` | `#2D2540` | Shared-context / selection tone |
| On accent container | `#432887` | `#DDCEFF` | Tonal labels |
| Success | `#216E4E` | `#81D6A7` | Success text/icon plus semantic label |
| Warning | `#805400` | `#E9C46A` | Warning text/icon plus label |
| Danger | `#B42335` | `#FF9AA5` | Destructive/report status |

Contrast was calculated for representative opaque pairs: light primary/canvas **16.39:1**, light secondary/white **5.90:1**, light muted/canvas **4.61:1**, white/on light accent **6.70:1**, dark primary/canvas **17.21:1**, dark secondary/surface-high **7.26:1**, dark muted/surface-high **5.15:1**, dark button label/accent **7.74:1**, strong outline/white **3.54:1**, dark outline/surface-high **3.48:1**. **These are pair checks, not a blanket accessibility certification**; all hover, disabled, overlay, image, and status combinations still require testing. Light muted is intentionally near the minimum: use secondary rather than muted on darker neutral containers.

## Typography

Use `font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`; load only needed weights, or choose system-ui only. Do not self-host Apple's font files without checking their license.

| Token | Size / line height | Weight | Use |
|---|---|---|---|
| Display | `40 / 44` | 650–700 | Onboarding value/rare hero |
| Page title | `34 / 41` | 650–700 | Root pages |
| Title | `28 / 34` | 650 | Major detail title |
| Section | `22 / 28` | 600 | Sections |
| Card title | `18 / 24` | 600 | People/intents |
| Body | `17 / 25` | 400 | Reading and conversation |
| Body small | `15 / 22` | 400–500 | Descriptions |
| Label | `14 / 20` | 600 | Buttons/chips |
| Caption | `12 / 16` | 500 | Dates, tab labels |

Use rem values relative to the browser default. Display tracking around `-.02em` is optional for Inter; body uses normal tracking. Avoid applying those values blindly to SF or other scripts. No essential information below 12 px; all text must survive zoom/reflow.

## Spacing and layout

- Scale: **4, 8, 12, 16, 20, 24, 32, 40, 48, 64 px**.
- Screen gutter **20 px**; card padding **16–20 px**; card/list-section gap **12–16 px**; section gap **28–32 px**.
- Touch footprint **48×48 px**; major CTA height **52 px**; field height **52 px minimum**; conversation row **80 px minimum**, grow for larger text.
- Icon **24 px** standard, **20 px** inline; avatar **32/48/64/96 px** by role.
- Desktop phone viewport **420 px** preferred, responsive from **320 px** upward; never lock content to an unshrinkable width.

## Radius and component shapes

Scale: **0, 8, 12, 16, 20, 28, 999 px**.

- People avatars: **circle**.
- Circle/group icons: **rounded square**, radius roughly **25% of icon dimension**.
- Content cards: **20 px**; compact nested cards **12–16 px**.
- Inputs: **12–16 px**; selected-interest chips **999 px** (intentional NEXUS departure from M3's default 8 dp chip corners).
- Primary CTA: **capsule**, secondary buttons **12–16 px**; keep geometry stable between states.
- Sheets: **28 px top corners**; menus **16 px**.
- Decorative surfaces can use subtle boundaries; form controls need sufficiently contrasting boundaries/fills when needed for recognition.

## Motion tokens

| Token | Duration | Easing | Use |
|---|---:|---|---|
| Feedback | `100ms` | `cubic-bezier(.2,0,0,1)` | Press fill/opacity |
| State | `150ms` | `cubic-bezier(.2,0,0,1)` | Chip/check/selection |
| Utility | `200ms` | `cubic-bezier(.2,0,0,1)` | Menus, compact expansion |
| Enter | `300ms` | `cubic-bezier(.05,.7,.1,1)` | Sheet entry |
| Exit | `200ms` | `cubic-bezier(.3,0,.8,.15)` | Sheet dismissal |
| Hero | `400ms` | `cubic-bezier(.2,0,0,1)` | Rare successful circle/intent reveal |
| Reduced | `0–100ms` | `linear` | Instant state or short opacity fade |

Gesture-driven sheets should follow the pointer directly and then settle; use an interruptible spring implementation if available, not an artificial fixed delay. Spatial overshoot must be subtle; opacity never overshoots. No loading animation should fabricate work or delay navigation.

## Five don'ts

1. **Don't turn people into a dating deck:** no hot-or-not swiping, compatibility percentages, or giant photo-first cards as the only discovery mode.
2. **Don't make everything glass, violet, or animated:** keep content opaque and reserve emphasis for actual priorities.
3. **Don't force exhaustive profiles, contacts, notification access, or a tutorial before value.**
4. **Don't fake social proof:** no invented matches, presence, unread counts, typing, scarcity, or read receipts.
5. **Don't let the phone frame break the web:** no disabled zoom, clipped large text, keyboard-covered composer, full-browser scrims around a narrow app, or gesture-only actions.

## Follow-up research needed

Capture dated, platform/account-specific screenshots for Instagram, Threads, Airbuds, BeReal, Partiful, and Substack; verify exact bottom destinations, Discover placement, Profile placement, and message-request safety controls. Clarify which Heart to Heart product is intended. Run formative tasks on NEXUS: discover someone through intent, understand why recommended, join a circle, return to a conversation, and block/report. Measure successful purposeful connections and repeat circle participation—not just minutes spent scrolling.
