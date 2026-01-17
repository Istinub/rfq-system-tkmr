/*
  Warnings:

  - You are about to drop the column `publicId` on the `RFQ` table. All the data in the column will be lost.
  - Made the column `displayId` on table `RFQ` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "RFQ_publicId_key";

-- AlterTable
ALTER TABLE "RFQ" DROP COLUMN "publicId",
ALTER COLUMN "displayId" SET NOT NULL;
