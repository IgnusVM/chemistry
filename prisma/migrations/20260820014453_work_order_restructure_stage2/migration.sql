-- DropIndex
DROP INDEX "WorkOrder_woNumber_key";

-- AlterTable
ALTER TABLE "WorkOrder" DROP COLUMN "title",
DROP COLUMN "woNumber",
ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "code" SET NOT NULL;

