/*
  Warnings:

  - Added the required column `updatedAt` to the `Quotation` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('RECEIVED', 'REVISED', 'APPROVED');

-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "driveFileId" TEXT,
ADD COLUMN     "driveFolderId" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "status" "QuotationStatus" NOT NULL DEFAULT 'RECEIVED';

-- CreateTable
CREATE TABLE "QuotationLine" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "lineTotal" DOUBLE PRECISION NOT NULL,
    "details" TEXT,

    CONSTRAINT "QuotationLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuotationLine_quotationId_idx" ON "QuotationLine"("quotationId");

-- AddForeignKey
ALTER TABLE "Quotation" ADD COLUMN "updatedAt" TIMESTAMP(3);
UPDATE "Quotation" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;
ALTER TABLE "Quotation" ALTER COLUMN "updatedAt" SET NOT NULL;
