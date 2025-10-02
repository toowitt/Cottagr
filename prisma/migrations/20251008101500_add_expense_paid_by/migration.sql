-- Add paidByOwnershipId to expenses for tracking who covered the bill
ALTER TABLE "Expense" ADD COLUMN "paidByOwnershipId" INTEGER REFERENCES "Ownership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Optional helper index for querying paid expenses
CREATE INDEX IF NOT EXISTS "Expense_paidByOwnership_idx" ON "Expense"("paidByOwnershipId");
