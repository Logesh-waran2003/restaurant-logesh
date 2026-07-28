import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@restaurant/db';
import { authenticate, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { io } from '../index';

const router = Router();

// ─── Active KOTs by department ──────────────────────────────────────────────

router.get('/orders', authenticate, requireRole('owner', 'manager', 'chef'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const department = req.query.department as string | undefined;
    const where: any = { status: { not: 'READY' } };
    if (department) where.department = department.toUpperCase();

    const kots = await prisma.kOT.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        items: { include: { menuItem: true } },
        order: { include: { tableSession: { include: { table: true } } } },
      },
    });
    res.json(kots);
  } catch (e) { next(e); }
});

// ─── Update KOT Status ──────────────────────────────────────────────────────

router.patch('/kot/:id/status', authenticate, requireRole('owner', 'manager', 'chef'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    if (!status) throw new AppError('status is required', 400);

    const kot: any = await prisma.kOT.update({
      where: { id: req.params.id },
      data: { status: status.toUpperCase() },
      include: {
        items: { include: { menuItem: true } },
        order: { include: { kots: true, tableSession: { include: { table: true } } } },
      },
    });

    io.to('kitchen').to('admin').emit('kotUpdate', {
      kotId: kot.id,
      orderId: kot.orderId,
      department: kot.department,
      items: kot.items.map((i: any) => ({ name: i.menuItem.name, quantity: i.quantity, status: i.status })),
    });

    // If all KOTs for this order are READY, notify
    if (status.toUpperCase() === 'READY') {
      const allReady = kot.order.kots.every((k: any) => k.id === kot.id ? true : k.status === 'READY');
      if (allReady) {
        const tableId = kot.order.tableSession.table.id;
        io.to('admin').to(`table-${tableId}`).emit('notification', {
          id: kot.id,
          title: 'Order Ready',
          message: `Order #${kot.order.orderNumber} is ready to serve`,
          type: 'success',
        });
        io.to('admin').to(`table-${tableId}`).emit('orderStatusChanged', {
          orderId: kot.orderId,
          status: 'READY',
          updatedBy: req.user!.userId,
        });
        await prisma.order.update({ where: { id: kot.orderId }, data: { status: 'READY' } });
      }
    }

    res.json(kot);
  } catch (e) { next(e); }
});

export default router;
