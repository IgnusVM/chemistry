-- CreateTable
CREATE TABLE "CardWorkOrderRef" (
    "cardId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardWorkOrderRef_pkey" PRIMARY KEY ("cardId","workOrderId")
);

-- CreateIndex
CREATE INDEX "CardWorkOrderRef_workOrderId_idx" ON "CardWorkOrderRef"("workOrderId");

-- AddForeignKey
ALTER TABLE "CardWorkOrderRef" ADD CONSTRAINT "CardWorkOrderRef_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardWorkOrderRef" ADD CONSTRAINT "CardWorkOrderRef_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

