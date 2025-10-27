-- Add dueDate column to Expense for optional payment deadline tracking
ALTER TABLE "Expense"
ADD COLUMN "dueDate" TIMESTAMP(3);
