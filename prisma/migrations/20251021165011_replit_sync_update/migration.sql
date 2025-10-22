-- CreateEnum
CREATE TYPE "cottagr_dev"."ArticleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- DropForeignKey
ALTER TABLE "cottagr_dev"."BookingParticipant" DROP CONSTRAINT "BookingParticipant_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "cottagr_dev"."BookingPolicy" DROP CONSTRAINT "BookingPolicy_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "cottagr_dev"."BookingTimelineEvent" DROP CONSTRAINT "BookingTimelineEvent_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "cottagr_dev"."BookingUsageSnapshot" DROP CONSTRAINT "BookingUsageSnapshot_propertyId_fkey";

-- AlterTable
ALTER TABLE "cottagr_dev"."BookingParticipant" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "cottagr_dev"."BookingPolicy" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "cottagr_dev"."GuestInvite" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "cottagr_dev"."BlogArticle" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "featuredImage" TEXT,
    "status" "cottagr_dev"."ArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "readingTimeMin" INTEGER,
    "authorId" UUID,
    "categoryId" INTEGER,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cottagr_dev"."BlogCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT DEFAULT '#10b981',
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cottagr_dev"."BlogTag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cottagr_dev"."ArticleTag" (
    "id" SERIAL NOT NULL,
    "articleId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlogArticle_slug_key" ON "cottagr_dev"."BlogArticle"("slug");

-- CreateIndex
CREATE INDEX "BlogArticle_status_publishedAt_idx" ON "cottagr_dev"."BlogArticle"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "BlogArticle_slug_idx" ON "cottagr_dev"."BlogArticle"("slug");

-- CreateIndex
CREATE INDEX "BlogArticle_categoryId_idx" ON "cottagr_dev"."BlogArticle"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "BlogCategory_name_key" ON "cottagr_dev"."BlogCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BlogCategory_slug_key" ON "cottagr_dev"."BlogCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BlogTag_name_key" ON "cottagr_dev"."BlogTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BlogTag_slug_key" ON "cottagr_dev"."BlogTag"("slug");

-- CreateIndex
CREATE INDEX "ArticleTag_articleId_idx" ON "cottagr_dev"."ArticleTag"("articleId");

-- CreateIndex
CREATE INDEX "ArticleTag_tagId_idx" ON "cottagr_dev"."ArticleTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleTag_articleId_tagId_key" ON "cottagr_dev"."ArticleTag"("articleId", "tagId");

-- AddForeignKey
ALTER TABLE "cottagr_dev"."BookingParticipant" ADD CONSTRAINT "BookingParticipant_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "cottagr_dev"."Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."BookingTimelineEvent" ADD CONSTRAINT "BookingTimelineEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "cottagr_dev"."Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."BookingPolicy" ADD CONSTRAINT "BookingPolicy_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "cottagr_dev"."Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."BookingUsageSnapshot" ADD CONSTRAINT "BookingUsageSnapshot_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "cottagr_dev"."Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."BlogArticle" ADD CONSTRAINT "BlogArticle_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "cottagr_dev"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."BlogArticle" ADD CONSTRAINT "BlogArticle_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "cottagr_dev"."BlogCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."ArticleTag" ADD CONSTRAINT "ArticleTag_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "cottagr_dev"."BlogArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."ArticleTag" ADD CONSTRAINT "ArticleTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "cottagr_dev"."BlogTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
