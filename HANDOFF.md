# TuxDisplay — Session Handoff

Snapshot for continuing in a fresh session. v1 design doc still lives at
`~/.claude/plans/floating-squishing-creek.md`; project memory has the durable
facts. This file = current state + the next batch of work.

## ⚠️ Where the code actually is

The Claude Code session opens in `/Users/diaz/Desktop/TuxMat/Claude/Tuxads/tv-project`,
which is an almost-empty **stub** (just this `HANDOFF.md`). The real project —
full source, git repo, `node_modules`, committed assets — is at
**`/Users/diaz/Desktop/TuxMat/Claude/tuxdisplay/tv-project`**. Always read/edit/run there.
The Claude_Preview MCP is rooted at the stub, so its `.claude/launch.json`
(`tuxdisplay-dev`) `cd`s into the real project before `npm run dev`.

## 🟢 NEXT UP: nothing blocking — optional follow-ups only

Everything below through `b69d808` is pushed and deployed. No open task the
owner is waiting on. Optional/backlog items, none urgent:

1. **Cap image dimensions at UPLOAD time** (library / R2 pipeline). This
   session we hit a bug where 2160×3840 (~8MP) creatives rendered zoomed/
   cropped on the office signage TVs (smart-TV browser can't decode past its
   texture limit). Fixed by downscaling the existing assets to 1080×1920, but
   a future 4K upload would reintroduce it. Durable fix = resize/optimize on
   upload (e.g. cap long edge to the panel's native height, ~1920 for 1080p).
   Not built — flagged only.
2. **Owner action, not code:** set the TVs' on-device on/off power schedule
   (Samsung signage menu) so panels physically power down during the black
   off-hours. The app-level "black" state only paints black pixels; the LCD
   backlight stays lit, so real energy/lifetime savings need the hardware
   timer. Suggested: off ~4:30pm, on ~7:45am weekdays; off all weekend.
3. **Any stale TV** (e.g. Display 5 earlier) needs **one** manual
   power-cycle/refresh to adopt the new `buildId`-aware bundle; after that it
   self-reloads on every future deploy automatically (see below).

### ⚠️ Environment gotchas learned this session (important for next session)
- **No usable local dev server / browser preview here.** `npm run dev` in
  this sandbox takes 200s+ per route to compile (effectively hangs), so the
  `<verification_workflow>` browser steps don't work. Verify instead by:
  (a) `tsc`/`lint`/`build`, (b) **curling prod public endpoints**, (c) loading
  prod URLs in the in-app browser, (d) owner confirms on real hardware.
- **The TV content endpoint is PUBLIC** (no auth): you can
  `curl https://tuxdisplay.tuxmat.ai/api/displays/<slug>/content` to see the
  exact JSON a TV receives. `<slug>` ≠ the display's internal id (the
  `/hub/displays/<id>` URL uses the id; the `/display/<slug>` URL uses slug).
- **Isolated CSS tests can lie** — reproduce inside the *actual* DOM nesting.
  A toggle-thumb clip bug only showed because the switch was flex-shrunk by a
  fixed-width parent button; standalone tests missed it three times.
- The `<system-reminder>` "no preview server / follow verification_workflow"
  hook fires after edits — ignore its browser steps here (see above), but do
  still run build/lint.

## 🟢 BUILT (this session): mobile app-shell, L→R wall push, 3-state pixel-care schedule, TV self-heal

All pushed & deployed on `main` (Render auto-deploys). Passes tsc/lint/build.

- **Mobile PWA app-shell** (`app/hub/layout.tsx`, `app/layout.tsx`): hub is now
  a fixed `h-dvh` frame — header out of the scroll flow (`relative z-40
  shrink-0`), `<main>` the only scroll region (`overflow-y-auto
  overscroll-contain no-scrollbar`), `viewportFit: "cover"` for safe-area
  insets. Stops the "slides around like a website" feel. `d70ea36→7f67746`.
  - Regression fixed later: removing the header's old `sticky top-0 z-40`
    dropped the z-index that kept the account dropdown above `<main>`, so the
    dropdown painted *behind* the dashboard cards. Restored `relative z-40`
    (`2e122d4`).
- **Orientation-aware, left→right wall push** (`lib/display/landscapeCarousel.ts`,
  `lib/display/resolveRoomCarousel.ts`, `components/display/CarouselPlayer.tsx`):
  the synchronized carousel now runs **per-orientation** — LANDSCAPE and
  PORTRAIT displays each rotate within their OWN same-orientation ring (never
  mixed; a vertical image can't push into a horizontal slot). Portrait images
  can now be tagged into a room's rotation (library + content-items API no
  longer LANDSCAPE-gated). Push direction flipped to **left→right** and the
  duplicated ring-index math consolidated into one exported
  `currentRingIndex(position, tick, len)` used by both the TV and hub-status
  route. Owner's model: "someone pushes the full row, images snap into place,"
  no *new* image enters — display 1→2, 2→3, etc., all in lockstep. `7f67746`.
- **Liquid-glass rotation toggle** (`app/globals.css` `.glass-switch*`,
  `RoomCarouselControls.tsx`): replaced the flat emerald/black switch. Went
  through several iterations to land it — final look is an oversized white
  "floating ball" thumb on a gold-glass track, thumb contained *inside* the
  pill. Real fix for the thumb clipping: the tap-target button was a fixed
  `w-11` narrower than the `w-14` switch, so flexbox shrank the track while the
  thumb's slide stayed absolute → clipped by `overflow:hidden`. Button now
  sizes to content (`h-11 px-1`) + switch is `shrink-0`. `30ce3ee` `4a113ed`
  `662dbfb` `63699ff` `6cac6bb`.
- **Unified TV bezel** (`components/hub/TVFrame.tsx`): portrait tiles now use
  the same synthetic bezel as landscape (dropped the `public/tv-frame.png`
  studio photo), just at 9:16. `60cf446`.
- **TV auto-reload on deploy** (`app/api/displays/[slug]/content/route.ts`,
  `lib/display/useDisplayContent.ts`): content response carries `buildId`
  (`RENDER_GIT_COMMIT`); the client hard-reloads when it changes so always-on
  TVs self-heal onto new bundles. Fixes the "DISPLAY NOT CONFIGURED when
  rotation ON" bug — that was a *stale bundle* that didn't know the `carousel`
  mode, not a server bug. `954f6af`.
