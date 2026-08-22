-- Code files move from an individual Asset to its AssetType: 300 lanterns run
-- one program, so the source belongs to the design, not to whichever unit a bug
-- was found on.
--
-- Both environments were verified empty before writing this, but the column is
-- added nullable and backfilled from the owning asset's type anyway, so this is
-- still correct if any row exists somewhere unseen. If two assets of the same
-- type ever held a file with the same name, the unique index below aborts the
-- whole migration rather than silently discarding one of them.

ALTER TABLE "AssetCodeFile" DROP CONSTRAINT "AssetCodeFile_assetId_fkey";
DROP INDEX "AssetCodeFile_assetId_filename_key";
DROP INDEX "AssetCodeFile_assetId_idx";

ALTER TABLE "AssetCodeFile" ADD COLUMN "assetTypeId" TEXT;

UPDATE "AssetCodeFile" cf
   SET "assetTypeId" = a."assetTypeId"
  FROM "Asset" a
 WHERE a.id = cf."assetId";

ALTER TABLE "AssetCodeFile" ALTER COLUMN "assetTypeId" SET NOT NULL;
ALTER TABLE "AssetCodeFile" DROP COLUMN "assetId";

CREATE INDEX "AssetCodeFile_assetTypeId_idx" ON "AssetCodeFile"("assetTypeId");
CREATE UNIQUE INDEX "AssetCodeFile_assetTypeId_filename_key" ON "AssetCodeFile"("assetTypeId", "filename");

ALTER TABLE "AssetCodeFile" ADD CONSTRAINT "AssetCodeFile_assetTypeId_fkey"
  FOREIGN KEY ("assetTypeId") REFERENCES "AssetType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
