-- Boards may belong to a division as well as a department.
--
-- SAFETY: this is additive in effect despite containing an ALTER COLUMN.
--   * ADD COLUMN "divisionId" is nullable with no default -- no row rewrite.
--   * DROP NOT NULL on "departmentId" RELAXES a constraint. Existing rows keep
--     their values; nothing is dropped, rewritten, or defaulted.
--   * The CHECK below is satisfied by every existing row, all of which have a
--     departmentId and a NULL divisionId, so adding it cannot fail on live data.
-- No UPDATE or DELETE runs against any existing row.

-- AlterTable
ALTER TABLE "Board" ADD COLUMN     "divisionId" TEXT,
ALTER COLUMN "departmentId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Board_divisionId_key" ON "Board"("divisionId");

-- AddForeignKey
ALTER TABLE "Board" ADD CONSTRAINT "Board_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written: Prisma cannot express "exactly one of these two columns is set".
--
-- Without this the schema permits a board owned by nothing (invisible, belongs
-- to no one) or by both a department and a division (two owners disagreeing
-- about who may write to it). Both are states no application code would create
-- deliberately and no application code checks for, which is precisely the kind
-- of invariant that belongs in the database rather than in a code review.
--
-- `<>` on two booleans is XOR: true when exactly one side is NULL.
ALTER TABLE "Board" ADD CONSTRAINT "Board_owner_exactly_one"
  CHECK (("departmentId" IS NULL) <> ("divisionId" IS NULL));
