import { Router, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../db';
import { createTableSchema, mergeTablesSchema, createSessionSchema } from '../shared';
import { validate } from '../middleware/validate';
import { authenticate, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/error';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tables = await prisma.table.findMany({
      where: { restaurantId: req.user!.restaurantId, isActive: true },
      include: { sessions: { where: { status: { not: 'CLOSED' } }, take: 1, orderBy: { startedAt: 'desc' } } },
      orderBy: { number: 'asc' },
    });
    res.json(tables);
  } catch (e) { next(e); }
});

router.post('/', authenticate, requireRole('owner', 'manager'), validate(createTableSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { number, name, capacity, section } = req.body;
    const table = await prisma.table.create({
      data: { number, name, capacity, section, qrCode: randomUUID(), restaurantId: req.user!.restaurantId },
    });
    res.status(201).json(table);
  } catch (e) { next(e); }
});

router.put('/:id', authenticate, requireRole('owner', 'manager'), validate(createTableSchema.partial()), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { number, name, capacity, section } = req.body;
    const table = await prisma.table.update({
      where: { id: req.params.id },
      data: { ...(number !== undefined && { number }), ...(name !== undefined && { name }), ...(capacity !== undefined && { capacity }), ...(section !== undefined && { section }) },
    });
    res.json(table);
  } catch (e) { next(e); }
});

router.delete('/:id', authenticate, requireRole('owner', 'manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.table.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.status(204).end();
  } catch (e) { next(e); }
});

// ─── QR Session lookup ──────────────────────────────────────────────────────

router.get('/:qrCode/session', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const table = await prisma.table.findUnique({
      where: { qrCode: req.params.qrCode },
      include: { sessions: { where: { status: { not: 'CLOSED' } }, take: 1, orderBy: { startedAt: 'desc' } } },
    });
    if (!table) throw new AppError('Table not found', 404);
    res.json({ table, activeSession: table.sessions[0] ?? null });
  } catch (e) { next(e); }
});

// ─── Open Session ───────────────────────────────────────────────────────────

router.post('/:id/session', authenticate, validate(createSessionSchema.omit({ tableId: true })), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tableId = req.params.id;
    const existing = await prisma.tableSession.findFirst({ where: { tableId, status: { not: 'CLOSED' } } });
    if (existing) throw new AppError('Table already has an active session', 400);
    const session = await prisma.tableSession.create({ data: { tableId, ...req.body } });
    res.status(201).json(session);
  } catch (e) { next(e); }
});

// ─── Merge Tables ───────────────────────────────────────────────────────────

router.patch('/:id/merge', authenticate, requireRole('owner', 'manager', 'waiter'), validate(mergeTablesSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableIds, primaryTableId } = req.body;
    await prisma.table.updateMany({
      where: { id: { in: tableIds.filter((id: string) => id !== primaryTableId) } },
      data: { isMerged: true, mergedWithId: primaryTableId },
    });
    res.json({ message: 'Tables merged', primaryTableId });
  } catch (e) { next(e); }
});

export default router;
