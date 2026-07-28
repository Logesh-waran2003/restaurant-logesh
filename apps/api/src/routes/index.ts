import { Router } from 'express';
import authRouter from './auth';
import menuRouter from './menu';
import ordersRouter from './orders';
import tablesRouter from './tables';
import paymentsRouter from './payments';
import kdsRouter from './kds';
import adminRouter from './admin';

export const routes = Router();

routes.use('/api/auth', authRouter);
routes.use('/api/menu', menuRouter);
routes.use('/api/orders', ordersRouter);
routes.use('/api/tables', tablesRouter);
routes.use('/api/payments', paymentsRouter);
routes.use('/api/kds', kdsRouter);
routes.use('/api/admin', adminRouter);

// Health check
routes.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
