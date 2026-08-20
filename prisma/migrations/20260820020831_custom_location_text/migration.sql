-- DropForeignKey
ALTER TABLE "AssetLocationHistory" DROP CONSTRAINT "AssetLocationHistory_locationId_fkey";

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "customLocationText" TEXT;

-- AlterTable
ALTER TABLE "AssetLocationHistory" ADD COLUMN     "customLocationText" TEXT,
ALTER COLUMN "locationId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "AssetLocationHistory" ADD CONSTRAINT "AssetLocationHistory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

