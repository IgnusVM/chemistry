-- A catch-all work order type, for work that is not a repair, an inspection,
-- or any of the other maintenance-shaped categories.
-- AlterEnum
ALTER TYPE "WorkOrderType" ADD VALUE 'GENERAL';

-- Optional longer instructions on a checklist task, so a task can say what to
-- do without the one-line text growing into a paragraph.
-- AlterTable
ALTER TABLE "WorkOrderTask" ADD COLUMN     "instructions" TEXT;
