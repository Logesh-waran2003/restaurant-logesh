import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@restaurant/db';
import { authenticate, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { io } from '../index';

const router = Router();

// ─── Active orders for kitchen display ──────────────────────────────────────

router.get('/orders', authenticate, requireRole('owner', 'manager', 'chef'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ['PLACED', 'CONFIRMED', 'PREPARING', 'READY'] },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        items: { include: { menuItem: true } },
        tableSession: { include: { table: true } },
      },
    });

    // Map to a format the KDS frontend expects
    const kdsOrders = orders.map((order) => ({
      id: order.id,
      orderNumber: String(order.orderNumber),
      status: order.status === 'PLACED' || order.status === 'CONFIRMED' ? 'NEW' : order.status,
      tableNumber: order.tableSession?.table?.number ?? 0,
      tableId: String(order.tableSession?.table?.number ?? 0),
      tableName: order.tableSession?.table?.name ?? '',
      notes: order.notes,
      items: order.items.map((item) => ({
        id: item.id,
        name: item.menuItem.name,
        quantity: item.quantity,
        spiceLevel: item.spiceLevel,
        specialInstructions: item.specialInstructions,
        status: item.status,
      })),
      createdAt: order.createdAt.toISOString(),
    }));

    res.json(kdsOrders);
  } catch (e) { next(e); }
});

// ─── Update order status from KDS ───────────────────────────────────────────

router.patch('/orders/:id/status', authenticate, requireRole('owner', 'manager', 'chef'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    if (!status) throw new AppError('status is required', 400);

    const validStatuses = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED'];
    if (!validStatuses.includes(status.toUpperCase())) {
      throw new AppError(`Invalid status: ${status}`, 400);
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: status.toUpperCase() as any },
      include: {
        items: { include: { menuItem: true } },
        tableSession: { include: { table: true } },
      },
    });

    const tableNumber = order.tableSession?.table?.number ?? 0;

    // Emit status change to all relevant rooms
    (io as any).to('kitchen').to('admin').emit('orderStatusChanged', {
      orderId: order.id,
      status: order.status,
      tableNumber,
    });

    // If READY, notify customer
    if (status.toUpperCase() === 'READY') {
      const tableId = order.tableSession?.table?.id;
      if (tableId) {
        (io as any).to(`table-${tableId}`).emit('order:status', {
          orderId: order.id,
          status: 'READY',
        });
        (io as any).to(`table-${tableId}`).emit('notification', {
          id: order.id,
          title: 'Order Ready!',
          message: `Order #${order.orderNumber} is ready for pickup`,
          type: 'success',
        });
      }
    }

    res.json({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      tableNumber,
      items: order.items.map((item) => ({
        name: item.menuItem.name,
        quantity: item.quantity,
      })),
    });
  } catch (e) { next(e); }
});

export default router;
