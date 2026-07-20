/*
  Warnings:

  - You are about to drop the `CostEntry` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CostEntry" DROP CONSTRAINT "CostEntry_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "CostEntry" DROP CONSTRAINT "CostEntry_tableId_fkey";

-- DropTable
DROP TABLE "CostEntry";
