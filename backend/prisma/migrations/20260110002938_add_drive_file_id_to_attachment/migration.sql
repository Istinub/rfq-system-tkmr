-- AlterTable
ALTER TABLE "AdminSetting" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN     "driveFileId" TEXT;
