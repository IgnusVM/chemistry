-- CreateTable
CREATE TABLE "BulkSelection" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "ids" JSONB NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BulkSelection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BulkSelection_createdByUserId_idx" ON "BulkSelection"("createdByUserId");

-- AddForeignKey
ALTER TABLE "BulkSelection" ADD CONSTRAINT "BulkSelection_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
