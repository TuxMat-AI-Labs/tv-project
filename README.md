# TuxDisplay

Digital signage hub for TuxMat's office TVs. Each physical display runs its
browser pointed at a permanent, unguessable URL (`/display/<slug>`) that shows
whatever content is currently assigned to it. The Hub (`/hub`) is where staff
manage rooms/displays, upload media, and control what plays where — with a
CCTV-wall-style dashboard showing every screen's live status.

See `/Users/diaz/.claude/plans/floating-squishing-creek.md` (or ask in the
project chat) for the full v1 design doc.

## Stack

Next.js (App Router, TypeScript) · Postgres via Prisma · Microsoft Entra ID
SSO (Auth.js) · Cloudflare R2 for media · deployed on Render.

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in what you have. At minimum
   for local dev you need `DATABASE_URL` and `AUTH_SECRET` — leave the Entra
   and Cloudflare vars blank to start (see below).
3. Start a local Postgres (this project uses Prisma's built-in local dev DB —
   no Docker/Postgres install needed):
   ```bash
   npx prisma dev -d --name tuxdisplay
   npx prisma dev ls   # prints the connection URL — copy the "TCP" line into DATABASE_URL
   ```
4. Push the schema and seed sample data:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```
   This creates 3 rooms and 4 displays and prints each display's `/display/<slug>`
   URL to the console, plus a seeded ADMIN user for local sign-in.
5. Run the app:
   ```bash
   npm run dev
   ```
   Open a seeded `/display/<slug>` URL directly to see the player, and
   `/hub` to see the dashboard.

### Signing into the Hub locally

Real sign-in uses Microsoft Entra ID SSO. Until `AUTH_MICROSOFT_ENTRA_ID_ID`
is set, `/hub` automatically falls back to a dev-only sign-in button that
logs you in as the seeded ADMIN user — no Entra tenant needed to develop
against the Hub. This bypass is hard-disabled the moment real Entra env vars
are present (i.e. always off in production on Render).

### Wiring up real Entra SSO

You'll need, from your Entra tenant: the Application (client) ID, a client
secret, the Directory (tenant) ID (used to build the issuer URL), and the
object IDs of two AD security groups (admin vs marketing staff — anyone not
in either group gets read-only access). Put these in `.env.local` (never
commit them) and the same names in Render's environment variable settings for
production. The app registration must be configured to emit a `groups` claim
in the ID token for role mapping to work.

### Wiring up Cloudflare R2

Create an R2 bucket, an API token scoped to it, and either enable the
bucket's public URL or put a Cloudflare custom domain in front of it. Fill in
the `CLOUDFLARE_R2_*` vars in `.env.local`/Render. Until these are set, media
uploads in Customize → Library will fail at the upload step (the rest of the
app works fine without them, using the seeded sample content).

## Verifying changes

```bash
npx tsc --noEmit
npm run lint
npm run build
```
