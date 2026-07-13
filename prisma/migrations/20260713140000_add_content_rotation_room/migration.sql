-- AlterTable
ALTER TABLE "ContentItem" ADD COLUMN "rotationRoomId" TEXT;

-- CreateIndex
CREATE INDEX "ContentItem_rotationRoomId_idx" ON "ContentItem"("rotationRoomId");

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_rotationRoomId_fkey" FOREIGN KEY ("rotationRoomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
