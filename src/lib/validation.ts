
import { z } from 'zod';

export const BookingCreateSchema = z.object({
  propertyId: z.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  guestName: z.string().optional(),
  guestEmail: z.string().email().optional(),
});

export const AvailabilityQuerySchema = z.object({
  propertyId: z.number().int().positive(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'From date must be in YYYY-MM-DD format'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'To date must be in YYYY-MM-DD format'),
});

export type BookingCreate = z.infer<typeof BookingCreateSchema>;
export type AvailabilityQuery = z.infer<typeof AvailabilityQuerySchema>;
