import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { authenticate, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { io } from '../index';
import { randomUUID } from 'crypto';

const router = Router();

// ─── Item-grouped KDS endpoint ──────────────────────────────────────────────

router.get('/orders', authenticate, requireRole('owner', 'manager', 'chef'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const department = req.query.department as string | undefined;

    const orders = await prisma.order.findMany({
      where: {
        status: { in: ['PLACED', 'CONFIRMED', 'PREPARING', 'READY'] },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        items: {
          include: { menuItem: { include: { category: true } } },
          where: department
            ? { menuItem: { category: { name: { contains: department, mode: 'insensitive' } } } }
            : undefined,
        },
        tableSession: { include: { table: true } },
      },
    });

    // Flatten all order items with their context
    const allItems: {
      orderItemId: string;
      menuItemName: string;
      quantity: number;
      status: string;
      specialInstructions: string | null;
      tableNumber: number;
      orderId: string;
      orderCreatedAt: Date;
      isParcel: boolean;
      customerName: string | null;
      department: string;
    }[] = [];

    for (const order of orders) {
      const tableNumber = order.tableSession?.table?.number ?? 0;
      const isParcel = order.orderType === 'PARCEL' || order.orderType === 'DELIVERY';

      for (const item of order.items) {
        // Skip served/cancelled items
        if (item.status === 'SERVED' || item.status === 'CANCELLED') continue;

        allItems.push({
          orderItemId: item.id,
          menuItemName: item.menuItem.name,
          quantity: item.quantity,
          status: item.status,
          specialInstructions: item.specialInstructions,
          tableNumber,
          orderId: order.id,
          orderCreatedAt: order.createdAt,
          isParcel,
          customerName: order.customerName,
          department: (item.menuItem.category as any)?.name ?? 'Kitchen',
        });
      }
    }

    // Group by menuItem name
    const grouped = new Map<string, typeof allItems>();
    for (const item of allItems) {
      const key = item.menuItemName;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(item);
    }

    // Build response
    const result = Array.from(grouped.entries()).map(([itemName, items]) => {
      // Status mapping: all PENDING → NEW, any PREPARING → PREPARING, all READY → READY
      const statuses = items.map((i) => i.status);
      let groupStatus: 'NEW' | 'PREPARING' | 'READY';
      if (statuses.every((s) => s === 'READY')) {
        groupStatus = 'READY';
      } else if (statuses.some((s) => s === 'PREPARING')) {
        groupStatus = 'PREPARING';
      } else {
        groupStatus = 'NEW';
      }

      // Group by table + order
      const tableMap = new Map<string, {
        tableNumber: number;
        quantity: number;
        orderId: string;
        orderItemIds: string[];
        isParcel: boolean;
        customerName: string | null;
      }>();

      for (const item of items) {
        const key = `${item.orderId}-${item.tableNumber}`;
        if (!tableMap.has(key)) {
          tableMap.set(key, {
            tableNumber: item.tableNumber,
            quantity: 0,
            orderId: item.orderId,
            orderItemIds: [],
            isParcel: item.isParcel,
            customerName: item.customerName,
          });
        }
        const entry = tableMap.get(key)!;
        entry.quantity += item.quantity;
        entry.orderItemIds.push(item.orderItemId);
      }

      const tables = Array.from(tableMap.values()).map((t) => {
        const base: any = {
          tableNumber: t.tableNumber,
          quantity: t.quantity,
          orderId: t.orderId,
          orderItemIds: t.orderItemIds,
        };
        if (t.isParcel) {
          base.isParcel = true;
          if (t.customerName) base.customerName = t.customerName;
        }
        return base;
      });

      // Collect unique special instructions
      const specialInstructions = [
        ...new Set(
          items
            .map((i) => i.specialInstructions)
            .filter((s): s is string => !!s)
        ),
      ];

      // Oldest order time
      const oldestOrderTime = items.reduce(
        (oldest, item) => (item.orderCreatedAt < oldest ? item.orderCreatedAt : oldest),
        items[0].orderCreatedAt
      );

      return {
        id: randomUUID(),
        itemName,
        totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
        status: groupStatus,
        tables,
        oldestOrderTime: oldestOrderTime.toISOString(),
        specialInstructions,
      };
    });

    // Sort by oldest time
    result.sort((a, b) => new Date(a.oldestOrderTime).getTime() - new Date(b.oldestOrderTime).getTime());

    res.json(result);
  } catch (e) { next(e); }
});

// ─── Item-grouped status update ─────────────────────────────────────────────

router.patch('/items/status', authenticate, requireRole('owner', 'manager', 'chef'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { itemName, status } = req.body as { itemName?: string; status?: string };
    if (!itemName || !status) throw new AppError('itemName and status are required', 400);

    const validStatuses = ['PREPARING', 'READY'];
    if (!validStatuses.includes(status.toUpperCase())) {
      throw new AppError(`Invalid status: ${status}. Must be PREPARING or READY`, 400);
    }

    const targetStatus = status.toUpperCase() as 'PREPARING' | 'READY';
    // Determine which items to update based on previous status
    const previousStatus = targetStatus === 'PREPARING' ? 'PENDING' : 'PREPARING';

    // Find all order items matching this menu item name in the previous status
    const itemsToUpdate = await prisma.orderItem.findMany({
      where: {
        menuItem: { name: itemName },
        status: previousStatus,
        order: { status: { in: ['PLACED', 'CONFIRMED', 'PREPARING', 'READY'] } },
      },
      include: { order: true },
    });

    if (itemsToUpdate.length === 0) {
      res.json({ updated: 0 });
      return;
    }

    // Update all matching items
    await prisma.orderItem.updateMany({
      where: { id: { in: itemsToUpdate.map((i) => i.id) } },
      data: { status: targetStatus },
    });

    // Update parent order statuses
    const affectedOrderIds = [...new Set(itemsToUpdate.map((i) => i.orderId))];

    for (const orderId of affectedOrderIds) {
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId },
      });

      const activeItems = orderItems.filter((i) => i.status !== 'CANCELLED');
      let newOrderStatus: string | null = null;

      if (activeItems.every((i) => i.status === 'READY' || i.status === 'SERVED')) {
        newOrderStatus = 'READY';
      } else if (activeItems.some((i) => i.status === 'PREPARING')) {
        newOrderStatus = 'PREPARING';
      } else if (activeItems.every((i) => i.status === 'PENDING')) {
        // Leave as-is (PLACED/CONFIRMED)
      }

      if (newOrderStatus) {
        const order = await prisma.order.update({
          where: { id: orderId },
          data: { status: newOrderStatus as any },
          include: { tableSession: { include: { table: true } } },
        });

        const tableNumber = order.tableSession?.table?.number ?? 0;

        (io as any).to('kitchen').to('admin').emit('orderStatusChanged', {
          orderId: order.id,
          status: order.status,
          tableNumber,
        });

        // If READY, notify customer
        if (newOrderStatus === 'READY') {
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
      }
    }

    // Emit KDS refresh event
    (io as any).to('kitchen').emit('kds:refresh');

    res.json({ updated: itemsToUpdate.length, itemName, status: targetStatus });
  } catch (e) { next(e); }
});

// ─── Legacy: Update single order status (backward compat) ───────────────────

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

    (io as any).to('kitchen').to('admin').emit('orderStatusChanged', {
      orderId: order.id,
      status: order.status,
      tableNumber,
    });

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
