import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@restaurant/db';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// ─── Dashboard (today's stats) ──────────────────────────────────────────────

router.get('/dashboard', authenticate, requireRole('owner', 'manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86400000);

    const orders = await prisma.order.findMany({
      where: { restaurantId: req.user!.restaurantId, createdAt: { gte: today, lt: tomorrow } },
      select: { total: true, status: true },
    });

    const totalOrders = orders.length;
    const revenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const avgOrderValue = totalOrders > 0 ? revenue / totalOrders : 0;

    res.json({ totalOrders, revenue: Math.round(revenue * 100) / 100, avgOrderValue: Math.round(avgOrderValue * 100) / 100 });
  } catch (e) { next(e); }
});

// ─── Reports (date range) ───────────────────────────────────────────────────

router.get('/reports', authenticate, requireRole('owner', 'manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to } = req.query;
    const start = from ? new Date(from as string) : new Date(Date.now() - 7 * 86400000);
    const end = to ? new Date(to as string) : new Date();
    end.setHours(23, 59, 59, 999);

    const orders = await prisma.order.findMany({
      where: { restaurantId: req.user!.restaurantId, createdAt: { gte: start, lte: end } },
      select: { total: true, status: true, createdAt: true },
    });

    const totalOrders = orders.length;
    const revenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const avgOrderValue = totalOrders > 0 ? revenue / totalOrders : 0;

    res.json({ totalOrders, revenue: Math.round(revenue * 100) / 100, avgOrderValue: Math.round(avgOrderValue * 100) / 100, from: start, to: end });
  } catch (e) { next(e); }
});

// ─── Top Items ──────────────────────────────────────────────────────────────

router.get('/top-items', authenticate, requireRole('owner', 'manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = Number(req.query.days) || 7;
    const since = new Date(Date.now() - days * 86400000);

    const items = await prisma.orderItem.groupBy({
      by: ['menuItemId'],
      _sum: { quantity: true },
      where: { createdAt: { gte: since } },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    });

    const menuItemIds = items.map((i) => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({ where: { id: { in: menuItemIds } }, select: { id: true, name: true } });
    const nameMap = new Map(menuItems.map((m) => [m.id, m.name]));

    const result = items.map((i) => ({ menuItemId: i.menuItemId, name: nameMap.get(i.menuItemId) ?? 'Unknown', totalQuantity: i._sum.quantity }));
    res.json(result);
  } catch (e) { next(e); }
});

export default router;
