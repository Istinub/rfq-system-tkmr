-- Allow submission tokens to have no expiry or unlimited uses
ALTER TABLE "SubmissionToken" ALTER COLUMN "expiresAt" DROP NOT NULL;
ALTER TABLE "SubmissionToken" ALTER COLUMN "maxUses" DROP NOT NULL;
ALTER TABLE "SubmissionToken" ALTER COLUMN "maxUses" DROP DEFAULT;
