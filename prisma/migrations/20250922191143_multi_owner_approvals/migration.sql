/*
  Warnings:

  - The primary key for the `Booking` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `end` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `start` on the `Booking` table. All the data in the column will be lost.
  - You are about to alter the column `id` on the `Booking` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `propertyId` on the `Booking` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `Property` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `Property` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - Added the required column `endDate` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cleaningFee` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nightlyRate` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Property` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Owner" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Ownership" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "propertyId" INTEGER NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "shareBps" INTEGER NOT NULL DEFAULT 0,
    "votingPower" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ownership_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ownership_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BookingVote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bookingId" INTEGER NOT NULL,
    "ownershipId" INTEGER NOT NULL,
    "choice" TEXT NOT NULL DEFAULT 'abstain',
    "rationale" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" INTEGER,
    CONSTRAINT "BookingVote_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BookingVote_ownershipId_fkey" FOREIGN KEY ("ownershipId") REFERENCES "Ownership" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BookingVote_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SeasonPrice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "propertyId" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "nightlyRate" INTEGER NOT NULL,
    CONSTRAINT "SeasonPrice_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Blackout" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "propertyId" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "reason" TEXT,
    CONSTRAINT "Blackout_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "propertyId" INTEGER NOT NULL,
    "createdByOwnershipId" INTEGER,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "decisionSummary" TEXT,
    "requestNotes" TEXT,
    "totalAmount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_createdByOwnershipId_fkey" FOREIGN KEY ("createdByOwnershipId") REFERENCES "Ownership" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("createdAt", "id", "propertyId", "status") SELECT "createdAt", "id", "propertyId", "status" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE TABLE "new_Property" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Property" ("createdAt", "id", "name") SELECT "createdAt", "id", "name" FROM "Property";
DROP TABLE "Property";
ALTER TABLE "new_Property" RENAME TO "Property";
CREATE UNIQUE INDEX "Property_slug_key" ON "Property"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Owner_email_key" ON "Owner"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Ownership_propertyId_ownerId_key" ON "Ownership"("propertyId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingVote_bookingId_ownershipId_key" ON "BookingVote"("bookingId", "ownershipId");
