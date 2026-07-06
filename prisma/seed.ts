import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

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
    { name: "Multi-Purpose Room 1", number: 1, roomSlug: "multi-purpose-room" },
    { name: "Showroom 1", number: 1, roomSlug: "showroom" },
    { name: "Showroom 2", number: 2, roomSlug: "showroom" },
  ];

  // Branded TuxMat placeholder creatives (portrait 9:16), served from /public.
  // Alternated across displays so the wall isn't monotone.
  const placeholders = ["/placeholders/coverage-reach.jpg", "/placeholders/us-vs-them.jpg"];

  for (const [i, d] of displaysToSeed.entries()) {
    const room = roomRecords.get(d.roomSlug)!;
    const existingDisplay = await prisma.display.findFirst({ where: { name: d.name, roomId: room.id } });
    const display =
      existingDisplay ??
      (await prisma.display.create({ data: { name: d.name, number: d.number, roomId: room.id } }));

    const imageUrl = placeholders[i % placeholders.length];
    const existingAssignment = await prisma.assignment.findFirst({ where: { displayId: display.id } });
    if (existingAssignment) {
      // Refresh the artwork on re-seed so placeholder swaps take effect.
      await prisma.contentItem.update({
        where: { id: existingAssignment.contentItemId },
        data: { type: "IMAGE", fileUrl: imageUrl, thumbnailUrl: imageUrl },
      });
    } else {
      const contentItem = await prisma.contentItem.create({
        data: {
          title: `${d.name} sample poster`,
          type: "IMAGE",
          fileUrl: imageUrl,
          thumbnailUrl: imageUrl,
          durationSec: 15,
          uploadedById: admin.id,
        },
      });
      await prisma.assignment.create({
        data: {
          contentItemId: contentItem.id,
          displayId: display.id,
          sortOrder: 0,
          createdById: admin.id,
        },
      });
    }

    console.log(`Seeded display "${display.name}" -> http://localhost:3000/display/${display.slug}`);
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
