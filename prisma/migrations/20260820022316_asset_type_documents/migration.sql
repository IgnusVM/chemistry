-- CreateTable
CREATE TABLE "AssetTypeDocument" (
    "id" TEXT NOT NULL,
    "assetTypeId" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetTypeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetTypeDocument_assetTypeId_idx" ON "AssetTypeDocument"("assetTypeId");

-- AddForeignKey
ALTER TABLE "AssetTypeDocument" ADD CONSTRAINT "AssetTypeDocument_assetTypeId_fkey" FOREIGN KEY ("assetTypeId") REFERENCES "AssetType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetTypeDocument" ADD CONSTRAINT "AssetTypeDocument_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

