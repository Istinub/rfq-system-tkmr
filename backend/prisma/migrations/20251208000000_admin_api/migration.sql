-- CreateEnum
CREATE TYPE "AccessResult" AS ENUM ('success', 'expired', 'disabled');

-- AlterTable
ALTER TABLE "SecureLink"
ADD COLUMN "disabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AdminSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "tokenExpiryDays" INTEGER NOT NULL DEFAULT 7,
    "oneTimeAccess" BOOLEAN NOT NULL DEFAULT false,
    "rateLimitPerMinute" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecureLinkAccessLog" (
    "id" TEXT NOT NULL,
    "secureLinkId" TEXT,
    "rfqId" TEXT,
    "token" TEXT NOT NULL,
    "result" "AccessResult" NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SecureLinkAccessLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SecureLinkAccessLog"
ADD CONSTRAINT "SecureLinkAccessLog_secureLinkId_fkey" FOREIGN KEY ("secureLinkId") REFERENCES "SecureLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SecureLinkAccessLog"
ADD CONSTRAINT "SecureLinkAccessLog_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RFQ"("id") ON DELETE SET NULL ON UPDATE CASCADE;
