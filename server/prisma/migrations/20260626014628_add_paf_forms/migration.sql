-- CreateTable
CREATE TABLE "PafForm" (
    "id" TEXT NOT NULL,
    "pafNo" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "contactNo" TEXT,
    "address" TEXT,
    "date" TEXT NOT NULL,
    "position" TEXT,
    "deptBranch" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "PafForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PafItem" (
    "id" TEXT NOT NULL,
    "particulars" TEXT,
    "assetTag" TEXT,
    "brand" TEXT,
    "modelPartNo" TEXT,
    "serialImeiNo" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "formId" TEXT NOT NULL,

    CONSTRAINT "PafItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PafCounter" (
    "id" TEXT NOT NULL,
    "dept" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PafCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PafForm_pafNo_key" ON "PafForm"("pafNo");

-- CreateIndex
CREATE UNIQUE INDEX "PafCounter_dept_year_key" ON "PafCounter"("dept", "year");

-- AddForeignKey
ALTER TABLE "PafForm" ADD CONSTRAINT "PafForm_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PafItem" ADD CONSTRAINT "PafItem_formId_fkey" FOREIGN KEY ("formId") REFERENCES "PafForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
