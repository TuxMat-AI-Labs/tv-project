-- CreateEnum
CREATE TYPE "CarouselTransition" AS ENUM ('SLIDE', 'FADE');

-- AlterTable
ALTER TABLE "ContentItem" ADD COLUMN "orientation" "Orientation" NOT NULL DEFAULT 'PORTRAIT';

-- AlterTable
ALTER TABLE "Room" ADD COLUMN "carouselTransition" "CarouselTransition" NOT NULL DEFAULT 'SLIDE';
