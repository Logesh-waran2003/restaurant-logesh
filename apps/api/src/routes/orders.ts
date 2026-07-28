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

router.post('/', validate(createOrderSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderType = 'DINE_IN', tableSessionId, tableId, items, paymentMethod, customerName, customerPhone, packingCharge = 0, scheduledAt } = req.body;

    let session: any = null;
    let restaurantId: string;
    let tokenNumber: string | null = null;

    if (orderType === 'DINE_IN') {
      // ── Dine-in: find or create table session (existing logic) ──
      if (tableSessionId) {
        session = await prisma.tableSession.findUnique({
          where: { id: tableSessionId },
          include: { table: true },
        });
      } else if (tableId) {
        const tableNumber = parseInt(tableId.replace('table-', ''), 10);
        const table = await prisma.table.findFirst({
          where: { number: tableNumber },
        });
        if (!table) throw new AppError('Table not found', 404);

        session = await prisma.tableSession.findFirst({
          where: { tableId: table.id, status: { not: 'CLOSED' } },
          include: { table: true },
        });
        if (!session) {
          session = await prisma.tableSession.create({
            data: { tableId: table.id, status: 'OCCUPIED' },
            include: { table: true },
          });
        }
      }
      if (!session) throw new AppError('Table session required for dine-in orders', 400);
      restaurantId = session.table.restaurantId;
    } else {
      // ── Parcel / Delivery: no table needed ──
      // Get restaurantId from first menu item
      const firstMenuItem = await prisma.menuItem.findUnique({
        where: { id: items[0].menuItemId },
        include: { category: true },
      });
      if (!firstMenuItem) throw new AppError('Menu item not found', 400);
      restaurantId = firstMenuItem.category.restaurantId;

      // Generate token number for parcel: P-001, P-002 etc.
      if (orderType === 'PARCEL') {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const parcelCount = await prisma.order.count({
          where: { orderType: 'PARCEL', createdAt: { gte: todayStart }, restaurantId },
        });
        tokenNumber = `P-${String(parcelCount + 1).padStart(3, '0')}`;
      }
    }

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
        specialInstructions: item.specialInstructions || item.instructions,
        addons: { create: addonConnects },
      };
    });

    const packingChargeDecimal = new Prisma.Decimal(packingCharge);
    const gstAmount = subtotal.mul(DEFAULT_GST_PERCENT).div(100);
    const total = subtotal.add(gstAmount).add(packingChargeDecimal);

    const order = await prisma.order.create({
      data: {
        tableSessionId: session?.id || null,
        restaurantId,
        orderType: orderType as any,
        tokenNumber,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        packingCharge: packingChargeDecimal,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        paymentMethod: paymentMethod || 'CASH',
        notes: customerName ? `${customerName} | ${customerPhone || ''}` : undefined,
        subtotal,
        gstAmount,
        total,
        items: { create: orderItemsData },
      },
      include: { items: { include: { menuItem: true, addons: true } } },
    });

    // ── Socket emissions ──
    if (orderType === 'DINE_IN' && session) {
      io.to('kitchen').to('admin').to(`table-${session.table.id}`).emit('orderPlaced', {
        orderId: order.id,
        orderType,
        tableId: session.table.id,
        tableNumber: session.table.number,
        items: (order as any).items.map((i: any) => ({ name: i.menuItem.name, quantity: i.quantity })),
        createdAt: order.createdAt.toISOString(),
      });
      io.to('kitchen').emit('newOrderBeep', { orderId: order.id, tableNumber: session.table.number });
    } else {
      // Parcel / Delivery
      io.to('kitchen').to('admin').emit('orderPlaced', {
        orderId: order.id,
        orderType,
        tokenNumber,
        customerName: customerName || null,
        items: (order as any).items.map((i: any) => ({ name: i.menuItem.name, quantity: i.quantity })),
        createdAt: order.createdAt.toISOString(),
      });
      io.to('kitchen').emit('newOrderBeep', { orderId: order.id, tokenNumber });
    }

    res.status(201).json({ ...order, orderType, tokenNumber, customerName: customerName || null });
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

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
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

    const statusPayload = {
      orderId: order.id,
      status: order.status,
      updatedBy: req.user!.userId,
    };

    if (order.tableSession?.table) {
      io.to('kitchen').to('admin').to(`table-${order.tableSession.table.id}`).emit('orderStatusChanged', statusPayload);
    } else {
      io.to('kitchen').to('admin').emit('orderStatusChanged', { ...statusPayload, tokenNumber: order.tokenNumber });
    }

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
