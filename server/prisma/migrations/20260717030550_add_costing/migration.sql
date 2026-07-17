-- CreateTable
CREATE TABLE "CostEntry" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "rowId" TEXT,
    "itemName" TEXT NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "CostEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CostEntry_tableId_idx" ON "CostEntry"("tableId");

-- CreateIndex
CREATE INDEX "CostEntry_purchasedAt_idx" ON "CostEntry"("purchasedAt");

-- CreateIndex
CREATE INDEX "CostEntry_createdBy_idx" ON "CostEntry"("createdBy");

-- AddForeignKey
ALTER TABLE "CostEntry" ADD CONSTRAINT "CostEntry_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "InventoryTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostEntry" ADD CONSTRAINT "CostEntry_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
