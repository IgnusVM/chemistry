-- AlterTable
ALTER TABLE "AssetType" ADD COLUMN     "loanable" BOOLEAN NOT NULL DEFAULT false;
-- CreateTable
CREATE TABLE "AssetLoanPrivilege" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "grantedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssetLoanPrivilege_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "AssetLoan" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "borrowerUserId" TEXT,
    "checkedOutByUserId" TEXT,
    "checkedOutAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedOutNotes" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "checkedInByUserId" TEXT,
    "checkedInNotes" TEXT,
    CONSTRAINT "AssetLoan_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "AssetLoanPrivilege_departmentId_idx" ON "AssetLoanPrivilege"("departmentId");
-- CreateIndex
CREATE UNIQUE INDEX "AssetLoanPrivilege_userId_departmentId_key" ON "AssetLoanPrivilege"("userId", "departmentId");
-- CreateIndex
CREATE INDEX "AssetLoan_assetId_idx" ON "AssetLoan"("assetId");
-- CreateIndex
CREATE INDEX "AssetLoan_borrowerUserId_idx" ON "AssetLoan"("borrowerUserId");
-- AddForeignKey
ALTER TABLE "AssetLoanPrivilege" ADD CONSTRAINT "AssetLoanPrivilege_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "AssetLoanPrivilege" ADD CONSTRAINT "AssetLoanPrivilege_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "AssetLoanPrivilege" ADD CONSTRAINT "AssetLoanPrivilege_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "AssetLoan" ADD CONSTRAINT "AssetLoan_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "AssetLoan" ADD CONSTRAINT "AssetLoan_borrowerUserId_fkey" FOREIGN KEY ("borrowerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "AssetLoan" ADD CONSTRAINT "AssetLoan_checkedOutByUserId_fkey" FOREIGN KEY ("checkedOutByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "AssetLoan" ADD CONSTRAINT "AssetLoan_checkedInByUserId_fkey" FOREIGN KEY ("checkedInByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- An asset can only be checked out once at a time. Prisma's schema language
-- can't express a partial index, but without this two people racing the
-- check-out button would both succeed and the log would show two open loans.
CREATE UNIQUE INDEX "AssetLoan_one_open_loan_per_asset"
  ON "AssetLoan"("assetId")
  WHERE "checkedInAt" IS NULL;
