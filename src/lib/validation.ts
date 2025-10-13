
import { z } from 'zod';

const isoDate = (label: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must be in YYYY-MM-DD format`);

export const BookingParticipantInputSchema = z.object({
  role: z.enum(['OWNER', 'FAMILY', 'GUEST', 'CARETAKER', 'SERVICE'], {
    message: 'Invalid participant role',
  }),
  userId: z.string().uuid().optional(),
  ownershipId: z.number().int().positive().optional(),
  displayName: z.string().min(1, 'Participant name is required'),
  email: z.string().email('Email must be valid').optional(),
  nights: z.number().int().min(0).optional(),
});

export const BookingCreateSchema = z
  .object({
    propertyId: z.number().int().positive(),
    createdByOwnershipId: z.number().int().positive().optional(),
    requestorOwnershipId: z.number().int().positive().optional(),
    requestorUserId: z.string().uuid().optional(),
    startDate: isoDate('Start date'),
    endDate: isoDate('End date'),
    guestName: z.string().min(1, 'Guest name is required').optional(),
    guestEmail: z.string().email('Guest email must be valid').optional(),
    notes: z.string().max(500).optional(),
    participants: z.array(BookingParticipantInputSchema).min(1).optional(),
  })
  .refine((data) => {
    if (data.participants && data.participants.length > 0) {
      return true;
    }
    return Boolean(data.guestName);
  }, {
    message: 'At least one participant is required',
    path: ['participants'],
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
export type BookingParticipantInput = z.infer<typeof BookingParticipantInputSchema>;
export type BookingVoteInput = z.infer<typeof BookingVoteSchema>;
export type BookingListQuery = z.infer<typeof BookingListQuerySchema>;
export type AvailabilityQuery = z.infer<typeof AvailabilityQuerySchema>;
export type ExpenseCreate = z.infer<typeof ExpenseCreateSchema>;
export type ExpenseUpdate = z.infer<typeof ExpenseUpdateSchema>;
export type ExpenseApprovalInput = z.infer<typeof ExpenseApprovalSchema>;
