/*
  Warnings:

  - A unique constraint covering the columns `[rfqNo]` on the table `RFQ` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[publicId]` on the table `RFQ` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[displayId]` on the table `RFQ` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "RFQ" ADD COLUMN     "displayId" TEXT,
ADD COLUMN     "publicId" TEXT,
ADD COLUMN     "rfqNo" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "RFQ_rfqNo_key" ON "RFQ"("rfqNo");

-- CreateIndex
CREATE UNIQUE INDEX "RFQ_publicId_key" ON "RFQ"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "RFQ_displayId_key" ON "RFQ"("displayId");
