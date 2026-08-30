-- AlterTable
ALTER TABLE "Board" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Board_userId_key" ON "Board"("userId");

-- AddForeignKey
ALTER TABLE "Board" ADD CONSTRAINT "Board_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Board_owner_exactly_one has to be replaced, not extended.
--
-- The old form was `("departmentId" IS NULL) <> ("divisionId" IS NULL)` -- an
-- XOR over two columns. A personal board leaves BOTH of those NULL, so under
-- the old constraint every insert of one would be rejected. Adding the column
-- without this swap produces a feature that cannot store a single row.
--
-- The new form counts the non-null owners and demands exactly one, which is the
-- same rule stated in a way that extends to a fourth owner kind without another
-- rewrite. Existing rows all have exactly one owner and satisfy it unchanged.
ALTER TABLE "Board" DROP CONSTRAINT IF EXISTS "Board_owner_exactly_one";
ALTER TABLE "Board" ADD CONSTRAINT "Board_owner_exactly_one"
  CHECK (
    (("departmentId" IS NOT NULL)::int
     + ("divisionId" IS NOT NULL)::int
     + ("userId" IS NOT NULL)::int) = 1
  );
