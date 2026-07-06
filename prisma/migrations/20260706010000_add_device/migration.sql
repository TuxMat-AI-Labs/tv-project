-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "displayId" TEXT,
    "pairingCode" TEXT,
    "codeExpiresAt" TIMESTAMP(3),
    "label" TEXT,
    "pairedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Device_token_key" ON "Device"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Device_displayId_key" ON "Device"("displayId");

-- CreateIndex
CREATE UNIQUE INDEX "Device_pairingCode_key" ON "Device"("pairingCode");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_displayId_fkey" FOREIGN KEY ("displayId") REFERENCES "Display"("id") ON DELETE SET NULL ON UPDATE CASCADE;
