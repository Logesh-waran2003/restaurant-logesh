import { z } from 'zod';

export const loginSchema = z.object({
  phone: z.string().min(10),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  password: z.string().min(6),
  role: z.enum(['owner', 'manager', 'chef', 'waiter', 'cashier']),
});

export const tokenPayloadSchema = z.object({
  userId: z.string(),
  role: z.enum(['owner', 'manager', 'chef', 'waiter', 'cashier']),
  restaurantId: z.string(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type TokenPayload = z.infer<typeof tokenPayloadSchema>;
