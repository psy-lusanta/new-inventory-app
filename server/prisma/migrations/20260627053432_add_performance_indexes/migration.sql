-- CreateIndex
CREATE INDEX "InventoryRow_tableId_idx" ON "InventoryRow"("tableId");

-- CreateIndex
CREATE INDEX "InventoryRow_tableId_createdAt_idx" ON "InventoryRow"("tableId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryRow_createdBy_idx" ON "InventoryRow"("createdBy");

-- CreateIndex
CREATE INDEX "InventoryRow_updatedAt_idx" ON "InventoryRow"("updatedAt");

-- CreateIndex
CREATE INDEX "InventoryTable_createdAt_idx" ON "InventoryTable"("createdAt");

-- CreateIndex
CREATE INDEX "InventoryTable_createdBy_idx" ON "InventoryTable"("createdBy");

-- CreateIndex
CREATE INDEX "PafForm_createdAt_idx" ON "PafForm"("createdAt");

-- CreateIndex
CREATE INDEX "PafForm_createdBy_idx" ON "PafForm"("createdBy");

-- CreateIndex
CREATE INDEX "PafForm_pafNo_idx" ON "PafForm"("pafNo");

-- CreateIndex
CREATE INDEX "StockMovement_tableId_idx" ON "StockMovement"("tableId");

-- CreateIndex
CREATE INDEX "StockMovement_rowId_idx" ON "StockMovement"("rowId");

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_createdBy_idx" ON "StockMovement"("createdBy");
