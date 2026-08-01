import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { loginSchema, registerSchema, type TokenPayload } from '../shared';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/error';
import { authenticate } from '../middleware/auth';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'dev-refresh-secret';
const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';

function signTokens(payload: TokenPayload) {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TTL });
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TTL });
  return { accessToken, refreshToken };
}

router.post('/register', validate(registerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, phone, email, password, role } = req.body;
    const existing = await prisma.user.findFirst({ where: { OR: [{ phone }, ...(email ? [{ email }] : [])] } });
    if (existing) throw new AppError('User with this phone/email already exists', 409);

    // ponytail: first user becomes OWNER and auto-creates restaurant; subsequent users need an existing restaurantId
    const restaurant = await prisma.restaurant.findFirst();
    if (!restaurant) throw new AppError('No restaurant configured yet', 400);

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, phone, email, password: hashed, role: role.toUpperCase() as any, restaurantId: restaurant.id },
    });

    const payload: TokenPayload = { userId: user.id, role: role, restaurantId: restaurant.id };
    res.status(201).json({ user: { id: user.id, name: user.name, role: user.role }, ...signTokens(payload) });
  } catch (e) { next(e); }
});

router.post('/login', validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, password } = req.body;
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new AppError('Invalid credentials', 401);
    }

    const payload: TokenPayload = { userId: user.id, role: user.role.toLowerCase() as any, restaurantId: user.restaurantId };
    res.json({ user: { id: user.id, name: user.name, role: user.role }, ...signTokens(payload) });
  } catch (e) { next(e); }
});

router.post('/refresh-token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError('Refresh token required', 400);
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as TokenPayload;
    const payload: TokenPayload = { userId: decoded.userId, role: decoded.role, restaurantId: decoded.restaurantId };
    res.json(signTokens(payload));
  } catch {
    next(new AppError('Invalid refresh token', 401));
  }
});

router.post('/logout', authenticate, (_req: Request, res: Response) => {
  // ponytail: stateless JWT — client discards tokens. Add token blocklist via Redis if revocation needed.
  res.json({ message: 'Logged out' });
});

export default router;
