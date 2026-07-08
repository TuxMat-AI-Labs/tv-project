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
this repo) as the password. Everything through `8537be3` is pushed to `main`.

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
