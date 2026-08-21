-- CreateEnum
CREATE TYPE "NoteFormat" AS ENUM ('HTML', 'MARKDOWN');

-- CreateTable
CREATE TABLE "AssetNote" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "userId" TEXT,
    "body" TEXT NOT NULL,
    "format" "NoteFormat" NOT NULL DEFAULT 'HTML',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetCodeFile" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,

    CONSTRAINT "AssetCodeFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetCodeFileVersion" (
    "id" TEXT NOT NULL,
    "codeFileId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "workOrderId" TEXT,

    CONSTRAINT "AssetCodeFileVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetNote_assetId_idx" ON "AssetNote"("assetId");

-- CreateIndex
CREATE INDEX "AssetCodeFile_assetId_idx" ON "AssetCodeFile"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetCodeFile_assetId_filename_key" ON "AssetCodeFile"("assetId", "filename");

-- CreateIndex
CREATE INDEX "AssetCodeFileVersion_codeFileId_idx" ON "AssetCodeFileVersion"("codeFileId");

-- CreateIndex
CREATE INDEX "AssetCodeFileVersion_workOrderId_idx" ON "AssetCodeFileVersion"("workOrderId");

-- AddForeignKey
ALTER TABLE "AssetNote" ADD CONSTRAINT "AssetNote_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetNote" ADD CONSTRAINT "AssetNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetCodeFile" ADD CONSTRAINT "AssetCodeFile_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetCodeFile" ADD CONSTRAINT "AssetCodeFile_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetCodeFileVersion" ADD CONSTRAINT "AssetCodeFileVersion_codeFileId_fkey" FOREIGN KEY ("codeFileId") REFERENCES "AssetCodeFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetCodeFileVersion" ADD CONSTRAINT "AssetCodeFileVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetCodeFileVersion" ADD CONSTRAINT "AssetCodeFileVersion_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data migration: carry any existing Asset.notes text into the new AssetNote
-- list as that asset's first note, before dropping the old single-field
-- column. HTML-escape the legacy plain text so it renders safely once
-- treated as HTML-format note content.
INSERT INTO "AssetNote" (id, "assetId", "userId", body, format, "createdAt")
SELECT
    gen_random_uuid()::text,
    id,
    "createdByUserId",
    replace(replace(replace(notes, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
    'HTML',
    "createdAt"
FROM "Asset"
WHERE notes IS NOT NULL AND notes != '';

-- AlterTable
ALTER TABLE "Asset" DROP COLUMN "notes";

-- AlterTable
ALTER TABLE "WorkOrderNote" ADD COLUMN "format" "NoteFormat" NOT NULL DEFAULT 'HTML';
