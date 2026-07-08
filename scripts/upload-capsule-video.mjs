// One-off: upload the Capsule launch video to Cloudflare R2 server-side (no
// browser, so R2 CORS is irrelevant). Requires the five CLOUDFLARE_R2_* vars in
// .env (copy them from the Render service's Environment tab). Run:
//   node scripts/upload-capsule-video.mjs
// Then paste the printed public URL into prisma/seed.ts CREATIVES and re-seed.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const LOCAL_FILE = "CapsuleLaunch_ENG_CA_PaidLaunch_Vertical.mp4";
const KEY = "creatives/capsule-launch.mp4"; // fixed key → stable, clean public URL

const { CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_BUCKET, CLOUDFLARE_R2_PUBLIC_URL, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY } =
  process.env;

const missing = ["CLOUDFLARE_R2_ACCOUNT_ID", "CLOUDFLARE_R2_BUCKET", "CLOUDFLARE_R2_PUBLIC_URL", "CLOUDFLARE_R2_ACCESS_KEY_ID", "CLOUDFLARE_R2_SECRET_ACCESS_KEY"].filter(
  (k) => !process.env[k]
);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(", ")}\nCopy them from Render → tuxdisplay → Environment into .env, then re-run.`);
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: CLOUDFLARE_R2_ACCESS_KEY_ID, secretAccessKey: CLOUDFLARE_R2_SECRET_ACCESS_KEY },
});

const body = readFileSync(LOCAL_FILE);
console.log(`Uploading ${LOCAL_FILE} (${(body.length / 1e6).toFixed(1)} MB) → r2://${CLOUDFLARE_R2_BUCKET}/${KEY} …`);
await client.send(new PutObjectCommand({ Bucket: CLOUDFLARE_R2_BUCKET, Key: KEY, Body: body, ContentType: "video/mp4" }));

console.log(`\n✅ Done. Public URL:\n${CLOUDFLARE_R2_PUBLIC_URL}/${KEY}`);
