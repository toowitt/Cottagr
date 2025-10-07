
import { z } from 'zod';

const isoDate = (label: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must be in YYYY-MM-DD format`);

export const BookingCreateSchema = z.object({
  propertyId: z.number().int().positive(),
  createdByOwnershipId: z.number().int().positive(),
  startDate: isoDate('Start date'),
  endDate: isoDate('End date'),
  guestName: z.string().min(1, 'Guest name is required'),
  guestEmail: z.string().email('Guest email must be valid'),
  notes: z.string().max(500).optional(),
});

export const BookingVoteSchema = z.object({
  bookingId: z.number().int().positive(),
  ownershipId: z.number().int().positive(),
  choice: z.enum(['approve', 'reject', 'abstain']),
  rationale: z.string().max(500).optional(),
});

export const ExpenseCreateSchema = z.object({
  propertyId: z.number().int().positive(),
  createdByOwnershipId: z.number().int().positive(),
  vendorName: z.string().min(1).max(120).optional(),
  category: z.string().min(1).max(60).optional(),
  memo: z.string().max(500).optional(),
  amountCents: z.number().int().min(1, 'Amount must be greater than zero'),
  incurredOn: isoDate('Incurred on'),
  paidByOwnershipId: z.number().int().positive().optional(),
  receiptUrl: z
    .string()
    .max(500)
    .optional()
    .refine(
      (value) =>
        !value ||
        value.startsWith('/uploads/') ||
        value.startsWith('http://') ||
        value.startsWith('https://'),
      'Receipt link must be an http(s) URL or an uploaded file',
    ),
});

export const ExpenseUpdateSchema = ExpenseCreateSchema.extend({
  expenseId: z.number().int().positive(),
  createdByOwnershipId: z.number().int().positive().nullable(),
});

export const ExpenseApprovalSchema = z.object({
  expenseId: z.number().int().positive(),
  ownershipId: z.number().int().positive(),
  choice: z.enum(['approve', 'reject', 'abstain']),
  rationale: z.string().max(500).optional(),
});

export const BookingListQuerySchema = z.object({
  propertyId: z.number().int().positive().optional(),
});

export const AvailabilityQuerySchema = z.object({
  propertyId: z.number().int().positive(),
  from: isoDate('From date').optional(),
  to: isoDate('To date').optional(),
});

export type BookingCreate = z.infer<typeof BookingCreateSchema>;
export type BookingVoteInput = z.infer<typeof BookingVoteSchema>;
export type BookingListQuery = z.infer<typeof BookingListQuerySchema>;
export type AvailabilityQuery = z.infer<typeof AvailabilityQuerySchema>;
export type ExpenseCreate = z.infer<typeof ExpenseCreateSchema>;
export type ExpenseUpdate = z.infer<typeof ExpenseUpdateSchema>;
export type ExpenseApprovalInput = z.infer<typeof ExpenseApprovalSchema>;
