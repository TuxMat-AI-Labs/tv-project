import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Branded TuxMat placeholder creatives (portrait 9:16), served from /public.
// A single SHARED library named by the CREATIVE — never per-display — so the
// "Change content" list reads as reusable artwork, not tied to one screen/room.
const CREATIVES = [
  { title: "Built for the Rest", fileUrl: "/placeholders/coverage-reach.jpg" },
  { title: "Not a Standard", fileUrl: "/placeholders/us-vs-them.jpg" },
  { title: "Your Car Isn't Generic", fileUrl: "/placeholders/your-car.jpg" },
  { title: "The Standard Doesn't Change", fileUrl: "/placeholders/the-standard.jpg" },
];

/**
 * Ensure the shared creatives exist and are named by creative, collapsing any
 * legacy per-display duplicates that share the same file. Image-preserving
 * (assignments are repointed to the canonical item with the identical fileUrl),
 * so it is safe to run on every deploy without clobbering what a screen shows.
 * Returns the canonical content-item id for each creative, in order.
 */
async function normalizeCreatives(adminId: string): Promise<string[]> {
  const ids: string[] = [];
  for (const c of CREATIVES) {
    const items = await prisma.contentItem.findMany({
      where: { fileUrl: c.fileUrl },
      orderBy: { createdAt: "asc" },
    });

    let canonicalId: string;
    if (items.length === 0) {
      const created = await prisma.contentItem.create({
        data: {
          title: c.title,
          type: "IMAGE",
          fileUrl: c.fileUrl,
          thumbnailUrl: c.fileUrl,
          durationSec: 15,
          uploadedById: adminId,
        },
      });
      canonicalId = created.id;
    } else {
      const canonical = await prisma.contentItem.update({
        where: { id: items[0].id },
        data: { title: c.title, type: "IMAGE", thumbnailUrl: c.fileUrl },
      });
      canonicalId = canonical.id;
      // Collapse duplicates: move their assignments to the canonical (same image), then delete.
      for (const dup of items.slice(1)) {
        await prisma.assignment.updateMany({ where: { contentItemId: dup.id }, data: { contentItemId: canonicalId } });
        await prisma.contentItem.delete({ where: { id: dup.id } });
      }
    }
    ids.push(canonicalId);
  }
  return ids;
}

async function main() {
  const admin = await prisma.user.upsert({
    where: { entraObjectId: "dev-seed-admin" },
    create: {
      entraObjectId: "dev-seed-admin",
      email: "dev-admin@tuxmat.local",
      name: "Dev Admin",
      role: "ADMIN",
    },
    update: {},
  });

  // Rooms + displays are only created on a fresh (empty) database, so a deploy
  // never clobbers a configured hub. Content normalization below runs always.
  const existingRooms = await prisma.room.count();
  const bootstrap = existingRooms === 0 || Boolean(process.env.FORCE_SEED);

  const displayRecords: { id: string; name: string; slug: string; idx: number }[] = [];
  if (bootstrap) {
    const rooms = [
      { name: "Upstairs Office", slug: "upstairs-office", sortOrder: 0 },
      { name: "Multi-Purpose Room", slug: "multi-purpose-room", sortOrder: 1 },
      { name: "Showroom", slug: "showroom", sortOrder: 2 },
    ];
    const roomRecords = new Map<string, { id: string }>();
    for (const room of rooms) {
      const record = await prisma.room.upsert({ where: { slug: room.slug }, create: room, update: room });
      roomRecords.set(room.slug, record);
    }

    const displaysToSeed = [
      { name: "Upstairs Office 1", number: 1, roomSlug: "upstairs-office" },
      { name: "Upstairs Office 2", number: 2, roomSlug: "upstairs-office" },
      { name: "Upstairs Office 3", number: 3, roomSlug: "upstairs-office" },
      { name: "Upstairs Office 4", number: 4, roomSlug: "upstairs-office" },
      { name: "Upstairs Office 5", number: 5, roomSlug: "upstairs-office" },
      { name: "Multi-Purpose Room 1", number: 1, roomSlug: "multi-purpose-room" },
      { name: "Showroom 1", number: 1, roomSlug: "showroom" },
      { name: "Showroom 2", number: 2, roomSlug: "showroom" },
    ];
    for (const [i, d] of displaysToSeed.entries()) {
      const room = roomRecords.get(d.roomSlug)!;
      const existing = await prisma.display.findFirst({ where: { name: d.name, roomId: room.id } });
      const display =
        existing ?? (await prisma.display.create({ data: { name: d.name, number: d.number, roomId: room.id } }));
      displayRecords.push({ id: display.id, name: display.name, slug: display.slug, idx: i });
    }
  }

  // Always: name/dedupe the shared creative library.
  const creativeIds = await normalizeCreatives(admin.id);

  // On bootstrap only, give each new display a starter creative (rotating) so the
  // wall is populated. Never runs on a configured hub, so it can't override edits.
  if (bootstrap) {
    for (const d of displayRecords) {
      const contentItemId = creativeIds[d.idx % creativeIds.length];
      const current = await prisma.assignment.findFirst({ where: { displayId: d.id } });
      if (current?.contentItemId !== contentItemId) {
        await prisma.$transaction([
          prisma.assignment.deleteMany({ where: { displayId: d.id } }),
          prisma.assignment.create({ data: { displayId: d.id, contentItemId, sortOrder: 0, createdById: admin.id } }),
        ]);
      }
      console.log(`Seeded display "${d.name}" -> http://localhost:3000/display/${d.slug}`);
    }
  } else {
    console.log(`Rooms already exist — normalized ${creativeIds.length} shared creatives (no room/display changes).`);
  }

  console.log(`\nHub: http://localhost:3000/hub (dev auth bypass, seeded admin user id ${admin.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
