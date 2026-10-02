import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  UserModel,
  StoreModel,
  SubscriptionModel,
  SubscriptionPlan,
  PaymentModel,
  SaleModel,
} from '../models/index.ts';
import { isDbConnected, fallbackStore, changeStreamEmitter } from '../db.ts';
import { OwnerAuthRequest, OWNER_JWT_SECRET } from '../middleware/auth.middleware.ts';

export async function ownerLogin(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password required' });
  }

  try {
    let user: any = null;
    let store: any = null;

    if (isDbConnected()) {
      user = await UserModel.findOne({ email: email.toLowerCase() });
      if (!user) return res.status(401).json({ success: false, error: 'Invalid owner credentials' });

      const isMatch = bcrypt.compareSync(password, user.passwordHash);
      if (!isMatch) return res.status(401).json({ success: false, error: 'Invalid owner credentials' });

      store = await StoreModel.findById(user.storeId);
      if (!store) return res.status(404).json({ success: false, error: 'Store not found' });

      if (store.status === 'suspended') {
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_SUSPENDED',
          error: 'Your account has been suspended by the administrator.',
        });
      }

      user.lastLogin = new Date();
      await user.save();
    } else {
      user = fallbackStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!user) return res.status(401).json({ success: false, error: 'Invalid owner credentials' });

      const isMatch = bcrypt.compareSync(password, user.passwordHash);
      if (!isMatch) return res.status(401).json({ success: false, error: 'Invalid owner credentials' });

      store = fallbackStore.stores.find((s) => s._id === user.storeId);
      if (!store) return res.status(404).json({ success: false, error: 'Store not found' });

      if (store.status === 'suspended') {
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_SUSPENDED',
          error: 'Your account has been suspended by the administrator.',
        });
      }
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        storeId: user.storeId,
        email: user.email,
        role: user.role,
      },
      OWNER_JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        _id: user._id.toString(),
        storeId: user.storeId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      store,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Owner login failed' });
  }
}

export async function getOwnerStatus(req: OwnerAuthRequest, res: Response) {
  const { storeId } = req.ownerUser!;

  try {
    if (isDbConnected()) {
      const [store, sub, pendingPayments] = await Promise.all([
        StoreModel.findById(storeId),
        SubscriptionModel.findOne({ storeId }),
        PaymentModel.find({ storeId, status: 'pending' }),
      ]);

      const plan = sub ? await SubscriptionPlan.findById(sub.planId) : null;

      return res.json({
        success: true,
        store,
        subscription: sub
          ? {
              _id: sub._id.toString(),
              storeId: sub.storeId,
              planId: sub.planId,
              planName: plan?.name || 'Pro',
              price: plan?.price || 1999,
              status: sub.status,
              startDate: sub.startDate,
              endDate: sub.endDate,
            }
          : null,
        hasPendingPayment: pendingPayments.length > 0,
        pendingPayments,
      });
    } else {
      const store = fallbackStore.stores.find((s) => s._id === storeId);
      const sub = fallbackStore.subscriptions.find((s) => s.storeId === storeId);
      const plan = sub ? fallbackStore.subscriptionPlans.find((p) => p._id === sub.planId) : null;
      const pendingPayments = fallbackStore.payments.filter((p) => p.storeId === storeId && p.status === 'pending');

      return res.json({
        success: true,
        store,
        subscription: sub
          ? {
              ...sub,
              planName: plan?.name || 'Pro',
              price: plan?.price || 1999,
            }
          : null,
        hasPendingPayment: pendingPayments.length > 0,
        pendingPayments,
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch status' });
  }
}

export async function submitOwnerPayment(req: OwnerAuthRequest, res: Response) {
  const { storeId } = req.ownerUser!;
  const { amount = 999, method = 'bKash', transactionId } = req.body;
  const txn = transactionId || `TXN-${Math.floor(100000 + Math.random() * 900000)}`;

  try {
    if (isDbConnected()) {
      const sub = await SubscriptionModel.findOne({ storeId });
      const store = await StoreModel.findById(storeId);

      const payment = await PaymentModel.create({
        storeId,
        subscriptionId: sub ? sub._id.toString() : 'sub_pending',
        amount: Number(amount),
        method,
        transactionId: txn,
        status: 'pending',
      });

      changeStreamEmitter.emit('NEW_PAYMENT_SUBMITTED', {
        payment: {
          _id: payment._id.toString(),
          storeId,
          storeName: store?.name || 'Shop',
          ownerName: store?.ownerName || 'Owner',
          amount: payment.amount,
          method: payment.method,
          transactionId: payment.transactionId,
          status: 'pending',
          createdAt: payment.createdAt,
        },
      });

      return res.json({ success: true, message: 'Payment submitted for approval', payment });
    } else {
      const sub = fallbackStore.subscriptions.find((s) => s.storeId === storeId);
      const store = fallbackStore.stores.find((s) => s._id === storeId);

      const payment = {
        _id: 'pay_' + Date.now(),
        storeId,
        subscriptionId: sub ? sub._id : 'sub_pending',
        amount: Number(amount),
        method: method as any,
        transactionId: txn,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      };
      fallbackStore.payments.unshift(payment);

      changeStreamEmitter.emit('NEW_PAYMENT_SUBMITTED', {
        payment: {
          ...payment,
          storeName: store?.name || 'Shop',
          ownerName: store?.ownerName || 'Owner',
        },
      });

      return res.json({ success: true, message: 'Payment submitted for approval', payment });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Payment submission failed' });
  }
}

export async function ownerPosCheckout(req: OwnerAuthRequest, res: Response) {
  const { storeId } = req.ownerUser!;
  const { itemsCount = 2, totalAmount = 450, customerName = 'Walk-in Customer' } = req.body;

  try {
    if (isDbConnected()) {
      const store = await StoreModel.findById(storeId);
      if (!store || store.status === 'suspended') {
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_SUSPENDED',
          error: 'POS transactions disabled: Account is suspended.',
        });
      }

      const sub = await SubscriptionModel.findOne({ storeId });
      if (!sub || sub.status === 'expired' || new Date(sub.endDate).getTime() < Date.now()) {
        return res.status(403).json({
          success: false,
          code: 'SUBSCRIPTION_EXPIRED',
          error: 'POS checkout blocked: Subscription expired. Please renew your plan.',
        });
      }

      const sale = await SaleModel.create({
        storeId,
        invoiceNumber: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        totalAmount: Number(totalAmount),
        itemsCount: Number(itemsCount),
        customerName,
        paymentMethod: 'Cash',
      });

      return res.json({ success: true, message: 'POS Sale processed successfully', sale });
    } else {
      const store = fallbackStore.stores.find((s) => s._id === storeId);
      if (!store || store.status === 'suspended') {
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_SUSPENDED',
          error: 'POS transactions disabled: Account is suspended.',
        });
      }

      const sub = fallbackStore.subscriptions.find((s) => s.storeId === storeId);
      if (!sub || sub.status === 'expired' || new Date(sub.endDate).getTime() < Date.now()) {
        return res.status(403).json({
          success: false,
          code: 'SUBSCRIPTION_EXPIRED',
          error: 'POS checkout blocked: Subscription expired. Please renew your plan.',
        });
      }

      const sale = {
        _id: 'sale_' + Date.now(),
        storeId,
        invoiceNumber: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        totalAmount: Number(totalAmount),
        itemsCount: Number(itemsCount),
        customerName,
        paymentMethod: 'Cash',
        createdAt: new Date().toISOString(),
      };
      fallbackStore.sales.unshift(sale);

      return res.json({ success: true, message: 'POS Sale processed successfully', sale });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Checkout failed' });
  }
}
