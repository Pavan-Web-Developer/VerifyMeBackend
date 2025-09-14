-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockUntil" TIMESTAMP(3);
