import { z } from 'zod';

export const initiatePaymentSchema = z.object({
  orderId: z.string(),
  method: z.enum(['cash', 'card', 'upi', 'razorpay']),
});

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  signature: z.string(),
});

export const initiateRefundSchema = z.object({
  paymentId: z.string(),
  amount: z.number().positive().optional(),
  reason: z.string().optional(),
});

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type InitiateRefundInput = z.infer<typeof initiateRefundSchema>;
