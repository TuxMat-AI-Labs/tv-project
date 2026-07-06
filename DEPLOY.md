# Deploying TuxDisplay to Render

TuxDisplay ships with a Render Blueprint (`render.yaml`) that declares the web
service and its Postgres database as code. This guide covers the one-time setup
and the few steps the Blueprint can't automate (they live in Azure and
Cloudflare, not Render).

## 1. Create the Blueprint

1. In Render, **New → Blueprint**, and connect the `TuxMat-AI-Labs/tv-project`
   repo. Render reads `render.yaml` and proposes the `tuxdisplay` web service
   plus the `tuxdisplay-db` Postgres database.
2. Render will prompt for every `sync: false` env var (all the secrets). You can
   leave the Entra/R2 ones blank for a first boot and fill them in later — the
   app runs without them (SSO falls back to the dev sign-in only in non-production,
   and media uploads are the only thing that needs R2). `DATABASE_URL` and
   `AUTH_SECRET` are filled automatically.
3. Apply. Render provisions the database, runs the build, applies migrations
   (`prisma migrate deploy`), and starts the service. Note the public URL it
   assigns, e.g. `https://tuxdisplay.onrender.com`.

## 2. Point Auth.js at the live URL

Set the `AUTH_URL` env var on the web service to the public URL from step 1
(e.g. `https://tuxdisplay.onrender.com`), then redeploy. `AUTH_TRUST_HOST` is
already set for you.

## 3. Microsoft Entra ID (Azure) — the manual SSO step

The redirect URI must match the deployed URL, which only exists after the first
deploy, so this can't live in the Blueprint.

1. In the Azure portal, open your **App registration** (or create one).
2. Under **Authentication → Redirect URIs**, add:
   `https://<your-render-url>/api/auth/callback/microsoft-entra-id`
3. Under **Certificates & secrets**, create a client secret.
4. Under **Token configuration**, add the **groups** claim to the ID token (this
   is what maps users to admin/marketing roles).
5. Copy these into the Render env vars:
   - `AUTH_MICROSOFT_ENTRA_ID_ID` — Application (client) ID
   - `AUTH_MICROSOFT_ENTRA_ID_SECRET` — the client secret value
   - `AUTH_MICROSOFT_ENTRA_ID_ISSUER` — `https://login.microsoftonline.com/<tenant-id>/v2.0`
   - `ENTRA_ADMIN_GROUP_ID` / `ENTRA_MARKETING_GROUP_ID` — the two AD security
     group object IDs
6. Redeploy. Once `AUTH_MICROSOFT_ENTRA_ID_ID` is set, the local dev sign-in
   bypass is automatically disabled and real SSO takes over.

## 4. Cloudflare R2 — media storage

1. Create an R2 bucket and an API token scoped to it.
2. Enable the bucket's public URL, or put a Cloudflare custom domain in front of it.
3. Set the Render env vars: `CLOUDFLARE_R2_ACCOUNT_ID`,
   `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`,
   `CLOUDFLARE_R2_BUCKET`, and `CLOUDFLARE_R2_PUBLIC_URL` (the public base URL).

## 5. Point the TVs at their displays

Once live, create rooms and displays in the Hub (`/hub/customize`). Each display
has a unique URL — `https://<your-render-url>/display/<slug>` — copyable from the
Displays page. Enter that URL in each Samsung QM55C's browser.

## Notes

- **Plans.** `render.yaml` defaults the web service to `starter` (always-on, so a
  TV never hits a spun-down service) and the database to `basic-256mb` (paid, so
  it isn't auto-deleted). To start cheaper, change the web `plan` to `free` and
  the database `plan` to `free` — but note free web services sleep when idle and
  free Postgres is deleted after 90 days.
- **Migrations.** New schema changes: run `npx prisma migrate dev --name <change>`
  locally, commit the generated `prisma/migrations/` folder, and Render applies it
  automatically via the `preDeployCommand` on the next deploy.
