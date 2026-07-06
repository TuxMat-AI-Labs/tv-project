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
  in the blueprint preDeploy. **Production DB is empty** (no rooms/displays yet).
- **Media:** Cloudflare R2 bucket `tuxdisplay`, public dev URL. **⚠️ R2 CORS still
  not set** — browser uploads (Customize → Library) fail until you add the CORS
  policy on the bucket (allow `https://tuxdisplay.tuxmat.ai`, PUT/GET, `*` headers).

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

## Pending work

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

> Note: this session gave the picker a visual overhaul — full-screen immersive
> bleed (only the TUXDISPLAY header, hub chrome hidden), three distinct colours
> (gold / aqua / violet), hover = vibrant artwork (no gold outline), and an
> Activate pill that sweeps light right→left. Selection is **still localStorage
> only** — the backend wiring below is unchanged.

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
- Brand: gold `#B9975B` / `#DFBA7C`, rich-black, blue-black `#2E3339`, Poppins. Logos in `public/brand/`. Don't alter logo art.

## Stack gotchas (Next 16)

- `params`/`searchParams` are async Promises. Middleware is `proxy.ts`. Strict
  `react-hooks/set-state-in-effect` — client-only `setState` in an effect needs an
  `eslint-disable-next-line` (see `Screensaver.tsx`, `ScreensaverPicker.tsx`).
