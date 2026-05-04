-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('movie', 'show');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "User"
ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "User"
ALTER COLUMN "role" TYPE "UserRole" USING ("role"::"UserRole");

ALTER TABLE "User"
ALTER COLUMN "role" SET DEFAULT 'user';

-- CreateTable
CREATE TABLE "Rating" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "one_rating_per_user_content" ON "Rating"("userId", "tmdbId", "mediaType");

-- CreateIndex
CREATE INDEX "Rating_tmdbId_mediaType_idx" ON "Rating"("tmdbId", "mediaType");

-- CreateIndex
CREATE INDEX "Rating_userId_idx" ON "Rating"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "one_review_per_user_content" ON "Review"("userId", "tmdbId", "mediaType");

-- CreateIndex
CREATE INDEX "Review_tmdbId_mediaType_createdAt_idx" ON "Review"("tmdbId", "mediaType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "Review"("userId");

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_tmdbId_positive_check" CHECK ("tmdbId" > 0);

-- AddCheckConstraint
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_score_range_check" CHECK ("score" >= 1 AND "score" <= 10);

-- AddCheckConstraint
ALTER TABLE "Review" ADD CONSTRAINT "Review_tmdbId_positive_check" CHECK ("tmdbId" > 0);

-- AddCheckConstraint
ALTER TABLE "Review" ADD CONSTRAINT "Review_title_length_check" CHECK ("title" IS NULL OR char_length("title") <= 120);

-- AddCheckConstraint
ALTER TABLE "Review" ADD CONSTRAINT "Review_body_length_check" CHECK (char_length("body") >= 10 AND char_length("body") <= 5000);
