-- CreateEnum
CREATE TYPE "SubmittedByType" AS ENUM ('ADMIN', 'TOKEN');

-- AlterTable
ALTER TABLE "RFQ" ADD COLUMN     "submittedByTokenId" TEXT,
ADD COLUMN     "submittedByType" "SubmittedByType" NOT NULL DEFAULT 'ADMIN';

-- CreateTable
CREATE TABLE "SubmissionToken" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "SubmissionToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionToken_tokenHash_key" ON "SubmissionToken"("tokenHash");

-- AddForeignKey
ALTER TABLE "RFQ" ADD CONSTRAINT "RFQ_submittedByTokenId_fkey" FOREIGN KEY ("submittedByTokenId") REFERENCES "SubmissionToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;
