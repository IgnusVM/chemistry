-- Assignment is now tracked purely via WorkOrder.assignedToUserId; status no
-- longer auto-flips to ASSIGNED, so the value is removed from the enum.
-- Existing ASSIGNED rows are reclassified as OPEN before the type swap.
UPDATE "WorkOrder" SET "status" = 'OPEN' WHERE "status" = 'ASSIGNED';

-- AlterEnum
BEGIN;
CREATE TYPE "WorkOrderStatus_new" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETE', 'CLOSED', 'CANCELLED');
ALTER TABLE "public"."WorkOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "WorkOrder" ALTER COLUMN "status" TYPE "WorkOrderStatus_new" USING ("status"::text::"WorkOrderStatus_new");
ALTER TYPE "WorkOrderStatus" RENAME TO "WorkOrderStatus_old";
ALTER TYPE "WorkOrderStatus_new" RENAME TO "WorkOrderStatus";
DROP TYPE "public"."WorkOrderStatus_old";
ALTER TABLE "WorkOrder" ALTER COLUMN "status" SET DEFAULT 'OPEN';
COMMIT;
