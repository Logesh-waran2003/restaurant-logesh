import { z } from 'zod';

export const createOrderSchema = z.object({
  tableSessionId: z.string().optional(),
  tableId: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  paymentMethod: z.enum(['UPI', 'CARD', 'CASH']).optional().default('CASH'),
  items: z.array(z.object({
    menuItemId: z.string(),
    variantId: z.string().optional(),
    quantity: z.number().int().positive(),
    spiceLevel: z.number().int().min(1).max(5).optional(),
    specialInstructions: z.string().optional(),
    instructions: z.string().optional(),
    addonIds: z.array(z.string()).optional(),
  })).min(1),
});

export const updateOrderStatusSchema = z.object({
  orderId: z.string(),
  status: z.enum(['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled']),
});

export const updateOrderItemStatusSchema = z.object({
  orderItemId: z.string(),
  status: z.enum(['pending', 'preparing', 'ready', 'served', 'cancelled']),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type UpdateOrderItemStatusInput = z.infer<typeof updateOrderItemStatusSchema>;
