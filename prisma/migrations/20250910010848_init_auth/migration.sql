-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('CANDIDATE', 'EMPLOYER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."OTPType" AS ENUM ('LOGIN', 'MFA', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "public"."JobType" AS ENUM ('FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT');

-- CreateEnum
CREATE TYPE "public"."AppStatus" AS ENUM ('APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'REJECTED', 'ACCEPTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."VerificationType" AS ENUM ('EDUCATION', 'EMPLOYMENT', 'CERTIFICATION', 'BACKGROUND');

-- CreateEnum
CREATE TYPE "public"."VerificationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'VALIDATED', 'REJECTED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'CANDIDATE',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OTPCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "public"."OTPType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "OTPCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "headline" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Education" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Employment" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "responsibilities" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Certification" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "licenseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Reference" (
    "id" TEXT NOT NULL,
    "employmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "relation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."JobPosting" (
    "id" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT,
    "location" TEXT NOT NULL,
    "type" "public"."JobType" NOT NULL,
    "openings" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobPosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Application" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "resumeUrl" TEXT,
    "coverLetter" TEXT,
    "status" "public"."AppStatus" NOT NULL DEFAULT 'APPLIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Verification" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "type" "public"."VerificationType" NOT NULL,
    "status" "public"."VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "public"."User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "public"."Profile"("userId");

-- AddForeignKey
ALTER TABLE "public"."OTPCode" ADD CONSTRAINT "OTPCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Education" ADD CONSTRAINT "Education_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Employment" ADD CONSTRAINT "Employment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Certification" ADD CONSTRAINT "Certification_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reference" ADD CONSTRAINT "Reference_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "public"."Employment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JobPosting" ADD CONSTRAINT "JobPosting_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Application" ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."JobPosting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Application" ADD CONSTRAINT "Application_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Verification" ADD CONSTRAINT "Verification_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
