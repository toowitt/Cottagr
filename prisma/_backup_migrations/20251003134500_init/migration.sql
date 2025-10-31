-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "cottagr_dev";

-- CreateEnum
CREATE TYPE "cottagr_dev"."OwnershipRole" AS ENUM ('PRIMARY', 'OWNER', 'CARETAKER');

-- CreateEnum
CREATE TYPE "cottagr_dev"."BookingStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "cottagr_dev"."BookingVoteChoice" AS ENUM ('approve', 'reject', 'abstain');

-- CreateEnum
CREATE TYPE "cottagr_dev"."ExpenseStatus" AS ENUM ('pending', 'approved', 'reimbursed', 'rejected');

-- CreateEnum
CREATE TYPE "cottagr_dev"."ExpenseApprovalChoice" AS ENUM ('approve', 'reject', 'abstain');

-- CreateEnum
CREATE TYPE "cottagr_dev"."MembershipRole" AS ENUM ('OWNER_ADMIN', 'OWNER', 'GUEST_VIEWER');

-- CreateEnum
CREATE TYPE "cottagr_dev"."ChecklistStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "cottagr_dev"."Owner" (
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
CREATE TABLE "cottagr_dev"."User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cottagr_dev"."Organization" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cottagr_dev"."Membership" (
    "id" SERIAL NOT NULL,
    "userId" UUID NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "role" "cottagr_dev"."MembershipRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cottagr_dev"."Ownership" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "role" "cottagr_dev"."OwnershipRole" NOT NULL DEFAULT 'OWNER',
    "shareBps" INTEGER NOT NULL DEFAULT 0,
    "votingPower" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ownership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cottagr_dev"."Property" (
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
CREATE TABLE "cottagr_dev"."Booking" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "createdByOwnershipId" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "status" "cottagr_dev"."BookingStatus" NOT NULL DEFAULT 'pending',
    "decisionSummary" TEXT,
    "requestNotes" TEXT,
    "totalAmount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cottagr_dev"."BookingVote" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "ownershipId" INTEGER NOT NULL,
    "choice" "cottagr_dev"."BookingVoteChoice" NOT NULL DEFAULT 'abstain',
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" INTEGER,

    CONSTRAINT "BookingVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cottagr_dev"."Expense" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "createdByOwnershipId" INTEGER,
    "paidByOwnershipId" INTEGER,
    "vendorName" TEXT,
    "category" TEXT,
    "memo" TEXT,
    "amountCents" INTEGER NOT NULL,
    "incurredOn" TIMESTAMP(3) NOT NULL,
    "status" "cottagr_dev"."ExpenseStatus" NOT NULL DEFAULT 'pending',
    "receiptUrl" TEXT,
    "decisionSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cottagr_dev"."ExpenseApproval" (
    "id" SERIAL NOT NULL,
    "expenseId" INTEGER NOT NULL,
    "ownershipId" INTEGER NOT NULL,
    "choice" "cottagr_dev"."ExpenseApprovalChoice" NOT NULL DEFAULT 'abstain',
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cottagr_dev"."ExpenseAllocation" (
    "id" SERIAL NOT NULL,
    "expenseId" INTEGER NOT NULL,
    "ownershipId" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cottagr_dev"."SeasonPrice" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "nightlyRate" INTEGER NOT NULL,

    CONSTRAINT "SeasonPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cottagr_dev"."Blackout" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,

    CONSTRAINT "Blackout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cottagr_dev"."KnowledgeChecklist" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "summary" TEXT,
    "status" "cottagr_dev"."ChecklistStatus" NOT NULL DEFAULT 'DRAFT',
    "versionCounter" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cottagr_dev"."ChecklistItem" (
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
CREATE TABLE "cottagr_dev"."ChecklistVersion" (
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
CREATE TABLE "cottagr_dev"."KnowledgeDocument" (
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
CREATE TABLE "cottagr_dev"."DocumentVersion" (
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
CREATE TABLE "cottagr_dev"."ChecklistDocument" (
    "id" SERIAL NOT NULL,
    "checklistId" INTEGER NOT NULL,
    "documentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Owner_email_key" ON "cottagr_dev"."Owner"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Owner_userId_key" ON "cottagr_dev"."Owner"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "cottagr_dev"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "cottagr_dev"."Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "cottagr_dev"."Membership"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Ownership_propertyId_ownerId_key" ON "cottagr_dev"."Ownership"("propertyId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Property_slug_key" ON "cottagr_dev"."Property"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BookingVote_bookingId_ownershipId_key" ON "cottagr_dev"."BookingVote"("bookingId", "ownershipId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseApproval_expenseId_ownershipId_key" ON "cottagr_dev"."ExpenseApproval"("expenseId", "ownershipId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseAllocation_expenseId_ownershipId_key" ON "cottagr_dev"."ExpenseAllocation"("expenseId", "ownershipId");

-- CreateIndex
CREATE INDEX "ChecklistItem_checklistId_position_idx" ON "cottagr_dev"."ChecklistItem"("checklistId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistVersion_checklistId_version_key" ON "cottagr_dev"."ChecklistVersion"("checklistId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_documentId_version_key" ON "cottagr_dev"."DocumentVersion"("documentId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistDocument_checklistId_documentId_key" ON "cottagr_dev"."ChecklistDocument"("checklistId", "documentId");

-- AddForeignKey
ALTER TABLE "cottagr_dev"."Owner" ADD CONSTRAINT "Owner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "cottagr_dev"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "cottagr_dev"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "cottagr_dev"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."Ownership" ADD CONSTRAINT "Ownership_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "cottagr_dev"."Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."Ownership" ADD CONSTRAINT "Ownership_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "cottagr_dev"."Owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."Property" ADD CONSTRAINT "Property_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "cottagr_dev"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."Booking" ADD CONSTRAINT "Booking_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "cottagr_dev"."Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."Booking" ADD CONSTRAINT "Booking_createdByOwnershipId_fkey" FOREIGN KEY ("createdByOwnershipId") REFERENCES "cottagr_dev"."Ownership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."BookingVote" ADD CONSTRAINT "BookingVote_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "cottagr_dev"."Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."BookingVote" ADD CONSTRAINT "BookingVote_ownershipId_fkey" FOREIGN KEY ("ownershipId") REFERENCES "cottagr_dev"."Ownership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."BookingVote" ADD CONSTRAINT "BookingVote_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "cottagr_dev"."Owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."Expense" ADD CONSTRAINT "Expense_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "cottagr_dev"."Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."Expense" ADD CONSTRAINT "Expense_createdByOwnershipId_fkey" FOREIGN KEY ("createdByOwnershipId") REFERENCES "cottagr_dev"."Ownership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."Expense" ADD CONSTRAINT "Expense_paidByOwnershipId_fkey" FOREIGN KEY ("paidByOwnershipId") REFERENCES "cottagr_dev"."Ownership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."ExpenseApproval" ADD CONSTRAINT "ExpenseApproval_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "cottagr_dev"."Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."ExpenseApproval" ADD CONSTRAINT "ExpenseApproval_ownershipId_fkey" FOREIGN KEY ("ownershipId") REFERENCES "cottagr_dev"."Ownership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."ExpenseAllocation" ADD CONSTRAINT "ExpenseAllocation_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "cottagr_dev"."Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."ExpenseAllocation" ADD CONSTRAINT "ExpenseAllocation_ownershipId_fkey" FOREIGN KEY ("ownershipId") REFERENCES "cottagr_dev"."Ownership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."SeasonPrice" ADD CONSTRAINT "SeasonPrice_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "cottagr_dev"."Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."Blackout" ADD CONSTRAINT "Blackout_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "cottagr_dev"."Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."ChecklistItem" ADD CONSTRAINT "ChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "cottagr_dev"."KnowledgeChecklist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."ChecklistVersion" ADD CONSTRAINT "ChecklistVersion_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "cottagr_dev"."KnowledgeChecklist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "cottagr_dev"."KnowledgeDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."ChecklistDocument" ADD CONSTRAINT "ChecklistDocument_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "cottagr_dev"."KnowledgeChecklist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cottagr_dev"."ChecklistDocument" ADD CONSTRAINT "ChecklistDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "cottagr_dev"."KnowledgeDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

