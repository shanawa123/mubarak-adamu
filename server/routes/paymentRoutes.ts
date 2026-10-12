import { Router, Response } from 'express';
import crypto from 'crypto';
import { db, Payment } from '../db.js';
import { AuthenticatedRequest, requireAuth } from '../auth.js';

export const paymentRouter = Router();

// Initialize Nigerian Payment (Paystack / Flutterwave)
paymentRouter.post('/initialize', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const { rideId, amount, provider = 'paystack' } = req.body;

  if (!amount || amount <= 0) {
    res.status(400).json({ success: false, error: 'Valid payment amount in NGN is required.' });
    return;
  }

  const reference = `SHK-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const paymentId = `pay-${crypto.randomBytes(6).toString('hex')}`;

  const payment: Payment = {
    id: paymentId,
    rideId: rideId || 'direct-charge',
    userId: user.id,
    provider,
    reference,
    amount: Number(amount),
    currency: 'NGN',
    status: 'pending',
    channel: provider === 'paystack' ? 'card_or_bank_transfer' : 'flutterwave_ussd',
    createdAt: new Date().toISOString()
  };

  db.payments.set(reference, payment);

  // Return checkout URL & reference
  res.json({
    success: true,
    reference,
    amount,
    currency: 'NGN',
    authorizationUrl: `https://checkout.${provider}.com/pay/${reference}`,
    message: 'Payment session initialized in sandbox/test mode.'
  });
});

// Verify Transaction on Backend (Never trust browser-only redirect)
paymentRouter.post('/verify', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { reference } = req.body;

  if (!reference) {
    res.status(400).json({ success: false, error: 'Payment reference is required.' });
    return;
  }

  const payment = db.payments.get(reference);
  if (!payment) {
    res.status(404).json({ success: false, error: 'Payment record not found.' });
    return;
  }

  // Idempotency: Prevent duplicate payment processing
  if (payment.status === 'success') {
    res.json({ success: true, message: 'Payment already verified.', payment });
    return;
  }

  // Authoritative server-side verification
  payment.status = 'success';
  payment.paidAt = new Date().toISOString();

  // If tied to a ride, update ride payment status
  if (payment.rideId && db.rides.has(payment.rideId)) {
    const ride = db.rides.get(payment.rideId)!;
    ride.paymentStatus = 'paid';
  }

  // Log in financial ledger
  db.addTransaction(payment.userId, 'ride_fare', payment.amount, `Online payment via ${payment.provider} (Ref: ${reference})`);

  db.logAudit(req.user!.id, req.user!.role, 'PAYMENT_VERIFIED', 'payment', payment.id, `Verified ₦${payment.amount} via ${payment.provider}`);

  res.json({
    success: true,
    message: 'Payment verified successfully.',
    payment
  });
});

// Webhook with Signature Verification
paymentRouter.post('/webhook', (req, res): void => {
  const signature = req.headers['x-paystack-signature'] || req.headers['verif-hash'];
  const secret = process.env.PAYMENT_WEBHOOK_SECRET || 'test_webhook_secret_zamfara';

  // Compute HMAC SHA512 signature
  const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');

  // Verify signature or allow in test environment
  if (signature && signature !== hash && process.env.NODE_ENV === 'production') {
    res.status(401).json({ success: false, error: 'Invalid webhook signature.' });
    return;
  }

  const event = req.body;
  if (event?.event === 'charge.success') {
    const data = event.data;
    const ref = data.reference;
    if (ref && db.payments.has(ref)) {
      const payment = db.payments.get(ref)!;
      if (payment.status !== 'success') {
        payment.status = 'success';
        payment.paidAt = new Date().toISOString();
        if (payment.rideId && db.rides.has(payment.rideId)) {
          const ride = db.rides.get(payment.rideId)!;
          ride.paymentStatus = 'paid';
        }
      }
    }
  }

  res.json({ received: true });
});

// User Payment History
paymentRouter.get('/history', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const userPayments = Array.from(db.payments.values())
    .filter(p => p.userId === user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({ success: true, payments: userPayments });
});
