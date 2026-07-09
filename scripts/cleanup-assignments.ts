/**
 * One-off cleanup for the stray carousel-v1 assignments (see HANDOFF.md).
 *
 * The first version of the activate-carousel button bulk-assigned the entire
 * content library to every display. This script collapses each display back to
 * a single assignment — the one with the lowest sortOrder, i.e. exactly the
 * item FREEZE_TO_SINGLE_SLIDE has been showing — and deletes the rest.
 *
 * Usage (DATABASE_URL decides which DB it touches — point it at prod's
 * external connection string from Render to clean prod):
 *
 *   Audit (read-only, default):
 *     npx tsx --env-file=.env scripts/cleanup-assignments.ts
 *
 *   Apply (deletes the extra assignments):
 *     npx tsx --env-file=.env scripts/cleanup-assignments.ts --apply
 *
 * Imports the app's configured client from lib/prisma.ts because Prisma 7
 * requires the pg driver adapter — a bare `new PrismaClient()` throws.
 */
import { prisma } from "../lib/prisma";

const APPLY = process.argv.includes("--apply");

async function main() {
  const dbHost = (process.env.DATABASE_URL ?? "").replace(/^.*@/, "").replace(/\/.*$/, "");
  console.log(`Mode: ${APPLY ? "APPLY (will delete)" : "AUDIT (read-only)"}  DB: ${dbHost}\n`);

  const displays = await prisma.display.findMany({
    orderBy: [{ room: { name: "asc" } }, { number: "asc" }],
    include: {
      room: true,
      assignments: {
        include: { contentItem: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const toDelete: string[] = [];

  for (const d of displays) {
    const label = `${d.room.name} — Display ${d.number} (${d.slug})`;
    if (d.assignments.length <= 1) {
      const only = d.assignments[0]?.contentItem.title ?? "(none)";
      console.log(`OK    ${label}: ${d.assignments.length} assignment — ${only}`);
      continue;
    }
    const [keep, ...extras] = d.assignments;
    console.log(`FIX   ${label}: ${d.assignments.length} assignments`);
    console.log(`        keep   [sort ${keep.sortOrder}] ${keep.contentItem.title}`);
    for (const a of extras) {
      console.log(`        delete [sort ${a.sortOrder}] ${a.contentItem.title}`);
      toDelete.push(a.id);
    }
  }

  console.log(`\nTotal extra assignments: ${toDelete.length}`);

  if (!APPLY) {
    console.log("Audit only — re-run with --apply to delete.");
    return;
  }
  if (toDelete.length === 0) {
    console.log("Nothing to delete.");
    return;
  }

  const res = await prisma.assignment.deleteMany({ where: { id: { in: toDelete } } });
  console.log(`Deleted ${res.count} assignments.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
