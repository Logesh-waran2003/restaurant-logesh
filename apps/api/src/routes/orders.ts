import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma, Prisma } from '@restaurant/db';
import { createOrderSchema, DEFAULT_GST_PERCENT } from '@restaurant/shared';
import { validate } from '../middleware/validate';
import { authenticate, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { io } from '../index';

const statusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled']),
});

const router = Router();

// ─── Create Order ───────────────────────────────────────────────────────────

router.post('/', authenticate, validate(createOrderSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableSessionId, items } = req.body;

    const session = await prisma.tableSession.findUnique({
      where: { id: tableSessionId },
      include: { table: true },
    });
    if (!session || session.status === 'CLOSED') throw new AppError('Invalid or closed table session', 400);

    const menuItemIds = items.map((i: any) => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
      include: { variants: true, addonGroups: { include: { addons: true } } },
    });
    const menuMap = new Map(menuItems.map((m) => [m.id, m]));

    let subtotal = new Prisma.Decimal(0);
    const orderItemsData = items.map((item: any) => {
      const menuItem = menuMap.get(item.menuItemId);
      if (!menuItem) throw new AppError(`Menu item ${item.menuItemId} not found`, 400);

      let unitPrice = menuItem.price;
      if (item.variantId) {
        const variant = menuItem.variants.find((v) => v.id === item.variantId);
        if (variant) unitPrice = unitPrice.add(variant.priceDelta);
      }

      let addonTotal = new Prisma.Decimal(0);
      const addonConnects: { addonId: string; price: Prisma.Decimal }[] = [];
      if (item.addonIds?.length) {
        for (const ag of menuItem.addonGroups) {
          for (const addon of ag.addons) {
            if (item.addonIds.includes(addon.id)) {
              addonTotal = addonTotal.add(addon.price);
              addonConnects.push({ addonId: addon.id, price: addon.price });
            }
          }
        }
      }

      const totalItemPrice = unitPrice.add(addonTotal).mul(item.quantity);
      subtotal = subtotal.add(totalItemPrice);

      return {
        menuItemId: item.menuItemId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        unitPrice: unitPrice.add(addonTotal),
        totalPrice: totalItemPrice,
        spiceLevel: item.spiceLevel,
        specialInstructions: item.specialInstructions,
        addons: { create: addonConnects },
      };
    });

    const gstAmount = subtotal.mul(DEFAULT_GST_PERCENT).div(100);
    const total = subtotal.add(gstAmount);

    const order = await prisma.order.create({
      data: {
        tableSessionId,
        restaurantId: req.user!.restaurantId,
        subtotal,
        gstAmount,
        total,
        items: { create: orderItemsData },
      },
      include: { items: { include: { menuItem: true, addons: true } } },
    });

    io.to('kitchen').to('admin').to(`table-${session.table.id}`).emit('orderPlaced', {
      orderId: order.id,
      tableId: session.table.id,
      tableNumber: session.table.number,
      items: order.items.map((i) => ({ name: i.menuItem.name, quantity: i.quantity })),
      createdAt: order.createdAt.toISOString(),
    });
    io.to('kitchen').emit('newOrderBeep', { orderId: order.id, tableNumber: session.table.number });

    res.status(201).json(order);
  } catch (e) { next(e); }
});

// ─── List Orders ────────────────────────────────────────────────────────────

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined;
    const tableSessionId = req.query.tableSessionId as string | undefined;
    const date = req.query.date as string | undefined;
    const where: any = { restaurantId: req.user!.restaurantId };
    if (status) where.status = status.toUpperCase();
    if (tableSessionId) where.tableSessionId = tableSessionId;
    if (date) {
      const d = new Date(date);
      where.createdAt = { gte: d, lt: new Date(d.getTime() + 86400000) };
    }
    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { menuItem: true } }, tableSession: { include: { table: true } } },
    });
    res.json(orders);
  } catch (e) { next(e); }
});

// ─── Get Order ──────────────────────────────────────────────────────────────

router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: { include: { menuItem: true, variant: true, addons: { include: { addon: true } } } },
        kots: true,
        payments: true,
        tableSession: { include: { table: true } },
      },
    });
    if (!order) throw new AppError('Order not found', 404);
    res.json(order);
  } catch (e) { next(e); }
});

// ─── Update Status ──────────────────────────────────────────────────────────

router.patch('/:id/status', authenticate, requireRole('owner', 'manager', 'chef', 'waiter'), validate(statusSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body as z.infer<typeof statusSchema>;
    const order: any = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: status.toUpperCase() as any },
      include: { items: { include: { menuItem: true } }, tableSession: { include: { table: true } } },
    });

    io.to('kitchen').to('admin').to(`table-${order.tableSession.table.id}`).emit('orderStatusChanged', {
      orderId: order.id,
      status: order.status,
      updatedBy: req.user!.userId,
    });

    // Create KOT when confirmed
    if (status.toUpperCase() === 'CONFIRMED') {
      const kot = await prisma.kOT.create({
        data: {
          orderId: order.id,
          department: 'KITCHEN',
          items: { connect: order.items.map((i: any) => ({ id: i.id })) },
        },
      });
      io.to('kitchen').emit('kotUpdate', {
        kotId: kot.id,
        orderId: order.id,
        department: 'KITCHEN',
        items: order.items.map((i: any) => ({ name: i.menuItem.name, quantity: i.quantity, status: i.status })),
      });
    }

    res.json(order);
  } catch (e) { next(e); }
});

export default router;
