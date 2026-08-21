-- CreateTable
CREATE TABLE "PartLink" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "price" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,

    CONSTRAINT "PartLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartLink_partId_idx" ON "PartLink"("partId");

-- AddForeignKey
ALTER TABLE "PartLink" ADD CONSTRAINT "PartLink_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartLink" ADD CONSTRAINT "PartLink_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data migration: carry any existing PartOrder.purchaseLink values over to
-- the new PartLink list before dropping the column, so real links (and
-- their logged price) aren't silently lost.
INSERT INTO "PartLink" (id, "partId", url, price, "createdAt", "createdByUserId")
SELECT gen_random_uuid()::text, "partId", "purchaseLink", price, "createdAt", "createdByUserId"
FROM "PartOrder"
WHERE "purchaseLink" IS NOT NULL AND "purchaseLink" != '';

-- AlterTable
ALTER TABLE "PartOrder" DROP COLUMN "purchaseLink",
ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;
