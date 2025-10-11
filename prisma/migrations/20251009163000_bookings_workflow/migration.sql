-- Create new enum types
CREATE TYPE "BookingParticipantRole" AS ENUM ('OWNER', 'FAMILY', 'GUEST', 'CARETAKER', 'SERVICE');
CREATE TYPE "BookingTimelineEventType" AS ENUM ('request_created', 'request_updated', 'vote_cast', 'status_changed', 'auto_action', 'note');
CREATE TYPE "BookingApprovalStrategy" AS ENUM ('majority_share', 'supermajority_share', 'unanimous', 'simple_majority', 'custom');

-- Extend Booking with request metadata
ALTER TABLE "Booking"
  ADD COLUMN "requestorUserId" UUID,
  ADD COLUMN "requestorOwnershipId" INTEGER,
  ADD COLUMN "policySnapshot" JSONB,
  ADD COLUMN "submittedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "decisionAt" TIMESTAMP(3);

-- Participants attached to a booking
CREATE TABLE "BookingParticipant" (
  "id" SERIAL PRIMARY KEY,
  "bookingId" INTEGER NOT NULL,
  "role" "BookingParticipantRole" NOT NULL,
  "userId" UUID,
  "ownershipId" INTEGER,
  "displayName" TEXT NOT NULL,
  "email" TEXT,
  "nights" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Timeline events for bookings
CREATE TABLE "BookingTimelineEvent" (
  "id" SERIAL PRIMARY KEY,
  "bookingId" INTEGER NOT NULL,
  "eventType" "BookingTimelineEventType" NOT NULL,
  "message" TEXT,
  "payload" JSONB,
  "actorUserId" UUID,
  "actorOwnershipId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Per-property approval policy snapshot
CREATE TABLE "BookingPolicy" (
  "id" SERIAL PRIMARY KEY,
  "propertyId" INTEGER NOT NULL,
  "strategy" "BookingApprovalStrategy" NOT NULL DEFAULT 'majority_share',
  "requiredShareBps" INTEGER,
  "quorumShareBps" INTEGER,
  "autoApproveAfterHours" INTEGER,
  "autoRejectAfterHours" INTEGER,
  "allowGuestRequests" BOOLEAN NOT NULL DEFAULT TRUE,
  "requireOwnerPresence" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "BookingPolicy_propertyId_key" ON "BookingPolicy"("propertyId");

-- Usage snapshots for fairness reporting
CREATE TABLE "BookingUsageSnapshot" (
  "id" SERIAL PRIMARY KEY,
  "propertyId" INTEGER NOT NULL,
  "bookingId" INTEGER,
  "participantRole" "BookingParticipantRole" NOT NULL,
  "participantKey" TEXT NOT NULL,
  "season" TEXT NOT NULL,
  "nights" INTEGER NOT NULL DEFAULT 0,
  "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "BookingParticipant_bookingId_idx" ON "BookingParticipant"("bookingId");
CREATE INDEX "BookingTimelineEvent_bookingId_idx" ON "BookingTimelineEvent"("bookingId");
CREATE INDEX "BookingUsageSnapshot_propertyId_season_idx" ON "BookingUsageSnapshot"("propertyId", "season");
CREATE INDEX "BookingUsageSnapshot_participantKey_season_idx" ON "BookingUsageSnapshot"("participantKey", "season");

-- Foreign keys
ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_requestorUserId_fkey" FOREIGN KEY ("requestorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Booking_requestorOwnershipId_fkey" FOREIGN KEY ("requestorOwnershipId") REFERENCES "Ownership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BookingParticipant"
  ADD CONSTRAINT "BookingParticipant_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "BookingParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "BookingParticipant_ownershipId_fkey" FOREIGN KEY ("ownershipId") REFERENCES "Ownership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BookingTimelineEvent"
  ADD CONSTRAINT "BookingTimelineEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "BookingTimelineEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "BookingTimelineEvent_actorOwnershipId_fkey" FOREIGN KEY ("actorOwnershipId") REFERENCES "Ownership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BookingPolicy"
  ADD CONSTRAINT "BookingPolicy_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BookingUsageSnapshot"
  ADD CONSTRAINT "BookingUsageSnapshot_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "BookingUsageSnapshot_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
