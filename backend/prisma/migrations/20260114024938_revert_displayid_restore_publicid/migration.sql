/*
  Warnings:

  - You are about to drop the column `displayId` on the `RFQ` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[publicId]` on the table `RFQ` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "RFQ_displayId_key";

-- AlterTable
ALTER TABLE "RFQ" DROP COLUMN "displayId",
ADD COLUMN     "publicId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "RFQ_publicId_key" ON "RFQ"("publicId");