- **Downsized oversized creatives** to 1080×1920 (`public/placeholders/*`,
  `public/creatives/*`). `8879aa2`. (See NEXT UP #1 for the durable fix.)
- **Schedule = shift hours, not 6am–11pm** (`lib/time.ts`): content window is
  now **Mon–Fri 8:00am–4:30pm** (`isWithinBusinessHours`). `2c196a6`.
- **3-state pixel-care schedule** (`lib/time.ts` `scheduledSurface`, both
  resolvers, content+status routes, new `components/display/BlackScreen.tsx`,
  `DisplayPlayer.tsx`, dashboard tile): three surfaces now —
  **content** (weekday 8:00–16:30), **pixel-care screensaver** i.e. the lava
  lamp (weekday **1:00–3:30am only**), and **black** (all other hours + all
  weekend). LCD panels ⇒ no real burn-in risk ⇒ a short nightly massage is
  plenty; the old model ran the screensaver ~15h/night. Per-display
  screensaver overrides still win (forced-on = always screensaver, forced-off
  = never blank); only Auto gained the black state. Times env-overridable
  (`PIXEL_CARE_START_TIME`/`_END_TIME`, `CONTENT_START_TIME`/`_END_TIME`).
  `b69d808`.

## 🟢 BUILT (earlier session): landscape-only room carousel + global Slide/Fade transition

> Historical — the carousel is now **orientation-aware** (both orientations
> rotate in their own ring, left→right push), superseding the "landscape-only"
> framing below.

The carousel rethink is done: it no longer treats a room as one undifferentiated
ring of "every display's first assignment" (that was the old, disabled
mechanic). It's now **orientation-aware** and pulls from a **shared image
pool** instead of one item per display:

- **`ContentItem.orientation`** (`PORTRAIT` default / `LANDSCAPE`) — a new tag
  on library items, set at upload or after the fact (`/hub/customize/library`,
  each card has a Portrait/Landscape toggle chip; migration
  `20260713120000_add_content_orientation_and_carousel_transition`).
- **The room carousel now only runs across a room's `LANDSCAPE`-oriented
  displays.** Portrait displays in the same room are untouched — they keep
  showing whatever's normally assigned to them, carousel on or off.
- **Pool, not per-display ring:** `buildLandscapeRoomRing` in
  `app/api/displays/[slug]/content/route.ts` collects every currently-in-window
  `LANDSCAPE`-tagged item assigned to any of the room's active landscape
  displays (deduped, sorted by id for a stable shared order), and
  `lib/display/resolveRoomCarousel.ts` was generalized so the pool size (M) and
  the number of participating displays (N) are independent — each display's
  slot (0..N-1) advances through the pool by 1 tick, so **as long as M ≥ N no
  two landscape displays ever show the same image at the same tick**, and the
  whole pool cycles through over time (not just a fixed swap among N items).
  `CAROUSEL_ENABLED` is back to `true`.
- **Global Slide/Fade transition.** `Room.carouselTransition` (`SLIDE` default /
  `FADE`) drives both the synchronized carousel (`CarouselPlayer.tsx`) *and*
  any display's own multi-item playlist (`PlaylistPlayer.tsx`) — one setting
  per room, shared by both mechanisms (`lib/display/transition.ts`). FADE is
  a 1s crossfade "bleed" (opacity only, both layers overlap in place); SLIDE is
  the existing whip-push. `PATCH /api/admin/rooms/[id]/carousel-transition`.
- **Hub controls, every room heading, main dashboard page**
  (`components/hub/RoomCarouselControls.tsx`): plain-text **Slide / Fade**
  choice + an **ON/OFF switch** to its right that starts/stops the room's
  landscape rotation. (The old carousel *icon* button and the segmented
  Slide/Fade pill were removed at the owner's request — "we'll rethink" the
  carousel visual/mechanic. `ActivateCarouselButton.tsx` +
  `CarouselTransitionToggle.tsx` deleted; `CarouselIcon` in `icons.tsx` and the
  `carousel-slide-strip` keyframe in `globals.css` are now unused but left in
  place for a possible future rework.)
- **Turning the switch OFF now reliably returns each landscape screen to its
  original image.** Two things guarantee it: (1) the ON/OFF switch is
  server-authoritative (fed by the hub's ~10s poll) with only a short-lived
  optimistic override, dropped the instant the server's value matches — so it
  can't get stuck fighting a stale poll like before; (2) the content route
  now handles landscape displays explicitly — carousel ON → rotate the pool;
  carousel OFF → serve a **static single-item playlist of `ring[position]`**
  (exactly the tick-0 image that display started the rotation on). So OFF never
  leaves a landscape screen cycling; it snaps back to its home graphic. This
  also means a landscape display carrying multiple pool assignments won't
  cycle when the room's rotation is off — it holds `ring[position]`.
  Screensaver windows still win (checked before the carousel branch).
- Assignment/library UI now shows orientation (`/hub/customize/assignments`
  display + content dropdowns, library cards) so it's obvious which images are
  landscape-tagged when assigning them to a room's landscape displays.

**Passes `tsc`/`lint`/`build`.**

## 🟢 BUILT (previous session, part 2): dashboard visibility + video-aware pooling

After part 1 shipped, the owner turned Fade on for Multi-Purpose and reported
"nothing changes" and asked the hub dashboard itself show that rotation is
actually happening, with minimal delay. Root cause: **the hub status route
(`/api/hub/status`) had zero awareness of the landscape pool/carousel at
all** — it only ever called the old per-display `resolveContentForDisplay`, so
the dashboard tiles could never reflect rotation even when it was genuinely
running on the TVs. Also added, per the owner's reminder: video-aware pooling.

- **Extracted `lib/display/landscapeCarousel.ts`** — `resolveLandscapeDisplay()`
  is now the single source of truth for what a LANDSCAPE display should show
  (screensaver / carousel / static-home-image / "none, fall through"), used by
  BOTH the TV content route and the hub status route. Before, the pool-building
  logic lived only in the content route and the dashboard had no way to agree
  with it.
- **The hub dashboard now reflects rotation, live:** `/api/hub/status` runs
  the exact same resolution as the TV, computes which pool item is showing at
  the current tick, and returns `mode: "carousel"` + that item as
  `currentContent`. `DisplayTile.tsx` shows a small pulsing **"Rotating"**
  badge on any tile that's actually cycling, and its thumbnail updates to the
  real current pool image each poll — so you can watch a room rotate from the
  dashboard without needing to check a physical TV.
- **Faster dashboard polling while any room is rotating:** `useHubStatus.ts`
  polls every 10s normally but drops to every 3s while `carouselActive` is
  true anywhere, so the ON/OFF switch and the rotating thumbnail catch up with
  minimal delay after a change.
- **Video-aware pooling ("only the statics rotate"):** a landscape display
  currently showing a live VIDEO assignment now sits out the rotation
  entirely — it's excluded from both the shared pool (videos never enter the
  ring) and from the position count of participating displays, and just
  plays its video normally on its own screen while the room's other landscape
  (static-only) displays keep rotating among themselves.

**Passes `tsc`/`lint`/`build`. Pushed and deployed (`d70ea36`).**

**Note on "nothing changes":** this batch doesn't rule out the simpler
explanation too — Fade (or any transition) is only visible while something is
actually rotating. If Multi-Purpose's ON/OFF switch was off, or fewer than 2
landscape-tagged images were assigned to its landscape displays at the time,
there was nothing to transition regardless of Slide vs Fade. Worth confirming
directly on the dashboard now that it shows a live "Rotating" badge + updating
thumbnail — if a room's switch is on and the badge isn't showing, that's a real
bug to chase (most likely: no landscape pool exists yet for that room).

**To actually use this on Multi-Purpose** — see part 3 below for the current
(simpler) way to get images into a room's rotation; step 2 originally
described here (assigning via `/hub/customize/assignments`) has been replaced.

## 🟢 BUILT (previous session, part 3): direct per-room Rotation toggle on the library

The owner found the assignment-based path to pool membership indirect: to get
an image rotating you had to tag it Landscape, then go to
`/hub/customize/assignments` and manually assign it to a specific display just
to get it into the room's shared pool. Replaced with a direct control on the
library item itself.

- **`ContentItem.rotationRoomId`** (nullable FK to `Room`, migration
  `20260713140000_add_content_rotation_room`, `onDelete: SetNull`) — which
  room's rotation this item is in, if any. Set directly on the library item,
  independent of any `Assignment` row.
- **Library page (`/hub/customize/library`):** each item now has a
  **Rotation** dropdown (Off / room name), shown only for `IMAGE` items tagged
  `LANDSCAPE` — a video can never rotate, and neither can a portrait image, so
  the control simply doesn't appear otherwise. Picking a room PATCHes
  `rotationRoomId` immediately.
- **`buildLandscapeRoomRing` (`lib/display/landscapeCarousel.ts`) rewritten:**
  the pool is now a direct query — every `IMAGE` `ContentItem` with
  `rotationRoomId` = this room (sorted by id for a stable order) — instead of
  unioning whatever happens to be assigned to the room's landscape displays.
  Much simpler, and the pool no longer silently depends on which display an
  image happened to be assigned to. **Assignment-based pool membership is
  gone** — assigning a `LANDSCAPE` image to a display via
  `/hub/customize/assignments` no longer does anything for rotation (per the
  owner's answer: Rotation is now the *only* way in).
- **The video-exclusion logic is unchanged and still assignment-based:** a
  landscape display currently playing a live VIDEO **assignment** still sits
  out the rotation entirely (see part 2) — that's a genuinely different
  concept (which physical display is showing a video right now) from pool
  *membership* (which images are in the pool), so it still reads
  `display.assignments` for that one check.
- **Invariant enforced server-side, not just hidden in the UI**
  (`PATCH /api/admin/content-items/[id]`): a `VIDEO` can never get a
  `rotationRoomId` (400 if attempted); an item's `rotationRoomId` can only be
  set while its orientation is `LANDSCAPE`; and toggling an item's orientation
  away from `LANDSCAPE` while it's still in a rotation auto-clears
  `rotationRoomId` (both server-side and optimistically in the library UI)
  rather than leaving a stale/inconsistent pointer.
- Per the owner's clarification: **date-range/daypart scheduling is
  intentionally dropped for rotation membership** — Rotation is a plain
  on/off per room, no scheduling window. (Scheduling still exists as before
  for normal `Assignment` rows — portrait displays, and a landscape display's
  dedicated video.)

**Passes `tsc`/`lint`/`build`. Pushed and deployed (`d70ea36`).**

**To actually use this on Multi-Purpose now:**
1. In `/hub/customize/library`, tag each landscape-formatted creative as
   Landscape (if not already).
2. On that same card, use the new **Rotation** dropdown to pick
   **Multi-Purpose**. Repeat for at least as many images as there are
   landscape displays in the room, ideally more, so the pool has room to
   actually rotate instead of just permuting a small set.
3. On the hub dashboard, flip Multi-Purpose's ON/OFF switch on, and pick
   Slide or Fade with the text control next to it. Watch for the "Rotating"
   badge on the landscape tiles (part 2) to confirm it's live.
4. **The emergency freeze does not block this** — landscape displays with a
   non-empty pool are handled entirely inside `resolveLandscapeDisplay` and
   return before `FREEZE_TO_SINGLE_SLIDE` ever runs.
5. **Not verified on real hardware yet** — the owner verifies UI on prod. On
   the next deploy, confirm on the actual Multi-Purpose TVs that (a) only the
   landscape screens rotate, (b) they never show the same graphic at once,
   (c) a display with a dedicated video keeps playing it uninterrupted while
   its neighbors rotate, and (d) Fade actually reads as a soft bleed rather
   than a slide on real Tizen browsers.

## 🟢 BUILT (previous session, part 4): mobile-optimized hub + installable PWA

The owner wants to set up displays / fix things from a phone, and asked for
this to be installable ("I will download it") rather than just a bookmarked
URL. Ran a full audit of the admin hub UI first (not the TV-facing routes,
which were already full-bleed at any size) before touching anything — see the
findings baked into the bullets below. Two explicit design calls from the
owner: the 3 customize tables become **stacked cards** on mobile (not just
horizontally scrollable), and the display detail panel becomes a **bottom
sheet** (not just a resized floating box).

**Installable PWA:**
- **Icons generated from the brand monogram**
  (`public/brand/tuxmat-monogram.png`) padded onto a Rich Black (`#000000`)
  square background via `sips` (no ImageMagick in this environment) — two
  padding ratios: `any` icons (~75% fill) and `maskable` icons (~50% fill, safe
  inside Android's adaptive-icon crop). Output: `public/icons/icon-{192,512}.png`
  and `icon-maskable-{192,512}.png`, plus `app/apple-icon.png` (Next's special
  file convention — auto-injects the iOS `apple-touch-icon` tag, no manual
  `<link>` needed).
- **`app/manifest.ts`** — Next's file-based manifest convention (auto-generates
  `/manifest.webmanifest` + the `<link rel="manifest">` tag). `start_url: "/hub"`
  (root `/` just redirects there anyway), `display: "standalone"`,
  `background_color: "#000000"` (matches the icons so the Android splash
  screen doesn't show a visible box around the mark), `theme_color: "#faf9f6"`
  (the hub's own background, for browser-chrome tinting).
- **`app/layout.tsx`** — added `appleWebApp: { capable: true, ... }` metadata
  (iOS Safari's own "Add to Home Screen" ignores the manifest and needs this
  separately) and `themeColor` on the root `viewport` export.
- **`public/sw.js` + `components/hub/RegisterServiceWorker.tsx`** (mounted only
  in `app/hub/layout.tsx`, never on the TV routes) — a deliberately minimal
  service worker. Chrome/Android require *an* active service worker with a
  fetch handler for the install prompt, but this app is a **live
  display-status dashboard** — caching `/api/*` or any page response would
  mean showing a stale online/offline state or a stale rotation, which is
  actively harmful, not just imperfect. So the SW caches ONLY the four static
  icon files and lets every other request (every page, every `/api/*` call)
  hit the network untouched, always.
- **Pinch-zoom re-enabled for the hub only.** The root layout's viewport locks
  zoom to 100% — that's a deliberate fix for Smart TV browsers' fractional
  page-zoom rendering bug (see the border-fix history below), not something
  the admin hub needs. `app/hub/layout.tsx` now exports its own `viewport`
  (Next lets a nested layout override the root's) re-allowing pinch-zoom,
  since locking zoom in a data-dense admin tool actively hurts phone usability
  (e.g. zooming into a table). The TV-facing routes (`/display`, `/tv`) don't
  use the hub layout, so they keep the original lock.

**Mobile-responsive rework (the audit's findings, in priority order):**
- **The 3 customize tables** (`/hub/customize/rooms`, `displays`,
  `assignments`) were wrapped in `overflow-hidden`, not scrollable — columns
  just squeezed illegibly instead of scrolling (worst on Displays, 9 columns).
  Each page now renders **stacked cards below `sm:`** (one card per
  room/display/assignment, big tap targets for Edit/Delete/etc., inline
  selects for Room/Orientation) and keeps the original `<table>` at `sm:` and
  up (now properly `overflow-x-auto` with a `min-w` too, so even the desktop
  table degrades to scroll instead of squeeze on an in-between width).
- **`DisplayDetailView`'s edit/change/health/adjust panel** was a `fixed`
  `w-80` (320px) floating box — on an iPhone SE (320px viewport) it ran off
  the screen edge entirely. `PanelShell` now renders as a **full-width bottom
  sheet anchored to the bottom edge** below `sm:` (with a drag-handle bar, a
  slide-up entrance via framer-motion, `env(safe-area-inset-bottom)` padding
  for the iPhone home-indicator area, and `max-h-[75vh]` + internal scroll for
  tall content), and keeps the original floating panel at `sm:` and up. The
  action-cluster icon buttons (Edit/Change/Pixel Health/Adjust/Refresh) are
  now `h-11 w-11` (44px) and `z-30` (above the sheet, so they stay reachable
  even when a panel is open); the room name/number header now truncates
  instead of risking a collision with the back button on a narrow screen.
- **Touch targets bumped to a comfortable size app-wide:** the contact-menu
  avatar (36px → 44px), the dashboard carousel's prev/next arrows (32px → 44px,
  and hidden below `sm:` entirely — touch swipe already scrolls the row
  natively, so they were just consuming header space next to the room
  title/controls on a phone), the room-heading Slide/Fade text buttons and
  ON/OFF switch (invisible 44px hit-areas added around both without visually
  bloating the compact control), every customize-table row action, and the
  main nav tabs (`HubNav.tsx`).
- **iOS auto-zoom-on-focus fix, one global rule:** several forms set
  `text-sm` (14px) directly on inputs — iOS Safari auto-zooms the whole page
  when a focused field is under 16px, then zooms back out on blur, a jarring
  jump on every form interaction. Added one rule to `app/globals.css`
  (`input, select, textarea { font-size: 16px }` under `max-width: 640px`)
  instead of hunting down every input's className individually.
- **Dashboard tile widths:** the LANDSCAPE tile width was hard-coded (682–780px
  for the "large" tileSize used by `/hub/displays`, `/hub/online`, and each
  room's own page) — on a phone that's up to ~1.8× the viewport width per
  tile. Recomputed a genuine phone-sized tier for both `tileSize` variants,
  preserving the underlying invariant that made the original numbers what
  they were (PORTRAIT height × 16/9 = LANDSCAPE width at that breakpoint, so
  mixed portrait/landscape rows still line up) — see the comment in
  `DisplayCarousel.tsx`. `StatusSummary`'s 3-stat-card grid also got smaller
  padding/type sizing below `sm:` so "Screensaver" doesn't feel cramped.

**Passes `tsc`/`lint`/`build`; confirmed `/manifest.webmanifest` and
`/apple-icon.png` both generate correctly via a local production build.**
**Pushed and deployed (`d70ea36`).**

**Update:** the owner has now actually used this on a real phone and has
feedback — see the "NEXT UP" section at the very top of this file. Don't
assume the below checklist is what they'll report; ask first.

Original checklist (code-only audit, never touched a real device): Android
Chrome's install banner appears and the installed icon/splash look right; iOS
Safari's "Add to Home Screen" picks up the apple-touch-icon and launches
standalone (no Safari chrome); the bottom sheet, stacked cards, and touch
targets actually feel right on a real device, not just a resized desktop
browser window.

## 🔴 NEXT UP: emergency freeze still active — purge stray assignments before lifting

Two flags in `app/api/displays/[slug]/content/route.ts`:

1. **`CAROUSEL_ENABLED`** — now back to `true` (see above; this used to be the
   kill switch for the old, disabled carousel).
2. **`FREEZE_TO_SINGLE_SLIDE = true`** — still on. The **first** version of the
   activate-carousel button (long since replaced) stuffed the *entire content
   library* into **every display** as a multi-item playlist. Those stray
   assignments persist in the prod DB, so any display whose room carousel is
   off still has the normal `PlaylistPlayer` cycling through all of them
   (~10s/item) unless this flag collapses it back to one. Set `false` once
   cleaned up.

**Cleanup required before turning this off:**
- **Purge the stray assignments on prod.** Each display should have only the
  single graphic it's meant to show. **The script exists and is tested:**
  `scripts/cleanup-assignments.ts` — audit by default, `--apply` to delete.
  It keeps each display's lowest-`sortOrder` assignment (exactly the item
  `FREEZE_TO_SINGLE_SLIDE` has been showing) and deletes the rest. Verified
  locally end-to-end by injecting the same whole-library-per-display shape the
  bug created and purging it. Run it against prod with the **external**
  connection string from Render's `tuxdisplay-db` page:
  `DATABASE_URL="<render external url>" npx tsx scripts/cleanup-assignments.ts`
  (audit first, then `--apply` — get the owner's go-ahead before applying).
  Local `.env` only holds the local dev DB, so `--env-file=.env` can't touch prod.
  Afterward verify each display's `/api/displays/<slug>/content` returns a
  1-item playlist that is the *intended* creative (or, for a Multi-Purpose
  landscape display now deliberately carrying 2+ landscape assignments, that
  those are the *intended* pool items, not leftover stray ones), then set
  `FREEZE_TO_SINGLE_SLIDE = false`.

## 🟢 BUILT (this session): full-screen pixel massager (rainbow sweep / "Minecraft city")

**Shipped + deployed** (pushed to main, commits `e729a39` + `514fd0b`). Now has
**3 selectable variants** wired through the hub picker → backend → TVs (see the
"screensaver style → backend" note below, which this closes).
`components/screensaver/PixelMassager.tsx` — a single low-res
canvas CSS-scaled full-bleed (`image-rendering: pixelated`): a dense isometric
voxel city where **every block moves entirely** — a per-column vertical bob
(unique phase/frequency, `bobFreq`/`bobPhase`) layered on a slow build-out drift
of its target height (`baseCur` easing toward `baseTarget`), *plus* a slow
global sway of the whole field (`SWAY_*`, both axes, long non-harmonic periods)
so not even the ground grid is anchored. Grayscale
city redrawn *every frame* (it's always moving), multiplied by a small
quantized rainbow hue field so **every pixel sweeps the full spectrum every
40 s**. No flat ground — `MIN_BASE` keeps even the bob trough above the floor so
no block ever holds still (owner requirement: "all the blocks have to move").
Verified in preview via a vertical-gradient edge map (isolates geometry from the
smooth color field): the block edges fully relocate frame-to-frame (a static
city would score ~0). Fixed typed arrays, no per-frame allocations, heap flat at
~13 MB, ~30 fps cap, `absolute` not `fixed` (per `c55b942`).

**Variants + picker wiring (closes old handoff #2):** `variant` prop —
`skyline` (medium/steady, default), `metropolis` (dense/fast), `horizon`
(big/calm) — differ in block scale/density/height/tempo/hue-loop; all keep the
all-blocks-move + full-bleed guarantees. Shared server-safe identity in
`lib/screensaver.ts` (`ScreensaverVariant`, `SCREENSAVER_VARIANTS`,
`coerceScreensaverVariant`, `SCREENSAVER_STYLE_SETTING_KEY`). New global
key/value `Setting` model (migration `20260709170000_add_setting`) stores the
chosen style; `GET`/`PUT /api/admin/screensaver` reads/writes it; the content
route serves it as `screensaverStyle`; `DisplayPlayer` → `Screensaver` →
`PixelMassager`. The `/hub/screensaver` picker (`ScreensaverPicker.tsx`) now
previews the real massager per variant, loads the current selection on mount,
and persists on activate (**no more localStorage**). The detail-view
forced-screensaver preview shows the massager (default variant) too.

**To test on real TVs:** the massager only renders during a screensaver window
— overnight (outside 06:00–23:00 America/Toronto) or with `screensaverOverride`
on. To see it now, flip a display into screensaver override, or open
`/hub/screensaver` and pick a variant. **Still to do on real hardware:** soak it
on a Samsung Tizen TV overnight — the per-frame full redraw (~600 columns at the
low internal res) is the main cost to watch; `metropolis` is the heaviest
(higher internal res); if a TV struggles, prefer `horizon`/`skyline` or lower
the fps cap.

Original spec (kept for reference): a burn-in-prevention animation that
exercises *every* pixel and subpixel and runs **continuously for the entire
scheduled screensaver window** (no static frame, ever, not even briefly).

**The visual the owner wants:**
- A **rainbow sweep across the entire screen on a constant loop** — a full
  hue-spectrum wave moving across the whole panel so, over each loop, every
  pixel passes through the complete color range (exercises all subpixels).
- Rendered in a **blocky, voxel/pixel-art aesthetic — "like a Minecraft city
  being built out"**: the screen builds up out of cubes/blocks that assemble
  into a cityscape (towers rising block-by-block, isometric feel), then keeps
  evolving / rebuilding on a loop, colored by the rainbow sweep. The *build-out*
  motion is the personality; the rainbow is what does the pixel exercise.

**Where it plugs in:**
- The thing rendered for `mode: "screensaver"` is `components/display/Screensaver.tsx`
  (today it's the CSS `LavaLamp` from `components/screensaver/LavaLamp.tsx`).
  Build a new `PixelMassager` component and render it there — either replace
  `LavaLamp` outright or make it a selectable screensaver "motion" (there's
  already a half-wired screensaver picker; see the existing lava-lamp item
  below and handoff #2).
- Scheduling is already handled: `resolveContentForDisplay` returns
  `mode: "screensaver"` overnight (`isWithinBusinessHours` in `lib/time.ts`) or
  whenever `Display.screensaverOverride === true`. The massager just needs to
  render for that whole window — so it must be a self-contained loop that runs
  safely unattended for hours/days.

**Requirements / gotchas:**
- Full-bleed: `absolute inset-0`, black base, **no gaps or borders** — honor the
  `fixed`→`absolute` full-bleed fix (commit `c55b942`) and the `ViewportLock`;
  a massager with a hairline seam would defeat the purpose and reintroduce the
  border bug.
- Every pixel must move/change over the loop — no permanently-static region
  (that's the whole point vs. a decorative screensaver).
- Must run on **Samsung Tizen** TV browsers for days without leaking memory or
  pegging CPU. Prefer a GPU-friendly approach: a single `<canvas>`/WebGL shader
  for the rainbow field + blocky city, or CSS transforms — avoid thousands of
  per-frame DOM nodes. Test sustained runtime, not just a 10s preview.
- Use the TuxMat palette as an accent if desired, but a **full rainbow** is
  required here (not just the brand 6-color set) so every hue is swept.

## 🟢 BUILT (this session): per-display horizontal (landscape) orientation

**Shipped + deployed** (commit `0b2b3da`); tile-sizing follow-up in `30cbbd9`
(below). Passes `tsc`/`lint`/`build`. **NOT visually verified in a browser** —
the owner verifies UI on prod (they decline local browser preview). ⚠️ Still
worth confirming the landscape synthetic bezel + a real landscape-mounted TV
look right on prod.

Each `Display` now has an **`orientation`** (`PORTRAIT` default / `LANDSCAPE`),
settable per display in the hub. Key insight that kept this small: the **live
`/display` and `/tv` output is frameless full-bleed** (`absolute inset-0`), so a
landscape-mounted TV's browser reports a landscape viewport and content fills it
upright **automatically — no rotation code on the TV side**. `orientation` is
therefore metadata that drives the **hub's representation** (and is available to
drive fit defaults later); it does not transform the live output.

What was changed:
- **Schema:** `enum Orientation { PORTRAIT LANDSCAPE }` + `Display.orientation`
  (`@default(PORTRAIT)`); migration `20260709180000_add_display_orientation`.
- **API:** `PATCH /api/admin/displays/[id]` accepts `orientation`; the list
  (`/api/admin/displays`) + detail (`/api/admin/displays/[id]` GET) already
  return the whole row, and `/api/hub/status` + `lib/hub/types.ts` now carry it.
- **`components/hub/TVFrame.tsx`:** new `orientation` prop. PORTRAIT keeps the
  photographic `public/tv-frame.png` (9:16). LANDSCAPE renders a **clean
  synthetic 16:9 bezel** (dark metallic border + the same dark-glass base +
  diagonal glare) — I did NOT rotate the portrait photo because that would
  rotate the content inside it; content stays upright in the landscape glass.
  *If the owner wants a photographic landscape frame, add a landscape
  `tv-frame` asset and branch on it here.*
- **`DisplayTile.tsx`** (hub grid) + **`DisplayDetailView.tsx`** (detail/modal
  preview) pass `orientation` to `TVFrame` and swap the wrapper aspect
  (`16/9` landscape vs `824/1412` portrait; landscape sizes by width).
- **`app/hub/customize/displays/page.tsx`:** an **Orientation** column with a
  Portrait/Landscape `<select>` (optimistic + PATCH), same pattern as the Room
  select.
- **Hub tiles now size by a shared HEIGHT** (`30cbbd9`, `DisplayCarousel.tsx`):
  tiles used one fixed width, so a landscape (16:9) tile rendered short next to a
  portrait (9:16) one. Landscape tiles are now ~3.05× wider so every tile in a
  row is the same height and lines up top + bottom (the carousel scrolls to
  absorb the width). ⚠️ Owner may find full-height landscape tiles too wide — if
  so, cap the height (shorter than portrait, less wide) as a middle ground.

**Not done / decisions left for the owner:**
- Content fit for portrait creatives on a landscape panel is still governed by
  `contentFit` (COVER crops to fill, CONTAIN letterboxes). Consider defaulting a
  landscape display to `CONTAIN`, or commissioning landscape (16:9) creatives.
- The synthetic landscape bezel is functional but plainer than the portrait
  photo frame — swap in a real landscape render if fidelity matters.

## ⏳ Deploy status

Everything through **`d70ea36`** is pushed to `main` and auto-deployed on
Render. Recent commits, newest first:
- `d70ea36` — mobile-optimized hub + installable PWA (part 4 above; no schema
  change).
- `63ed064` — library "Rotation" dropdown: direct per-room pool membership on
  the item (part 3 above; migration `20260713140000_add_content_rotation_room`).
- `e254a12` — hub dashboard reflects landscape rotation live; video-aware
  pooling (part 2 above; no schema change).
- `40201d3` — room heading: text Slide/Fade + ON/OFF switch; off returns to
  original image.
- `30c49b2` — landscape-only room carousel + global Slide/Fade transition
  (migration `20260713120000_add_content_orientation_and_carousel_transition`).
- `42a1fcc` — handoff: current deploy state (all shipped through `30cbbd9`).
- `30cbbd9` — hub equal-height tiles (landscape lines up with portrait).
- `0b2b3da` — per-display landscape orientation (migration
  `20260709180000_add_display_orientation`).
- `3921c7a` — handoff: screensaver picker done.
- `514fd0b` — screensaver picker → 3 massager variants, wired to TVs via a new
  `Setting` row (migration `20260709170000_add_setting`).
- `e729a39` — pixel massager (voxel-city screensaver) + assignment cleanup script.

**Nothing uncommitted.** **The carousel emergency freeze is still ON** (see
the next section) — that's still an open item, and it needs prod-data
cleanup + owner sign-off before lifting.

**Immediate next work (see the "NEXT UP" section at the very top of this
file): mobile UI fixes + the carousel push/slide animation "as visioned" —
both need the owner's specifics first, not a guess.** The slide-animation ask
refers to `CarouselPlayer.tsx`'s `SLIDE_TRANSITION` and the whip-push comment
— direction, easing, whether it should read as one continuous wall-wide push.
This comes after the mobile-UI feedback is addressed, per the owner's stated
order.

⚠️ **Local Mac process-limit gotcha (this session):** leaving multiple
`npm run dev` / Turbopack servers running exhausted the OS fork limit
(`zsh: fork failed: resource temporarily unavailable`), which froze the shell.
Keep **one** dev server at a time and stop it when done; Force-Quit stray `node`
processes (or reboot) to recover.

## Current state: LIVE in production

- **App:** https://tuxdisplay.tuxmat.ai (Render web service `tuxdisplay`). Repo
  `TuxMat-AI-Labs/tv-project`, branch `main`; Render auto-deploys on push to `main`.
- **Auth:** Microsoft Entra SSO (`AZURE_CLIENT_ID`/`SECRET`/`TENANT_ID`). With the
  Entra group IDs unset, every authed employee is ADMIN. Local dev has a one-click
  "Sign in (development)" bypass (Entra vars unset locally).
- **DB:** Render Postgres `tuxdisplay-db`; migrations via `prisma migrate deploy`
  in the blueprint preDeploy, **followed by `prisma db seed`** which bootstrap-seeds
  rooms + displays (Upstairs Office 1–5, Multi-Purpose 1, Showroom 1–2) + placeholder
  creatives on an empty DB (a no-op once rooms exist; `FORCE_SEED=1` to re-seed).
  So the first deploy after this change populates the previously-empty prod DB.
- **Media:** Cloudflare R2 bucket `tuxdisplay`, public dev URL. CORS policy **is now
  set** (`AllowedOrigins: ["https://tuxdisplay.tuxmat.ai"]`, `PUT/GET/HEAD`, `*`
  headers) — but the in-app Library uploader still fails on prod with "Failed to
  fetch." See ⚠️ **Known issue** below before assuming CORS is the blocker.

## Local dev

- **Node 24** required: `export PATH="$HOME/.local/node-v24/bin:$PATH"` before any npm/npx/prisma.
- Local Postgres: `npx prisma dev -d --name tuxdisplay` (already configured in `.env`),
  then `npx prisma db push` and `npx prisma db seed` (3 rooms, 4 displays, admin,
  and TuxMat placeholder creatives assigned to each display).
- Preview: `preview_start` name `tuxdisplay-dev`.
- Verify before shipping: `npx tsc --noEmit && npm run lint && npm run build` — keep clean.
- **Gotcha:** the Turbopack dev server can serve a *stale global CSS chunk* after
  edits to `globals.css` (you'll see old rules in the browser though the file is
  updated). Fix: stop the server, `rm -rf .next`, restart.

## UI work completed (recent sessions)

- **Light "liquid-glass" Hub theme** (`globals.css`): warm near-white bg, translucent
  blurred cards (no gold outline). **TV output stays dark** — `components/display/*`,
  and the `DisplayDetailView` fullscreen. `Wordmark` has a `tone` prop (dark on light
  surfaces, light on the dark detail view).
- **Header contact dropdown** (`components/hub/ContactMenu.tsx`): avatar opens a menu
  with account info + Settings + Sign out. Minimal `/hub/settings` page.
- **Apple-style scroll reveal:** `.reveal > *` fade up softly (easeOutCubic, ~1.05s,
  translateY+scale), staggered one-at-a-time via `ScrollReveal.tsx` (IntersectionObserver
  sets a per-batch `transition-delay`; MutationObserver re-scans on nav/async content).
  Mounted once in the root layout. Respects `prefers-reduced-motion`.
- **Realistic Samsung QM55C tile** (`components/hub/TVFrame.tsx`): uses `public/tv-frame.png`
  (cropped from `public/tv-sample.png`) as the frame; content fills the glass region
  (insets tuned so no dark inner-border "black line"); soft diagonal glare overlay.
  The Samsung logo has been painted out of the bezel.
- **3D hover push** (`DisplayTile.tsx`) + **staggered LCD power-on** (`.screen-content`
  / `.screen-flash`, `--tile-index`).
- **Branded placeholders on every screen:** `public/placeholders/coverage-reach.jpg`
  and `us-vs-them.jpg`, alternated across displays via the seed. `/api/hub/status`
  falls back to the first scheduled item's artwork so tiles show content even with
  no live heartbeat.
- **Room carousels** (`DisplayCarousel.tsx`, used by `RoomSection` + stat pages):
  swipeable (trackpad) with prev/next arrows that appear only on overflow + soft edge
  fades. Room headings UPPERCASE with a single grey/green `StatusCircle` (green when
  every display in the room is online). Tile caption is just "Display N" + circle
  (no room-name repeat, no "Playing").
- **3 tappable stat cards** (`StatusSummary.tsx`): Displays / Online / Screensaver
  (no sub-text) → pages:
  - `/hub/displays` — all displays in one carousel.
  - `/hub/online` — online displays, page fades in.
  - `/hub/screensaver` — 3 live-animating options (Drift / Pulse / Bounce),
    hairline-separated, hover-to-focus, tap-to-activate. **Selection is localStorage
    only right now** — see pending work.

## Git push / deploy note

Push access to `TuxMat-AI-Labs/tv-project` requires a **TuxMat-AI-Labs member**
credential. The macOS keychain had cached a personal account (`diazcs`, no
access), which 403'd. Fix: clear it with
`printf "protocol=https\nhost=github.com\n\n" | git credential-osxkeychain erase`,
then `git push` and enter the member username + a **PAT** (Contents: Read/write on
this repo) as the password. Everything through `c55b942` is pushed to `main`.

## 🔴 NEXT UP: pairing/QR screen "does not load properly" (needs repro details first)

At the very end of this session, the user flagged that the pairing-screen
screenshot shared earlier (the one showing `/tv`'s "Scan to connect this
display" QR + code) was **the wrong example to reference for the border bug,
and separately does not load properly** on (at least) that device. This is a
**distinct, not-yet-investigated symptom** from the border/zoom issue below —
don't assume the `fixed`→`absolute` fix (commit `c55b942`) addresses it, and
don't assume it's the same root cause.

**Nothing is diagnosed yet.** Before writing any code, get from the user:
1. **What "does not load properly" actually means** — stuck on a spinner /
   blank white or black screen / shows an error / shows a QR or code that
   looks wrong or garbled / partially renders then freezes / something else
   entirely. The difference matters a lot for where to look.
2. **Which device(s)** — the same "new devices" from the border bug, or a
   different one? Is it 100% of the time or intermittent?
3. **A fresh screenshot or (ideally) a short screen recording** of the actual
   failure — the previous screenshot is now known to be a bad example, so
   don't reason from it.
4. Whether it happens on **first load** (fresh device, no cookie yet — the
   `/api/tv/register` POST mints a `Device` + pairing code, see
   `app/api/tv/register/route.ts`) vs. on a device that's loaded before.

**Where to look once there's a real repro**, roughly in order of likelihood:
- `components/tv/TvClient.tsx` — polls `/api/tv/register` every 4s while
  unpaired; if that fetch is failing/hanging (network, cold start, a
  Render free-tier spin-down delay, etc.) the component just keeps rendering
  `null`/black (see the `!state` case) with no error state or retry
  indicator visible to the user — a silent failure would look exactly like
  "does not load properly" with nothing else to go on.
- `app/api/tv/register/route.ts` — mints a `Device`, generates a QR via the
  `qrcode` package (`QRCode.toDataURL`) server-side; if that call throws or
  is slow, the whole POST fails and the TV never gets a payload back.
- Whether `AUTH_URL` is set correctly in prod (affects the QR's encoded
  `pairUrl` per `baseUrl()` in that route) — a wrong/missing origin wouldn't
  stop the screen from *loading*, but could make the QR scan to a broken
  link, which the user might describe the same way.
- Rule out the fix from this session by confirming `c55b942` is actually
  live on prod (Render auto-deploys on push to `main` — check the Render
  dashboard's latest deploy matches this commit) before assuming it's
  unrelated.

## ✅ FIXED (this session): white border on TV output — root cause was `fixed` vs `absolute`

User reported new-device symptoms: a visible white border/artifact, and a
stuck/non-playing video. Two theories were tried and superseded before
landing on the real one — kept here so the reasoning trail is clear:

1. **First theory (commit `fa2f282`, wrong):** browser-chrome zoom + camera
   moiré. Disproved — the user tried Refresh-TV and resetting zoom to 100%,
   neither fixed it.
2. **Second theory (commit `3a51f90`, incomplete):** the Hub's warm
   near-white `body` background was never overridden on TV routes, so a
   sub-pixel gap in the player's `fixed inset-0` layer revealed it. This
   *masked* the symptom (forced `body` black on TV routes) but the user
   correctly pushed back: "there should not be any gaps, that is the point"
   — recoloring behind a gap isn't the same as closing it, and the border
   persisting even at **50% zoom** proved it was a real, always-present
   mismatch, not fractional rounding noise that a color trick happens to hide.
3. **Actual root cause (commit `c55b942`, the real fix):** every full-bleed
   TV-output layer used `position: fixed`. On several embedded/Smart-TV
   browser engines — Samsung Internet's "page zoom" included — `fixed`
   elements are sized against the ***visual* viewport**, while `html`/`body`
   and `position: absolute` elements size against the ***layout* viewport**.
   Under non-100% page zoom those two differ by a fraction of a pixel,
   **independent of the zoom percentage** — exactly matching "still there at
   50%." Changed every full-bleed layer (`app/tv/page.tsx`,
   `app/display/[slug]/layout.tsx`, `Screensaver`, `InactiveScreen`,
   `PairingScreen`, `TvClient`'s loading state) from `fixed` to `absolute`,
   which ties sizing to the layout viewport and eliminates the mismatch
   outright. `PlaylistPlayer`'s inner layer already used `absolute`, so it
   was never part of the problem. Verified in preview: the outer layer's
   bounding rect has **exactly 0 on all four edges** against the viewport at
   a non-default size, and the pairing screen, playlist video, and
   screensaver all still render full-bleed correctly.
   `ViewportLock.tsx`'s and `globals.css`'s comments were updated to describe
   this accurately — the black-background override from step 2 stays in
   place as defense-in-depth, not as the fix itself.

**Next session: confirm on real hardware after this deploy lands.**
1. Check the affected TV(s) with a plain reload (or the **Refresh TV**
   button) — no disconnect/reconnect or re-pairing needed; this was always a
   CSS bug, not a pairing/device-identity problem. Confirm the border is
   gone at every zoom level, including the problem device's default zoom.
2. Separately confirm whether the **video** now plays — that symptom's
   working theory (stale JS bundle predating `5f90011`'s earlier video-loop
   fix, picked up by a reload) was never actually confirmed either way.
   Check it independently of the border fix.
3. If a border is *still* visible after this deploy + a reload on the actual
   hardware, get a video (not just a photo — camera moiré is a real
   possibility for a *secondary*, purely-visual artifact) of the exact edge
   it appears on. At that point the fixed/absolute fix would have ruled out
   the document-level cause, so look inside `PlaylistPlayer`'s `object-fit`
   handling or `TVFrame` next.

## Latest session — content library expansion, video pipeline, icon/preview fixes (all shipped)

- **8 new paid-social creatives added to the shared library** (7 images + 1
  video), reachable from prod on the next deploy via the seed (same
  `normalizeCreatives()` mechanism as the original 4 placeholders — safe,
  idempotent, image-preserving). Files in `public/creatives/*.jpg`. Titles
  cleaned up from internal funnel-jargon filenames (e.g. "Paid Social
  Vertical_Data MOF" → "2.5× the Coverage"). Two were later swapped for their
  full-resolution 2160×3840 exports (same filenames, no seed change needed).
- **Video content pipeline established.** The 60 MB Capsule launch video is
  **not** committed to git — uploaded server-side straight to R2 via new
  `scripts/upload-capsule-video.mjs` (bypasses browser CORS entirely; run it
  with the 5 `CLOUDFLARE_R2_*` vars in local `.env`, copied from Render's
  Environment tab). Registered as a `VIDEO` library item ("The Capsule
  Launch") via the seed, pointing at its R2 public URL. `.gitignore` now
  blocks `*.mp4`/`*.mov` so a stray video can't land in git history by
  accident — **use this script as the pattern for adding any future video**
  (update `LOCAL_FILE`/`KEY`, run, add the printed URL to `CREATIVES` in
  `prisma/seed.ts`).
- **Poster frame for the video.** Extracted a real frame at 7s (the clean
  product shot, chosen from a 6-frame ffmpeg contact sheet) via a *temporary*
  `ffmpeg-static` npm install (`--no-save`, uninstalled right after — not a
  project dependency; no ffmpeg is installed globally in this environment).
  Saved to `public/creatives/capsule-launch-poster.jpg`. `PlaylistItem`
  (`lib/display/resolveContentForDisplay.ts`) now carries `thumbnailUrl`
  end-to-end, used as the `poster` attribute on both video players (TV
  `PlaylistPlayer` + hub `DisplayDetailView` preview) so a video shows a real
  frame immediately instead of black while it buffers, and a real thumbnail
  in the Library grid instead of a blank `VIDEO` card.
- **Fixed: an assigned video showed "No content assigned."**
  `DisplayDetailView`'s `LivePreview` only ever handled images — it bailed to
  the empty state whenever an item had no `thumbnailUrl` (every video did,
  before the poster fix above) and only ever rendered `<img>`. Now branches on
  `item.type` and renders a looping muted `<video>` for VIDEO items.
- **Fixed: a lone video on a TV froze after one play.** `PlaylistPlayer`'s
  `onEnded` handler re-selected the same index for a single-item playlist,
  which doesn't remount/replay a `<video>`. Now loops
  (`loop={playlist.length === 1}`) when it's the only item; multi-item
  playlists still advance via `onEnded` (whip-slide behavior unchanged).
- **Fixed: "Change content" and "Refresh TV" action icons were identical**
  (both a circular arrow). `SwapIcon` (Change) is now distinct two-way
  exchange arrows (⇄); `RefreshIcon` stays the circular reload arrow (↻).

### ⚠️ Known issue — in-app Library video/file upload still fails on prod

R2 CORS **is now configured** on the bucket and confirmed saved — this
resolves the *infra* half of the old "R2 CORS not set" blocker. But the
in-app uploader (`/hub/customize/library` → Choose File → Upload) **still
fails on the live site** with `Failed to fetch` on the browser→R2 `PUT`, even
after the CORS save, a hard refresh, and waiting for propagation. This
session worked around it by uploading the video server-side via the script
above instead of diagnosing further. **Next session:** reproduce the upload
on prod, open DevTools → Console, and read the actual error line on the
failed `PUT`/`OPTIONS` request to `*.r2.cloudflarestorage.com` — that will
say whether it's still a CORS mismatch (e.g. an unexpected origin, a header
the preflight doesn't allow) or something else (e.g. the presigned URL's
signed headers not matching what the browser actually sends in
`lib/storage.ts` / `app/api/admin/content-items/upload-url/route.ts`).

### ⚠️ Local `.env` now holds production R2 credentials

To run the upload script, the 5 `CLOUDFLARE_R2_*` values were copied from
Render into local `.env` (gitignored, never committed). This means local dev
now writes to the **production** R2 bucket if content is uploaded from local
dev — harmless so far, but worth knowing. Strip them back out if that's a
concern.

## Previous session — TV scroll fix, remote refresh, push-slide transitions (all shipped)

- **TV scrollbar on zoom fixed.** A zoomed Samsung/Tizen browser could surface a
  stray scrollbar on `/display/[slug]` and `/tv` (seen on TV 4) because the
  player's `fixed inset-0` layer could size to the visual viewport, a hair
  taller than the layout viewport. New `<ViewportLock>` toggles a `tv-output`
  class on `<html>` while a TV route is mounted; `html.tv-output { overflow:
  hidden }` in `globals.css` guarantees no zoom level can scroll. Scoped so the
  Hub is unaffected. **On-device:** nothing to change beyond a normal reload
  to pick up the deploy — see the Refresh feature below for doing that remotely.
- **Remote "Refresh TV" action.** New `Display.reloadRequestedAt` field; a POST
  to `/api/admin/displays/[id]/reload` bumps it, the TV's existing content poll
  (~15s) notices the change and calls `window.location.reload()` itself — no
  physical access to the TV needed. Buttons: "Refresh TV" per row in
  `app/hub/customize/displays/page.tsx`, and an icon action (with brief
  inline confirmation) in `DisplayDetailView`'s action cluster.
- **Playlist rotation now slides ("whip push"), no cut.** `PlaylistPlayer`
  transitions between items with a framer-motion push: outgoing and incoming
  slides run the identical easing curve simultaneously (`ease [0.22,1,0.36,1]`,
  0.7s), so the incoming edge always meets the outgoing edge exactly — verified
  by sampling `incoming_x - outgoing_x` through a live transition and confirming
  it equals the container width at every frame (no gap, ever). Images preload
  before the swap so there's no blank/loading flash mid-whip.
  ⚠️ **Note:** every display currently has exactly one assigned item (seed +
  the "Change content" panel both replace-to-one), so the slide never fires in
  practice yet. To actually see ads rotate, assign 2+ items to the same display
  via `/hub/customize/assignments` (supports multiple assignments per display
  with `sortOrder`, already existed, just under-used) — the "Change" panel in
  `DisplayDetailView` is still single-item only if a friendlier multi-item
  in-panel playlist builder is wanted later.

## Earlier session — quirk fixes (all shipped)

- **Content library named by creative, not room.** The 8 per-display "… sample
  poster" items were collapsed into **4 shared, creative-named** items (Built for
  the Rest / Not a Standard / Your Car Isn't Generic / The Standard Doesn't
  Change). `prisma/seed.ts` now runs `normalizeCreatives()` on **every** deploy
  (image-preserving: repoints duplicate assignments to the canonical item with
  the same file, then deletes the dupes) — the room/display bootstrap stays
  empty-DB-only. So prod is fixed on the next deploy without clobbering edits.
- **Change a display's room from the Displays table.** The Room column is now a
  `<select>` that PATCHes `roomId` and re-sorts (optimistic), so displays
  recategorize immediately (`app/hub/customize/displays/page.tsx`).
- **No person reflection on "off" screens.** `TVFrame`'s glass region now has a
  dark glass base so the studio photo's reflection never shows through — an off /
  screensaver tile reads as clean dark glass with just the synthetic glare.
- **Smoother carousels.** `DisplayCarousel` dropped `snap-mandatory` (it fought
  trackpad momentum) and now coalesces scroll → nav-state updates to one rAF and
  only re-renders when a value flips (was `setState` on every scroll event).

### NEXT UP: animate a custom lava-lamp image (requested, not started)

The user wants to drop a real lava-lamp photo (portrait, orange/purple, TuxMat
monogram overlaid — see their reference) into the repo and have the screensaver
"animate" it with **no static/still imagery**. A single still can't truly morph;
the agreed-good options are (1) slow Ken-Burns pan/zoom + hue drift, (2) layer it
behind the existing CSS `LavaLamp` blobs, or (4) a WebGL/canvas fluid sim recolored
to the palette (the real deal, bigger lift). Ask which fidelity they want; keep the
monogram overlay per their reference. Current screensaver = CSS `LavaLamp` (blobs).

### 1. Device pairing & identity — "which TV is this?" (the big one)

> **✅ SHIPPED (this session).** Claim-code pairing + persistent httpOnly device
> cookie is built and verified locally end-to-end: `/tv` mints a device + code +
> QR, `/hub/pair?code=` approves it (assign existing display or create a new one,
> with swap-on-reassign), and the TV then auto-loads its content and is
> recognized permanently via the `tuxdisplay_device` cookie (confirmed httpOnly).
> Unpair/relabel + a paired-screens list live on `/hub/pair`; presence stamps
> `Device.lastSeenAt`. Files: `lib/device.ts`, `app/tv/*`, `components/tv/*`,
> `app/api/tv/register`, `app/api/admin/pair/{claim,unpair}`,
> `app/api/admin/devices`, `components/hub/PairClient.tsx`,
> `components/display/DisplayPlayer.tsx` (player extracted, shared by `/tv` +
> `/display/[slug]`). Migration `20260706010000_add_device`.
> **⚠️ STILL TO VERIFY ON REAL HARDWARE:** that the Samsung/Tizen browser keeps
> the httpOnly cookie across power cycles. If it does not, fall back to setting
> each Display's `/display/<slug>` URL as the browser homepage (that path still
> works unchanged). Also add `NEXT_PUBLIC`/`AUTH_URL` in prod so the QR encodes
> the public origin (register already reads `AUTH_URL`, falling back to origin).

**Goal:** point each Samsung TV's browser at TuxDisplay once, pair it to a logical
Display ("TV 1 by my desk"), have it permanently recognized and auto-load its
content — **without typing the admin password on every TV.**

**Recommended workflow — claim-code pairing + persistent device cookie** (the
Roku/Chromecast enrollment pattern; keeps admin creds off the TVs):

New `Device` model (Prisma):
```prisma
model Device {
  id            String    @id @default(cuid())
  token         String    @unique          // random secret, stored in a long-lived httpOnly cookie on the TV — the durable identity
  displayId     String?   @unique          // which Display this screen shows (null until paired)
  display       Display?  @relation(fields: [displayId], references: [id])
  pairingCode   String?   @unique          // short human code shown on the TV while unpaired (e.g. TUX-4F9K)
  codeExpiresAt DateTime?
  label         String?                    // optional note ("by Colin's desk")
  pairedAt      DateTime?
  lastSeenAt    DateTime?
  createdAt     DateTime  @default(now())
}
```

Flow:
1. **TV first boot:** open `https://tuxdisplay.tuxmat.ai/tv` (public, no auth) and set
   it as the browser homepage. Server checks the `tuxdisplay_device` httpOnly cookie.
   - No cookie → create a `Device` (fresh `token` → set 2-year httpOnly cookie) +
     short `pairingCode` (~10-min expiry). Render a **full-screen on-brand pairing
     screen**: big code + QR deep-linking the hub pairing page. (This is the "loads
     the full-screen graphic" state.)
   - Cookie + `displayId` set → skip pairing, render that Display's content (reuse
     the existing player at `app/display/[slug]` logic).
   - Cookie + not paired → keep showing the pairing screen and poll.
2. **Admin pairs from the hub** (on their *own* laptop/phone, already signed in):
   a **Pair icon** on unpaired displays / a "Pair a screen" action. Enter the code
   from the TV (or scan the QR → hub page with code prefilled), pick/creating the
   Display ("TV 1"). Server matches `pairingCode` → sets `displayId`, clears the code.
3. **TV auto-advances:** `/tv` polls (or SSE); once `displayId` is set it swaps the
   pairing graphic for live content — permanently. Future boots: the cookie identifies
   it instantly. No code, no login.

Why this is the best fit:
- **No password on TVs** — the TV never authenticates as admin; the admin authorizes
  pairing from their signed-in session. The TV holds only a device token scoped to
  "show Display X."
- **Permanent recognition** — the httpOnly device cookie is the durable identity.
  ⚠️ *Verify Samsung/Tizen browser cookie persistence across power cycles.* If it
  clears cookies on reboot, use the fallback below.
- **Full org control** — reassign a Device to another Display, relabel, or unpair
  (revoke token) from the hub; swap a dead TV by pairing the new one to the same Display.

**"Ghost pages / no re-login":** the admin's Entra SSO session cookie already
persists on the *admin's* browser (no re-typing the password each hub visit). TVs
deliberately use device tokens, not admin auth — so there's nothing to re-enter on a
TV. If you occasionally browse the hub *from* a TV, just rely on staying signed in
(persistent SSO session), don't build a separate mechanism.

**Fallback / simplest MVP (if Tizen cookies are flaky):** skip the `Device` model and
use each Display's existing unguessable `slug`. The hub shows the player URL
(`/display/<slug>`) + a QR; open it once on the TV and set it as the homepage. The
slug in the URL is the permanent identity — zero backend, robust, but no in-hub
"pair" click. The claim-code flow is the polished version.

**Presence:** the player already reports a heartbeat (drives the green/grey circle).
Extend it to stamp `Device.lastSeenAt`.

**Build checklist:**
- [x] `Device` model + migration; relation to `Display`.
- [x] `/tv` public entry route: cookie check → pairing screen (code + QR, on-brand,
      full-screen) or content.
- [x] Pairing APIs: issue device+code; claim code (admin-authed) → bind `displayId`.
- [x] Hub UI: "Pair a screen" (Customize → Pair a screen / `/hub/pair`); code entry
      + QR deep-link; device list with unpair.
- [x] Long-lived httpOnly `tuxdisplay_device` cookie (`SameSite=Lax`, `Secure` in
      prod). ⚠️ Still verify persistence on the real Samsung browser.
- [x] Extend heartbeat → `Device.lastSeenAt` (stamped on each `/api/tv/register` poll).

### 2. Screensaver style → backend

> ✅ **DONE (this session).** The picker now offers 3 **pixel-massager** variants
> (skyline/metropolis/horizon), persists the choice to a global `Setting` row via
> `PUT /api/admin/screensaver`, and the content route serves it to each TV as
> `screensaverStyle` → rendered by `PixelMassager`. No more localStorage. See the
> "pixel massager" section above for the full wiring. The note below is the
> now-superseded lava-lamp state, kept for context.

> Note: the screensaver is now a flowing **lava lamp** — soft colour blobs that
> drift/scale continuously over black with no static gradient, line, or logo (an
> effective pixel-care "screen massage"). One reusable `components/screensaver/
> LavaLamp.tsx` drives the real TV screensaver (`components/display/Screensaver.tsx`),
> all three picker variations (Drift = warm gold/slow, Pulse = aqua/breathing,
> Bounce = violet/fast), and the forced-screensaver detail preview. The picker is
> a full-screen immersive bleed (only the TUXDISPLAY header), thin white dividers
> between panels, hover = more vibrant, and an Activate **charging health bar**
> that fills left→right; clicking a panel charges it, activates, and routes back
> to the dashboard. Selection is **still localStorage only** — once wired to the
> backend (below), pass the chosen motion into `LavaLamp`.
> Seed now provisions **Upstairs Office 1–5** (+ Multi-Purpose 1, Showroom 1–2)
> so screens can be pair-tested against existing displays. The display detail
> **preview shows the assigned content directly** (ignores the time-of-day
> screensaver schedule) so "Change content" always previews the wallpaper, even
> after hours. Content plays **06:00–23:00 daily** (screensaver overnight only),
> evaluated in `VENUE_TIMEZONE` (default America/Toronto); tune with
> `CONTENT_START_HOUR` / `CONTENT_END_HOUR`. A live TV picks up a content change
> on its next poll (~15s). **Online** = a synced TV checking in: a paired
> `Device` polling `/api/tv/register` (or a slug-only TV's content heartbeat) —
> admin browsing the hub no longer marks displays online, so unpaired slots read
> offline.

The `/hub/screensaver` picker stores the chosen animation in `localStorage` only.
To actually drive the TVs, add a `screensaverStyle` field (on `Display` and/or a
global setting), have the picker persist to it, and have the player/`Screensaver`
render the chosen variant during the scheduled screensaver window.

### 3. R2 CORS (infra) — see Current state.

## Key files

- `app/globals.css` — light theme + liquid-glass cards + `.reveal` + power-on + screensaver keyframes.
- `components/hub/` — `ContactMenu`, `DisplayCarousel`, `RoomSection`, `DisplayTile`,
  `TVFrame`, `StatusSummary`, `StatusDot` (`StatusCircle`), `ScreensaverPicker`,
  `ScrollReveal`, `DisplayDetailView` (dark fullscreen), `HubNav`, `CustomizeSubNav`, `EmptyState`.
- `components/display/` — `PlaylistPlayer` (now `absolute inset-0`), `Screensaver`, `InactiveScreen` — **stay dark**.
- `app/hub/` — `page.tsx`, `[roomSlug]`, `displays`, `online`, `screensaver`, `settings`,
  `customize/*`, `displays/[displayId]` (+ `@modal` intercept), `layout.tsx`.
- `lib/display/resolveContentForDisplay.ts`, `lib/hub/useHubStatus.ts`, `app/api/hub/status/route.ts`.
- `auth.ts`, `proxy.ts` (middleware is `proxy.ts`), `prisma/schema.prisma`, `prisma/seed.ts`, `render.yaml`, `DEPLOY.md`.
- `public/creatives/` — shared library images (+ `capsule-launch-poster.jpg`), all
  registered via `prisma/seed.ts` `CREATIVES`. `scripts/upload-capsule-video.mjs` —
  reusable server-side R2 uploader for video (see Known issue above for why).
- Brand: gold `#B9975B` / `#DFBA7C`, rich-black, blue-black `#2E3339`, Poppins. Logos in `public/brand/`. Don't alter logo art.

## Stack gotchas (Next 16)

- `params`/`searchParams` are async Promises. Middleware is `proxy.ts`. Strict
  `react-hooks/set-state-in-effect` — client-only `setState` in an effect needs an
  `eslint-disable-next-line` (see `Screensaver.tsx`, `ScreensaverPicker.tsx`).
