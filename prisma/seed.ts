import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Bootstrap only: populate an empty database (e.g. first production deploy) but
  // never clobber an already-configured one. Set FORCE_SEED=1 to re-seed anyway.
  const existingRooms = await prisma.room.count();
  if (existingRooms > 0 && !process.env.FORCE_SEED) {
    console.log(`Seed skipped — ${existingRooms} room(s) already exist. Set FORCE_SEED=1 to re-seed.`);
    return;
  }

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

  const rooms = [
    { name: "Upstairs Office", slug: "upstairs-office", sortOrder: 0 },
    { name: "Multi-Purpose Room", slug: "multi-purpose-room", sortOrder: 1 },
    { name: "Showroom", slug: "showroom", sortOrder: 2 },
  ];

  const roomRecords = new Map<string, { id: string }>();
  for (const room of rooms) {
    const record = await prisma.room.upsert({
      where: { slug: room.slug },
      create: room,
      update: room,
    });
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

  // Ensure the displays exist.
  const displayRecords: { id: string; name: string; slug: string; idx: number }[] = [];
  for (const [i, d] of displaysToSeed.entries()) {
    const room = roomRecords.get(d.roomSlug)!;
    const existing = await prisma.display.findFirst({ where: { name: d.name, roomId: room.id } });
    const display =
      existing ?? (await prisma.display.create({ data: { name: d.name, number: d.number, roomId: room.id } }));
    displayRecords.push({ id: display.id, name: display.name, slug: display.slug, idx: i });
  }

  // Branded TuxMat placeholder creatives (portrait 9:16), served from /public.
  // A single SHARED library named by the creative — not per-display — so the
  // "Change content" list reads as reusable artwork, never tied to one screen.
  const creatives = [
    { title: "Built for the Rest", fileUrl: "/placeholders/coverage-reach.jpg" },
    { title: "Not a Standard", fileUrl: "/placeholders/us-vs-them.jpg" },
    { title: "Your Car Isn't Generic", fileUrl: "/placeholders/your-car.jpg" },
    { title: "The Standard Doesn't Change", fileUrl: "/placeholders/the-standard.jpg" },
  ];

  const creativeIds: string[] = [];
  for (const c of creatives) {
    const existing = await prisma.contentItem.findFirst({ where: { fileUrl: c.fileUrl } });
    const item = existing
      ? await prisma.contentItem.update({
          where: { id: existing.id },
          data: { title: c.title, type: "IMAGE", thumbnailUrl: c.fileUrl, durationSec: 15 },
        })
      : await prisma.contentItem.create({
          data: {
            title: c.title,
            type: "IMAGE",
            fileUrl: c.fileUrl,
            thumbnailUrl: c.fileUrl,
            durationSec: 15,
            uploadedById: admin.id,
          },
        });
    creativeIds.push(item.id);
  }

  // Assign one shared creative per display (rotating), repointing any existing
  // assignment to the shared item so the wall stays populated.
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

  // Remove any legacy per-display content items left orphaned by the repoint.
  await prisma.contentItem.deleteMany({ where: { id: { notIn: creativeIds }, assignments: { none: {} } } });

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
