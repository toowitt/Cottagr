-- Add preference flags to ownership records
ALTER TABLE "Ownership"
  ADD COLUMN "bookingApprover" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "expenseApprover" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "blackoutManager" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "autoSkipBookings" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "notifyOnBookings" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notifyOnExpenses" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "GuestInvite" (
    "id" SERIAL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "actionLink" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "propertyId" INTEGER,
    "invitedByOwnershipId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "GuestInvite"
  ADD CONSTRAINT "GuestInvite_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "GuestInvite_invitedByOwnershipId_fkey" FOREIGN KEY ("invitedByOwnershipId") REFERENCES "Ownership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
