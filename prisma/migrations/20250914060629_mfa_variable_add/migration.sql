-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfaType" TEXT;
