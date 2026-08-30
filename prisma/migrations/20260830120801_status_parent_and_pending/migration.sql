-- Open and Closed become parent statuses, derived rather than stored.
--
-- OPEN is renamed PENDING, and CLOSED is removed: a ticket that has ended is
-- either COMPLETE or CANCELLED, and having CLOSED sit beside them as a third
-- peer is what made the old model ambiguous. Existing CLOSED tickets carry a
-- resolution, meaning the work was done, so they become COMPLETE.
--
-- Postgres cannot drop a value from an enum, so this swaps in a new type. Every
-- column holding the old type is converted here: WorkOrder.status and both of
-- BoardColumn's status fields. Missing one would leave a column typed against a
-- type this migration then tries to drop.
--
-- Note the shape of the array conversion. A subquery is illegal inside
-- ALTER COLUMN ... USING ("cannot use subquery in transform expression"), so the
-- mapping is done with array_replace and the de-duplication follows as a plain
-- UPDATE, where a subquery is allowed.

CREATE TYPE "WorkOrderStatus_new" AS ENUM ('PENDING', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETE', 'CANCELLED');

-- WorkOrder.status
ALTER TABLE "WorkOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "WorkOrder"
  ALTER COLUMN "status" TYPE "WorkOrderStatus_new"
  USING (
    CASE "status"::text
      WHEN 'OPEN' THEN 'PENDING'
      WHEN 'CLOSED' THEN 'COMPLETE'
      ELSE "status"::text
    END
  )::"WorkOrderStatus_new";
ALTER TABLE "WorkOrder" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- BoardColumn.woStatusOnMove (nullable scalar)
ALTER TABLE "BoardColumn"
  ALTER COLUMN "woStatusOnMove" TYPE "WorkOrderStatus_new"
  USING (
    CASE "woStatusOnMove"::text
      WHEN 'OPEN' THEN 'PENDING'
      WHEN 'CLOSED' THEN 'COMPLETE'
      ELSE "woStatusOnMove"::text
    END
  )::"WorkOrderStatus_new";

-- BoardColumn.woStatusesShown (array)
ALTER TABLE "BoardColumn" ALTER COLUMN "woStatusesShown" DROP DEFAULT;
ALTER TABLE "BoardColumn"
  ALTER COLUMN "woStatusesShown" TYPE "WorkOrderStatus_new"[]
  USING array_replace(
    array_replace("woStatusesShown"::text[], 'OPEN', 'PENDING'),
    'CLOSED', 'COMPLETE'
  )::"WorkOrderStatus_new"[];

-- The default Done column shows COMPLETE, CLOSED and CANCELLED. Mapping CLOSED
-- onto COMPLETE leaves COMPLETE listed twice, so collapse duplicates. The board
-- invariant is that every status appears in exactly one column, and a repeated
-- entry is the kind of thing that only surfaces as a doubled card.
UPDATE "BoardColumn" bc
SET "woStatusesShown" = COALESCE(
  (SELECT array_agg(DISTINCT v) FROM unnest(bc."woStatusesShown") AS v),
  '{}'::"WorkOrderStatus_new"[]
);

DROP TYPE "WorkOrderStatus";
ALTER TYPE "WorkOrderStatus_new" RENAME TO "WorkOrderStatus";
