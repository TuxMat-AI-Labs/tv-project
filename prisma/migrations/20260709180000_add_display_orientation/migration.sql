-- CreateEnum
CREATE TYPE "Orientation" AS ENUM ('PORTRAIT', 'LANDSCAPE');

-- AlterTable
ALTER TABLE "Display" ADD COLUMN "orientation" "Orientation" NOT NULL DEFAULT 'PORTRAIT';
