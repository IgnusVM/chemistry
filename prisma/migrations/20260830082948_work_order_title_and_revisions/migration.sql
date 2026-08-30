-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "title" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "WorkOrderRevision" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "editedByUserId" TEXT,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "undone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkOrderRevision_workOrderId_createdAt_idx" ON "WorkOrderRevision"("workOrderId", "createdAt");

-- AddForeignKey
ALTER TABLE "WorkOrderRevision" ADD CONSTRAINT "WorkOrderRevision_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderRevision" ADD CONSTRAINT "WorkOrderRevision_editedByUserId_fkey" FOREIGN KEY ("editedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill the new title from the field that has been serving as one.
--
-- Until now a work order had a single `description`, and every list rendered it
-- as the ticket's name. Existing rows therefore already hold a title in that
-- column; copying it across is what keeps them readable rather than showing a
-- wall of blank names the moment this deploys.
--
-- The value stays in `description` as well. That is deliberate: it is the only
-- account of the problem those tickets have, and moving it out would delete
-- information to satisfy a naming change. Anyone editing an old ticket can
-- shorten the title and expand the description from there.
UPDATE "WorkOrder" SET "title" = "description" WHERE "title" = '';
