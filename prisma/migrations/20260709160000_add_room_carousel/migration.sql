-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "carouselActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Room" ADD COLUMN     "carouselStartedAt" TIMESTAMP(3);
