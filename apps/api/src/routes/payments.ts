import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '@restaurant/db';
import { initiatePaymentSchema, verifyPaymentSchema, initiateRefundSchema } from '@restaurant/shared';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/error';

const router = Router();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const isTestMode = RAZORPAY_KEY_ID.startsWith('rzp_test');

function getRazorpay() {
  const Razorpay = require('razorpay');
  return new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
}

// ─── Initiate ───────────────────────────────────────────────────────────────

router.post('/initiate', authenticate, validate(initiatePaymentSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId, method } = req.body;
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError('Order not found', 404);

    if (method === 'cash') {
      const payment = await prisma.payment.create({
        data: { orderId, method: 'CASH', amount: order.total, status: 'SUCCESS' },
      });
      await prisma.order.update({ where: { id: orderId }, data: { paymentStatus: 'PAID', paymentMethod: 'CASH' } });
      return res.json({ payment, message: 'Cash payment recorded' });
    }

    if (isTestMode) {
      const simOrderId = `order_sim_${Date.now()}`;
      const payment = await prisma.payment.create({
        data: { orderId, method: method.toUpperCase() as any, amount: order.total, razorpayOrderId: simOrderId, status: 'INITIATED' },
      });
      return res.json({ payment, razorpayOrderId: simOrderId, simulated: true });
    }

    const rzp = getRazorpay();
    const rzpOrder = await rzp.orders.create({
      amount: Number(order.total) * 100,
      currency: 'INR',
      receipt: orderId,
    });

    const payment = await prisma.payment.create({
      data: { orderId, method: method.toUpperCase() as any, amount: order.total, razorpayOrderId: rzpOrder.id, status: 'INITIATED' },
    });

    res.json({ payment, razorpayOrderId: rzpOrder.id, amount: rzpOrder.amount, currency: 'INR' });
  } catch (e) { next(e); }
});

// ─── Verify ─────────────────────────────────────────────────────────────────

router.post('/verify', authenticate, validate(verifyPaymentSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, signature } = req.body;
    const payment = await prisma.payment.findFirst({ where: { razorpayOrderId } });
    if (!payment) throw new AppError('Payment not found', 404);

    if (!isTestMode) {
      const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');
      if (expected !== signature) throw new AppError('Payment verification failed', 400);
    }

    await prisma.payment.update({ where: { id: payment.id }, data: { razorpayPaymentId, status: 'SUCCESS' } });
    await prisma.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'PAID', paymentMethod: payment.method } });
    res.json({ verified: true });
  } catch (e) { next(e); }
});

// ─── Refund ─────────────────────────────────────────────────────────────────

router.post('/refund', authenticate, validate(initiateRefundSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paymentId, amount, reason } = req.body;
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new AppError('Payment not found', 404);
    if (payment.status !== 'SUCCESS') throw new AppError('Only successful payments can be refunded', 400);

    const refundAmount = amount ?? Number(payment.amount);

    if (!isTestMode && payment.razorpayPaymentId) {
      const rzp = getRazorpay();
      await rzp.payments.refund(payment.razorpayPaymentId, { amount: refundAmount * 100, notes: { reason: reason ?? '' } });
    }

    await prisma.payment.update({ where: { id: paymentId }, data: { status: 'REFUNDED', refundAmount } });
    await prisma.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'REFUNDED' } });
    res.json({ refunded: true, amount: refundAmount });
  } catch (e) { next(e); }
});

export default router;
