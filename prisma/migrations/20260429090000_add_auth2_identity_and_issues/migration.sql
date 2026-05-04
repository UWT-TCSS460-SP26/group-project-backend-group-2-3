-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "subjectId" TEXT,
ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT;

-- Existing local Sprint 2 users were not created by Auth2. Give them stable
-- legacy subjects so the final schema can require unique subject IDs safely.
UPDATE "User"
SET "subjectId" = 'legacy-user-' || "id"
WHERE "subjectId" IS NULL;

ALTER TABLE "User"
ALTER COLUMN "subjectId" SET NOT NULL;

-- CreateTable
CREATE TABLE "Issue" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reproductionSteps" TEXT,
    "reporterContact" TEXT,
    "status" "IssueStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_subjectId_key" ON "User"("subjectId");

-- CreateIndex
CREATE INDEX "Issue_status_createdAt_idx" ON "Issue"("status", "createdAt");
