-- CreateEnum
CREATE TYPE "OwnershipRole" AS ENUM ('PRIMARY', 'OWNER', 'CARETAKER');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "BookingVoteChoice" AS ENUM ('approve', 'reject', 'abstain');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('pending', 'approved', 'reimbursed', 'rejected');

-- CreateEnum
CREATE TYPE "ExpenseApprovalChoice" AS ENUM ('approve', 'reject', 'abstain');

-- CreateEnum
CREATE TYPE "BookingParticipantRole" AS ENUM ('OWNER', 'FAMILY', 'GUEST', 'CARETAKER', 'SERVICE');

-- CreateEnum
CREATE TYPE "BookingTimelineEventType" AS ENUM ('request_created', 'request_updated', 'vote_cast', 'status_changed', 'auto_action', 'note');

-- CreateEnum
CREATE TYPE "BookingApprovalStrategy" AS ENUM ('majority_share', 'supermajority_share', 'unanimous', 'simple_majority', 'custom');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER_ADMIN', 'OWNER', 'GUEST_VIEWER');

-- CreateEnum
CREATE TYPE "PropertyMembershipRole" AS ENUM ('OWNER', 'MANAGER', 'VIEWER');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'CLAIMED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ChecklistStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "OwnerProfile" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID,

    CONSTRAINT "OwnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMembership" (
    "id" SERIAL NOT NULL,
    "userId" UUID NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ownership" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "ownerProfileId" INTEGER NOT NULL,
    "role" "OwnershipRole" NOT NULL DEFAULT 'OWNER',
    "shareBps" INTEGER NOT NULL DEFAULT 0,
    "votingPower" INTEGER NOT NULL DEFAULT 1,
    "bookingApprover" BOOLEAN NOT NULL DEFAULT true,
    "expenseApprover" BOOLEAN NOT NULL DEFAULT true,
    "blackoutManager" BOOLEAN NOT NULL DEFAULT false,
    "autoSkipBookings" BOOLEAN NOT NULL DEFAULT false,
    "notifyOnBookings" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnExpenses" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ownership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
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
CREATE TABLE "Booking" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "createdByOwnershipId" INTEGER,
    "requestorUserId" UUID,
    "requestorOwnershipId" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'pending',
    "decisionSummary" TEXT,
    "requestNotes" TEXT,
    "totalAmount" INTEGER NOT NULL,
    "policySnapshot" JSONB,
    "submittedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "decisionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingVote" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "ownershipId" INTEGER NOT NULL,
    "choice" "BookingVoteChoice" NOT NULL DEFAULT 'abstain',
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerProfileId" INTEGER,

    CONSTRAINT "BookingVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" UUID NOT NULL,
    "ownerProfileId" INTEGER NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "userId" UUID NOT NULL,
    "role" "PropertyMembershipRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "ownerProfileId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "email" TEXT NOT NULL,
    "role" "PropertyMembershipRole" NOT NULL DEFAULT 'VIEWER',
    "claimedById" UUID,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingParticipant" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "role" "BookingParticipantRole" NOT NULL,
    "userId" UUID,
    "ownershipId" INTEGER,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "nights" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingTimelineEvent" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "eventType" "BookingTimelineEventType" NOT NULL,
    "message" TEXT,
    "payload" JSONB,
    "actorUserId" UUID,
    "actorOwnershipId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingPolicy" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "strategy" "BookingApprovalStrategy" NOT NULL DEFAULT 'majority_share',
    "requiredShareBps" INTEGER,
    "quorumShareBps" INTEGER,
    "autoApproveAfterHours" INTEGER,
    "autoRejectAfterHours" INTEGER,
    "allowGuestRequests" BOOLEAN NOT NULL DEFAULT true,
    "requireOwnerPresence" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingUsageSnapshot" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "bookingId" INTEGER,
    "participantRole" "BookingParticipantRole" NOT NULL,
    "participantKey" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "nights" INTEGER NOT NULL DEFAULT 0,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingUsageSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "createdByOwnershipId" INTEGER,
    "paidByOwnershipId" INTEGER,
    "vendorName" TEXT,
    "category" TEXT,
    "memo" TEXT,
    "amountCents" INTEGER NOT NULL,
    "incurredOn" TIMESTAMP(3) NOT NULL,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'pending',
    "receiptUrl" TEXT,
    "decisionSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseApproval" (
    "id" SERIAL NOT NULL,
    "expenseId" INTEGER NOT NULL,
    "ownershipId" INTEGER NOT NULL,
    "choice" "ExpenseApprovalChoice" NOT NULL DEFAULT 'abstain',
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseAllocation" (
    "id" SERIAL NOT NULL,
    "expenseId" INTEGER NOT NULL,
    "ownershipId" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonPrice" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "nightlyRate" INTEGER NOT NULL,

    CONSTRAINT "SeasonPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestInvite" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "actionLink" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "propertyId" INTEGER,
    "invitedByOwnershipId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blackout" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,

    CONSTRAINT "Blackout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeChecklist" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "summary" TEXT,
    "status" "ChecklistStatus" NOT NULL DEFAULT 'DRAFT',
    "versionCounter" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
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
CREATE TABLE "ChecklistVersion" (
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
CREATE TABLE "KnowledgeDocument" (
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
CREATE TABLE "DocumentVersion" (
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
CREATE TABLE "ChecklistDocument" (
    "id" SERIAL NOT NULL,
    "checklistId" INTEGER NOT NULL,
    "documentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogArticle" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "featuredImage" TEXT,
    "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
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
CREATE TABLE "BlogCategory" (
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
CREATE TABLE "BlogTag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleTag" (
    "id" SERIAL NOT NULL,
    "articleId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OwnerProfile_email_key" ON "OwnerProfile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerProfile_userId_key" ON "OwnerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_userId_organizationId_key" ON "OrganizationMembership"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Ownership_propertyId_ownerProfileId_key" ON "Ownership"("propertyId", "ownerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "Property_slug_key" ON "Property"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BookingVote_bookingId_ownershipId_key" ON "BookingVote"("bookingId", "ownershipId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_ownerProfileId_propertyId_key" ON "Membership"("ownerProfileId", "propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_user_property" ON "Membership"("userId", "propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_token_key" ON "Invite"("token");

-- CreateIndex
CREATE INDEX "Invite_ownerProfileId_propertyId_idx" ON "Invite"("ownerProfileId", "propertyId");

-- CreateIndex
CREATE INDEX "Invite_email_idx" ON "Invite"("email");

-- CreateIndex
CREATE INDEX "BookingParticipant_bookingId_idx" ON "BookingParticipant"("bookingId");

-- CreateIndex
CREATE INDEX "BookingTimelineEvent_bookingId_idx" ON "BookingTimelineEvent"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingPolicy_propertyId_key" ON "BookingPolicy"("propertyId");

-- CreateIndex
CREATE INDEX "BookingUsageSnapshot_propertyId_season_idx" ON "BookingUsageSnapshot"("propertyId", "season");

-- CreateIndex
CREATE INDEX "BookingUsageSnapshot_participantKey_season_idx" ON "BookingUsageSnapshot"("participantKey", "season");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseApproval_expenseId_ownershipId_key" ON "ExpenseApproval"("expenseId", "ownershipId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseAllocation_expenseId_ownershipId_key" ON "ExpenseAllocation"("expenseId", "ownershipId");

-- CreateIndex
CREATE INDEX "ChecklistItem_checklistId_position_idx" ON "ChecklistItem"("checklistId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistVersion_checklistId_version_key" ON "ChecklistVersion"("checklistId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_documentId_version_key" ON "DocumentVersion"("documentId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistDocument_checklistId_documentId_key" ON "ChecklistDocument"("checklistId", "documentId");

-- CreateIndex
CREATE UNIQUE INDEX "BlogArticle_slug_key" ON "BlogArticle"("slug");

-- CreateIndex
CREATE INDEX "BlogArticle_status_publishedAt_idx" ON "BlogArticle"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "BlogArticle_slug_idx" ON "BlogArticle"("slug");

-- CreateIndex
CREATE INDEX "BlogArticle_categoryId_idx" ON "BlogArticle"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "BlogCategory_name_key" ON "BlogCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BlogCategory_slug_key" ON "BlogCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BlogTag_name_key" ON "BlogTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BlogTag_slug_key" ON "BlogTag"("slug");

-- CreateIndex
CREATE INDEX "ArticleTag_articleId_idx" ON "ArticleTag"("articleId");

-- CreateIndex
CREATE INDEX "ArticleTag_tagId_idx" ON "ArticleTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleTag_articleId_tagId_key" ON "ArticleTag"("articleId", "tagId");

-- AddForeignKey
ALTER TABLE "OwnerProfile" ADD CONSTRAINT "OwnerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ownership" ADD CONSTRAINT "Ownership_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ownership" ADD CONSTRAINT "Ownership_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "OwnerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_createdByOwnershipId_fkey" FOREIGN KEY ("createdByOwnershipId") REFERENCES "Ownership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_requestorOwnershipId_fkey" FOREIGN KEY ("requestorOwnershipId") REFERENCES "Ownership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_requestorUserId_fkey" FOREIGN KEY ("requestorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingVote" ADD CONSTRAINT "BookingVote_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingVote" ADD CONSTRAINT "BookingVote_ownershipId_fkey" FOREIGN KEY ("ownershipId") REFERENCES "Ownership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingVote" ADD CONSTRAINT "BookingVote_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "OwnerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "OwnerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "OwnerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingParticipant" ADD CONSTRAINT "BookingParticipant_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingParticipant" ADD CONSTRAINT "BookingParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingParticipant" ADD CONSTRAINT "BookingParticipant_ownershipId_fkey" FOREIGN KEY ("ownershipId") REFERENCES "Ownership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingTimelineEvent" ADD CONSTRAINT "BookingTimelineEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingTimelineEvent" ADD CONSTRAINT "BookingTimelineEvent_actorOwnershipId_fkey" FOREIGN KEY ("actorOwnershipId") REFERENCES "Ownership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingTimelineEvent" ADD CONSTRAINT "BookingTimelineEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPolicy" ADD CONSTRAINT "BookingPolicy_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingUsageSnapshot" ADD CONSTRAINT "BookingUsageSnapshot_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingUsageSnapshot" ADD CONSTRAINT "BookingUsageSnapshot_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdByOwnershipId_fkey" FOREIGN KEY ("createdByOwnershipId") REFERENCES "Ownership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_paidByOwnershipId_fkey" FOREIGN KEY ("paidByOwnershipId") REFERENCES "Ownership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseApproval" ADD CONSTRAINT "ExpenseApproval_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseApproval" ADD CONSTRAINT "ExpenseApproval_ownershipId_fkey" FOREIGN KEY ("ownershipId") REFERENCES "Ownership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseAllocation" ADD CONSTRAINT "ExpenseAllocation_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseAllocation" ADD CONSTRAINT "ExpenseAllocation_ownershipId_fkey" FOREIGN KEY ("ownershipId") REFERENCES "Ownership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonPrice" ADD CONSTRAINT "SeasonPrice_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestInvite" ADD CONSTRAINT "GuestInvite_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestInvite" ADD CONSTRAINT "GuestInvite_invitedByOwnershipId_fkey" FOREIGN KEY ("invitedByOwnershipId") REFERENCES "Ownership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blackout" ADD CONSTRAINT "Blackout_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "KnowledgeChecklist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistVersion" ADD CONSTRAINT "ChecklistVersion_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "KnowledgeChecklist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistDocument" ADD CONSTRAINT "ChecklistDocument_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "KnowledgeChecklist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistDocument" ADD CONSTRAINT "ChecklistDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogArticle" ADD CONSTRAINT "BlogArticle_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogArticle" ADD CONSTRAINT "BlogArticle_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BlogCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleTag" ADD CONSTRAINT "ArticleTag_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "BlogArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleTag" ADD CONSTRAINT "ArticleTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "BlogTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

