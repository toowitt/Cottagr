-- CreateTable
CREATE TABLE "Expense" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "propertyId" INTEGER NOT NULL,
    "createdByOwnershipId" INTEGER,
    "vendorName" TEXT,
    "category" TEXT,
    "memo" TEXT,
    "amountCents" INTEGER NOT NULL,
    "incurredOn" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "receiptUrl" TEXT,
    "decisionSummary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Expense_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Expense_createdByOwnershipId_fkey" FOREIGN KEY ("createdByOwnershipId") REFERENCES "Ownership" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExpenseApproval" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "expenseId" INTEGER NOT NULL,
    "ownershipId" INTEGER NOT NULL,
    "choice" TEXT NOT NULL DEFAULT 'abstain',
    "rationale" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExpenseApproval_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExpenseApproval_ownershipId_fkey" FOREIGN KEY ("ownershipId") REFERENCES "Ownership" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExpenseAllocation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "expenseId" INTEGER NOT NULL,
    "ownershipId" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExpenseAllocation_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExpenseAllocation_ownershipId_fkey" FOREIGN KEY ("ownershipId") REFERENCES "Ownership" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseApproval_expenseId_ownershipId_key" ON "ExpenseApproval"("expenseId", "ownershipId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseAllocation_expenseId_ownershipId_key" ON "ExpenseAllocation"("expenseId", "ownershipId");
