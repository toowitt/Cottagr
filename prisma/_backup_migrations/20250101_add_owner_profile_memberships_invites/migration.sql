-- Rename Owner table to OwnerProfile
ALTER TABLE "Owner" RENAME TO "OwnerProfile";
ALTER SEQUENCE "Owner_id_seq" RENAME TO "OwnerProfile_id_seq";

-- Update foreign keys in Ownership
ALTER TABLE "Ownership" RENAME COLUMN "ownerId" TO "ownerProfileId";
ALTER TABLE "Ownership"
  DROP CONSTRAINT IF EXISTS "Ownership_ownerId_fkey";
ALTER TABLE "Ownership"
  ADD CONSTRAINT "Ownership_ownerProfileId_fkey"
    FOREIGN KEY ("ownerProfileId") REFERENCES "OwnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Update references in BookingVote
ALTER TABLE "BookingVote"
  DROP CONSTRAINT IF EXISTS "BookingVote_ownerId_fkey";
ALTER TABLE "BookingVote"
  RENAME COLUMN "ownerId" TO "ownerProfileId";
ALTER TABLE "BookingVote"
  ADD CONSTRAINT "BookingVote_ownerProfileId_fkey"
    FOREIGN KEY ("ownerProfileId") REFERENCES "OwnerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enums for property memberships and invites
CREATE TYPE "PropertyMembershipRole" AS ENUM ('OWNER', 'MANAGER', 'VIEWER');
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'CLAIMED', 'REVOKED');

-- Membership table (property scoped)
CREATE TABLE "Membership" (
  "id" SERIAL PRIMARY KEY,
  "ownerProfileId" INTEGER NOT NULL,
  "propertyId" INTEGER NOT NULL,
  "userId" UUID,
  "role" "PropertyMembershipRole" NOT NULL DEFAULT 'OWNER',
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "Membership_ownerProfile_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "OwnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Membership_property_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Membership_user_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Membership_owner_property_unique" UNIQUE ("ownerProfileId", "propertyId"),
  CONSTRAINT "Membership_user_property_unique" UNIQUE ("userId", "propertyId")
);

-- Invite table for onboarding owners
CREATE TABLE "Invite" (
  "id" SERIAL PRIMARY KEY,
  "propertyId" INTEGER NOT NULL,
  "ownerProfileId" INTEGER NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "claimedAt" TIMESTAMP WITH TIME ZONE,
  "expiresAt" TIMESTAMP WITH TIME ZONE,
  CONSTRAINT "Invite_property_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Invite_ownerProfile_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "OwnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Invite_owner_property_idx" ON "Invite" ("ownerProfileId", "propertyId");

-- Update unique index on Ownership
DROP INDEX IF EXISTS "Ownership_propertyId_ownerId_key";
CREATE UNIQUE INDEX "Ownership_propertyId_ownerProfileId_key" ON "Ownership" ("propertyId", "ownerProfileId");

-- Update dependent foreign key constraints
ALTER TABLE "ExpenseApproval"
  DROP CONSTRAINT IF EXISTS "ExpenseApproval_ownershipId_fkey";
ALTER TABLE "ExpenseApproval"
  ADD CONSTRAINT "ExpenseApproval_ownershipId_fkey"
    FOREIGN KEY ("ownershipId") REFERENCES "Ownership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExpenseAllocation"
  DROP CONSTRAINT IF EXISTS "ExpenseAllocation_ownershipId_fkey";
ALTER TABLE "ExpenseAllocation"
  ADD CONSTRAINT "ExpenseAllocation_ownershipId_fkey"
    FOREIGN KEY ("ownershipId") REFERENCES "Ownership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
