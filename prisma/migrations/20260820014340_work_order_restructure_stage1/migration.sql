-- DropForeignKey
ALTER TABLE "FailureCode" DROP CONSTRAINT "FailureCode_assetTypeId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_failureCodeId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "contactDuringBurnCell" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contactDuringBurnEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contactDuringBurnOther" TEXT;

-- AlterTable
ALTER TABLE "WorkOrder" DROP COLUMN "failureCodeId",
ADD COLUMN     "code" TEXT,
ADD COLUMN     "resolutionCodeId" TEXT,
ALTER COLUMN "title" DROP NOT NULL;

-- DropTable
DROP TABLE "FailureCode";

-- CreateTable
CREATE TABLE "ResolutionCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResolutionCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResolutionCode_code_key" ON "ResolutionCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_code_key" ON "WorkOrder"("code");

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_resolutionCodeId_fkey" FOREIGN KEY ("resolutionCodeId") REFERENCES "ResolutionCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

