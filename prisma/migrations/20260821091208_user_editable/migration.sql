-- DropForeignKey
ALTER TABLE "InviteCode" DROP CONSTRAINT "InviteCode_createdByUserId_fkey";

-- AlterTable
ALTER TABLE "InviteCode" ALTER COLUMN "createdByUserId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_displayName_key" ON "User"("displayName");

-- AddForeignKey
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
