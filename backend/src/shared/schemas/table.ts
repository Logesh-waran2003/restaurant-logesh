import { z } from 'zod';

export const createTableSchema = z.object({
  number: z.number().int().positive(),
  name: z.string().min(1),
  capacity: z.number().int().positive(),
  section: z.string().min(1),
});

export const mergeTablesSchema = z.object({
  tableIds: z.array(z.string()).min(2),
  primaryTableId: z.string(),
});

export const createSessionSchema = z.object({
  tableId: z.string(),
  guestCount: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

export type CreateTableInput = z.infer<typeof createTableSchema>;
export type MergeTablesInput = z.infer<typeof mergeTablesSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
