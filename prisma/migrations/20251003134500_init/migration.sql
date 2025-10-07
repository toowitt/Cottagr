-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."OwnershipRole" AS ENUM ('PRIMARY', 'OWNER', 'CARETAKER');

-- CreateEnum
CREATE TYPE "public"."BookingStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."BookingVoteChoice" AS ENUM ('approve', 'reject', 'abstain');

-- CreateEnum
CREATE TYPE "public"."ExpenseStatus" AS ENUM ('pending', 'approved', 'reimbursed', 'rejected');

-- CreateEnum
CREATE TYPE "public"."ExpenseApprovalChoice" AS ENUM ('approve', 'reject', 'abstain');

-- CreateEnum
CREATE TYPE "public"."MembershipRole" AS ENUM ('OWNER_ADMIN', 'OWNER', 'GUEST_VIEWER');

-- CreateEnum
CREATE TYPE "public"."ChecklistStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "public"."Owner" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID,

    CONSTRAINT "Owner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Organization" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Membership" (
    "id" SERIAL NOT NULL,
    "userId" UUID NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "role" "public"."MembershipRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ownership" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "role" "public"."OwnershipRole" NOT NULL DEFAULT 'OWNER',
    "shareBps" INTEGER NOT NULL DEFAULT 0,
    "votingPower" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ownership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Property" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "location" TEXT,
    "beds" INTEGER,
    "baths" INTEGER,
    "description" TEXT,
    "nightlyRate" INTEGER NOT NULL,
    "cleaningFee" INTEGER NOT NULL,
    "minNights" INTEGER NOT NULL DEFAULT 2,
    "approvalPolicy" TEXT NOT NULL DEFAULT 'majority',
    "photos" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" INTEGER,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Booking" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "createdByOwnershipId" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "status" "public"."BookingStatus" NOT NULL DEFAULT 'pending',
    "decisionSummary" TEXT,
    "requestNotes" TEXT,
    "totalAmount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BookingVote" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "ownershipId" INTEGER NOT NULL,
    "choice" "public"."BookingVoteChoice" NOT NULL DEFAULT 'abstain',
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" INTEGER,

    CONSTRAINT "BookingVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Expense" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "createdByOwnershipId" INTEGER,
    "paidByOwnershipId" INTEGER,
    "vendorName" TEXT,
    "category" TEXT,
    "memo" TEXT,
    "amountCents" INTEGER NOT NULL,
    "incurredOn" TIMESTAMP(3) NOT NULL,
    "status" "public"."ExpenseStatus" NOT NULL DEFAULT 'pending',
    "receiptUrl" TEXT,
    "decisionSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExpenseApproval" (
    "id" SERIAL NOT NULL,
    "expenseId" INTEGER NOT NULL,
    "ownershipId" INTEGER NOT NULL,
    "choice" "public"."ExpenseApprovalChoice" NOT NULL DEFAULT 'abstain',
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExpenseAllocation" (
    "id" SERIAL NOT NULL,
    "expenseId" INTEGER NOT NULL,
    "ownershipId" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SeasonPrice" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "nightlyRate" INTEGER NOT NULL,

    CONSTRAINT "SeasonPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Blackout" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,

    CONSTRAINT "Blackout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KnowledgeChecklist" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "summary" TEXT,
    "status" "public"."ChecklistStatus" NOT NULL DEFAULT 'DRAFT',
    "versionCounter" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChecklistItem" (
    "id" SERIAL NOT NULL,
    "checklistId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChecklistVersion" (
    "id" SERIAL NOT NULL,
    "checklistId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "category" TEXT,
    "items" JSONB NOT NULL,
    "documents" JSONB,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KnowledgeDocument" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileKey" TEXT NOT NULL,
    "fileUrl" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocumentVersion" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileUrl" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChecklistDocument" (
    "id" SERIAL NOT NULL,
    "checklistId" INTEGER NOT NULL,
    "documentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Owner_email_key" ON "public"."Owner"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Owner_userId_key" ON "public"."Owner"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "public"."Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "public"."Membership"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Ownership_propertyId_ownerId_key" ON "public"."Ownership"("propertyId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Property_slug_key" ON "public"."Property"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BookingVote_bookingId_ownershipId_key" ON "public"."BookingVote"("bookingId", "ownershipId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseApproval_expenseId_ownershipId_key" ON "public"."ExpenseApproval"("expenseId", "ownershipId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseAllocation_expenseId_ownershipId_key" ON "public"."ExpenseAllocation"("expenseId", "ownershipId");

-- CreateIndex
CREATE INDEX "ChecklistItem_checklistId_position_idx" ON "public"."ChecklistItem"("checklistId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistVersion_checklistId_version_key" ON "public"."ChecklistVersion"("checklistId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_documentId_version_key" ON "public"."DocumentVersion"("documentId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistDocument_checklistId_documentId_key" ON "public"."ChecklistDocument"("checklistId", "documentId");

-- AddForeignKey
ALTER TABLE "public"."Owner" ADD CONSTRAINT "Owner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ownership" ADD CONSTRAINT "Ownership_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ownership" ADD CONSTRAINT "Ownership_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."Owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Property" ADD CONSTRAINT "Property_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_createdByOwnershipId_fkey" FOREIGN KEY ("createdByOwnershipId") REFERENCES "public"."Ownership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BookingVote" ADD CONSTRAINT "BookingVote_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BookingVote" ADD CONSTRAINT "BookingVote_ownershipId_fkey" FOREIGN KEY ("ownershipId") REFERENCES "public"."Ownership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BookingVote" ADD CONSTRAINT "BookingVote_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."Owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_createdByOwnershipId_fkey" FOREIGN KEY ("createdByOwnershipId") REFERENCES "public"."Ownership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_paidByOwnershipId_fkey" FOREIGN KEY ("paidByOwnershipId") REFERENCES "public"."Ownership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpenseApproval" ADD CONSTRAINT "ExpenseApproval_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "public"."Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpenseApproval" ADD CONSTRAINT "ExpenseApproval_ownershipId_fkey" FOREIGN KEY ("ownershipId") REFERENCES "public"."Ownership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpenseAllocation" ADD CONSTRAINT "ExpenseAllocation_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "public"."Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpenseAllocation" ADD CONSTRAINT "ExpenseAllocation_ownershipId_fkey" FOREIGN KEY ("ownershipId") REFERENCES "public"."Ownership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SeasonPrice" ADD CONSTRAINT "SeasonPrice_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Blackout" ADD CONSTRAINT "Blackout_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChecklistItem" ADD CONSTRAINT "ChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "public"."KnowledgeChecklist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChecklistVersion" ADD CONSTRAINT "ChecklistVersion_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "public"."KnowledgeChecklist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."KnowledgeDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChecklistDocument" ADD CONSTRAINT "ChecklistDocument_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "public"."KnowledgeChecklist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChecklistDocument" ADD CONSTRAINT "ChecklistDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."KnowledgeDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

