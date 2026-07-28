import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@restaurant/db';
import { createCategorySchema, updateCategorySchema, createMenuItemSchema, updateMenuItemSchema, toggleAvailabilitySchema } from '@restaurant/shared';
import { validate } from '../middleware/validate';
import { authenticate, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { io } from '../index';

const router = Router();

// ─── Public menu ────────────────────────────────────────────────────────────

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        menuItems: {
          where: { isAvailable: true },
          include: {
            variants: { where: { isActive: true } },
            addonGroups: { include: { addons: { where: { isActive: true } } } },
          },
        },
      },
    });
    res.json(categories);
  } catch (e) { next(e); }
});

// ─── Categories (admin) ─────────────────────────────────────────────────────

router.post('/categories', authenticate, requireRole('owner', 'manager'), validate(createCategorySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, nameTamil, sortOrder } = req.body;
    const cat = await prisma.category.create({ data: { name, nameTamil, sortOrder, restaurantId: req.user!.restaurantId } });
    res.status(201).json(cat);
  } catch (e) { next(e); }
});

router.put('/categories/:id', authenticate, requireRole('owner', 'manager'), validate(updateCategorySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, nameTamil, sortOrder } = req.body;
    const cat = await prisma.category.update({ where: { id: req.params.id }, data: { name, nameTamil, sortOrder } });
    res.json(cat);
  } catch (e) { next(e); }
});

router.delete('/categories/:id', authenticate, requireRole('owner', 'manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.category.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.status(204).end();
  } catch (e) { next(e); }
});

// ─── Menu Items (admin) ─────────────────────────────────────────────────────

router.post('/items', authenticate, requireRole('owner', 'manager'), validate(createMenuItemSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { variants, addonGroups, name, nameTamil, price, categoryId, isVeg, spiceLevel, prepTimeMinutes } = req.body;
    const item = await prisma.menuItem.create({
      data: {
        name, nameTamil, price, categoryId, isVeg, spiceLevel, prepTimeMinutes,
        restaurantId: req.user!.restaurantId,
        variants: variants ? { create: variants } : undefined,
        addonGroups: addonGroups
          ? { create: addonGroups.map((g: any) => ({ name: g.name, addons: { create: g.addons } })) }
          : undefined,
      },
      include: { variants: true, addonGroups: { include: { addons: true } } },
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/items/:id', authenticate, requireRole('owner', 'manager'), validate(updateMenuItemSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { variants: _v, addonGroups: _a, ...data } = req.body;
    const item = await prisma.menuItem.update({ where: { id: req.params.id }, data: data as any });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/items/:id', authenticate, requireRole('owner', 'manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.menuItem.update({ where: { id: req.params.id }, data: { isAvailable: false } });
    res.status(204).end();
  } catch (e) { next(e); }
});

// ─── Toggle Availability ────────────────────────────────────────────────────

router.patch('/items/availability', authenticate, requireRole('owner', 'manager', 'chef'), validate(toggleAvailabilitySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { menuItemId, available } = req.body;
    const item = await prisma.menuItem.update({ where: { id: menuItemId }, data: { isAvailable: available } });
    if (!item) throw new AppError('Menu item not found', 404);
    io.emit('menuItemAvailability', { menuItemId, available });
    res.json(item);
  } catch (e) { next(e); }
});

export default router;
