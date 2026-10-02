import { Response } from 'express';
import {
  PaymentModel,
  StoreModel,
  SubscriptionModel,
  SubscriptionPlan,
  AuditLogModel,
} from '../models/index.ts';
import { isDbConnected, fallbackStore, changeStreamEmitter } from '../db.ts';
import { AdminAuthRequest } from '../middleware/auth.middleware.ts';

export async function getPayments(req: AdminAuthRequest, res: Response) {
  const { search = '', status = '', method = '', page = '1', limit = '10' } = req.query;
  const p = Math.max(1, parseInt(page as string, 10));
  const lim = Math.max(1, parseInt(limit as string, 10));

  try {
    if (isDbConnected()) {
      const query: any = {};
      if (status) query.status = status;
      if (method) query.method = method;
      if (search) {
        query.transactionId = new RegExp(search as string, 'i');
      }

      const total = await PaymentModel.countDocuments(query);
      const payments = await PaymentModel.find(query)
        .sort({ createdAt: -1 })
        .skip((p - 1) * lim)
        .limit(lim);

      const allStores = await StoreModel.find();
      const enhanced = payments.map((pay) => {
        const store = allStores.find((s) => s._id.toString() === pay.storeId);
        return {
          _id: pay._id.toString(),
          storeId: pay.storeId,
          subscriptionId: pay.subscriptionId,
          storeName: store?.name || 'Shop',
          ownerName: store?.ownerName || 'Owner',
          amount: pay.amount,
          method: pay.method,
          transactionId: pay.transactionId,
          status: pay.status,
          approvedBy: pay.approvedBy,
          approvedAt: pay.approvedAt,
          rejectionReason: pay.rejectionReason,
          notes: pay.notes,
          createdAt: pay.createdAt,
        };
      });

      return res.json({
        success: true,
        total,
        page: p,
        limit: lim,
        totalPages: Math.ceil(total / lim) || 1,
        payments: enhanced,
      });
    } else {
      let filtered = [...fallbackStore.payments];
      if (status) filtered = filtered.filter((p) => p.status === status);
      if (method) filtered = filtered.filter((p) => p.method === method);
      if (search) {
        const q = (search as string).toLowerCase();
        filtered = filtered.filter((p) => p.transactionId.toLowerCase().includes(q));
      }

      const enhanced = filtered.map((pay) => {
        const store = fallbackStore.stores.find((s) => s._id === pay.storeId);
        return {
          ...pay,
          storeName: store?.name || 'Shop',
          ownerName: store?.ownerName || 'Owner',
        };
      });

      const total = enhanced.length;
      const startIndex = (p - 1) * lim;
      const paginated = enhanced.slice(startIndex, startIndex + lim);

      return res.json({
        success: true,
        total,
        page: p,
        limit: lim,
        totalPages: Math.ceil(total / lim) || 1,
        payments: paginated,
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch payments' });
  }
}

export async function getPaymentDetails(req: AdminAuthRequest, res: Response) {
  const { id } = req.params;

  try {
    if (isDbConnected()) {
      const pay = await PaymentModel.findById(id);
      if (!pay) return res.status(404).json({ success: false, error: 'Payment not found' });

      const store = await StoreModel.findById(pay.storeId);
      const sub = await SubscriptionModel.findOne({ storeId: pay.storeId });
      const plan = sub ? await SubscriptionPlan.findById(sub.planId) : null;

      return res.json({
        success: true,
        payment: {
          _id: pay._id.toString(),
          storeId: pay.storeId,
          subscriptionId: pay.subscriptionId,
          storeName: store?.name || 'Shop',
          ownerName: store?.ownerName || 'Owner',
          planName: plan?.name || 'Pro',
          amount: pay.amount,
          method: pay.method,
          transactionId: pay.transactionId,
          status: pay.status,
          approvedBy: pay.approvedBy,
          approvedAt: pay.approvedAt,
          rejectionReason: pay.rejectionReason,
          notes: pay.notes,
          createdAt: pay.createdAt,
        },
      });
    } else {
      const pay = fallbackStore.payments.find((p) => p._id === id);
      if (!pay) return res.status(404).json({ success: false, error: 'Payment not found' });

      const store = fallbackStore.stores.find((s) => s._id === pay.storeId);
      const sub = fallbackStore.subscriptions.find((su) => su.storeId === pay.storeId);
      const plan = sub ? fallbackStore.subscriptionPlans.find((p) => p._id === sub.planId) : null;

      return res.json({
        success: true,
        payment: {
          ...pay,
          storeName: store?.name || 'Shop',
          ownerName: store?.ownerName || 'Owner',
          planName: plan?.name || 'Pro',
        },
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch payment details' });
  }
}

export async function recordManualPayment(req: AdminAuthRequest, res: Response) {
  const admin = req.admin!;
  const { storeId, amount, method = 'Cash', transactionId, notes = '' } = req.body;

  if (!storeId || !amount) {
    return res.status(400).json({ success: false, error: 'Store and amount are required' });
  }

  const txn = transactionId || `TXN-MANUAL-${Math.floor(100000 + Math.random() * 900000)}`;

  try {
    if (isDbConnected()) {
      const sub = await SubscriptionModel.findOne({ storeId });
      const payment = await PaymentModel.create({
        storeId,
        subscriptionId: sub ? sub._id.toString() : '',
        amount: Number(amount),
        method,
        transactionId: txn,
        status: 'approved',
        approvedBy: admin._id,
        approvedAt: new Date(),
        notes,
      });

      // Extend subscription by 30 days
      if (sub) {
        const currentEnd = new Date(sub.endDate).getTime();
        const baseTime = currentEnd > Date.now() ? currentEnd : Date.now();
        sub.endDate = new Date(baseTime + 30 * 86400000);
        sub.status = 'active';
        await sub.save();
      }

      await AuditLogModel.create({
        adminId: admin._id,
        adminName: admin.name,
        action: 'Record manual payment',
        targetId: payment._id.toString(),
        details: { storeId, amount, txn },
        timestamp: new Date(),
      });

      changeStreamEmitter.emit('PAYMENT_RECORDED', payment);
      return res.status(201).json({ success: true, payment });
    } else {
      const sub = fallbackStore.subscriptions.find((su) => su.storeId === storeId);
      const payment = {
        _id: 'pay_' + Date.now(),
        storeId,
        subscriptionId: sub ? sub._id : '',
        amount: Number(amount),
        method: method as any,
        transactionId: txn,
        status: 'approved' as const,
        approvedBy: admin._id,
        approvedAt: new Date().toISOString(),
        notes,
        createdAt: new Date().toISOString(),
      };
      fallbackStore.payments.unshift(payment);

      if (sub) {
        const currentEnd = new Date(sub.endDate).getTime();
        const baseTime = currentEnd > Date.now() ? currentEnd : Date.now();
        sub.endDate = new Date(baseTime + 30 * 86400000).toISOString();
        sub.status = 'active';
      }

      fallbackStore.auditLogs.unshift({
        _id: 'log_' + Date.now(),
        adminId: admin._id,
        adminName: admin.name,
        action: 'Record manual payment',
        targetId: payment._id,
        details: { storeId, amount, txn },
        timestamp: new Date().toISOString(),
      });

      changeStreamEmitter.emit('PAYMENT_RECORDED', payment);
      return res.status(201).json({ success: true, payment });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to record payment' });
  }
}

export async function approvePayment(req: AdminAuthRequest, res: Response) {
  const admin = req.admin!;
  const id = req.params.id as string;

  try {
    if (isDbConnected()) {
      const payment = await PaymentModel.findById(id);
      if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });

      payment.status = 'approved';
      payment.approvedBy = admin._id;
      payment.approvedAt = new Date();
      await payment.save();

      // Extend subscription by 30 days and reactivate store if needed
      let sub = await SubscriptionModel.findOne({ storeId: payment.storeId });
      if (sub) {
        const currentEnd = new Date(sub.endDate).getTime();
        const baseTime = currentEnd > Date.now() ? currentEnd : Date.now();
        sub.endDate = new Date(baseTime + 30 * 86400000);
        sub.status = 'active';
        await sub.save();
      }

      await AuditLogModel.create({
        adminId: admin._id,
        adminName: admin.name,
        action: 'Approve payment',
        targetId: id,
        details: { amount: payment.amount, txn: payment.transactionId },
        timestamp: new Date(),
      });

      changeStreamEmitter.emit('PAYMENT_APPROVED', {
        storeId: payment.storeId,
        paymentId: id,
        amount: payment.amount,
      });

      return res.json({ success: true, message: 'Payment approved successfully', payment, subscription: sub });
    } else {
      const payment = fallbackStore.payments.find((p) => p._id === id);
      if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });

      payment.status = 'approved';
      payment.approvedBy = admin._id;
      payment.approvedAt = new Date().toISOString();

      let sub = fallbackStore.subscriptions.find((su) => su.storeId === payment.storeId);
      if (sub) {
        const currentEnd = new Date(sub.endDate).getTime();
        const baseTime = currentEnd > Date.now() ? currentEnd : Date.now();
        sub.endDate = new Date(baseTime + 30 * 86400000).toISOString();
        sub.status = 'active';
      }

      fallbackStore.auditLogs.unshift({
        _id: 'log_' + Date.now(),
        adminId: admin._id,
        adminName: admin.name,
        action: 'Approve payment',
        targetId: id,
        details: { amount: payment.amount, txn: payment.transactionId },
        timestamp: new Date().toISOString(),
      });

      changeStreamEmitter.emit('PAYMENT_APPROVED', {
        storeId: payment.storeId,
        paymentId: id,
        amount: payment.amount,
      });

      return res.json({ success: true, message: 'Payment approved successfully', payment, subscription: sub });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to approve payment' });
  }
}

export async function rejectPayment(req: AdminAuthRequest, res: Response) {
  const admin = req.admin!;
  const id = req.params.id as string;
  const { reason = 'Transaction ID not verified' } = req.body;

  try {
    if (isDbConnected()) {
      const payment = await PaymentModel.findById(id);
      if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });

      payment.status = 'rejected';
      payment.rejectionReason = reason;
      await payment.save();

      await AuditLogModel.create({
        adminId: admin._id,
        adminName: admin.name,
        action: 'Reject payment',
        targetId: id,
        details: { reason },
        timestamp: new Date(),
      });

      changeStreamEmitter.emit('PAYMENT_REJECTED', {
        storeId: payment.storeId,
        paymentId: id,
        reason,
      });

      return res.json({ success: true, message: 'Payment rejected', payment });
    } else {
      const payment = fallbackStore.payments.find((p) => p._id === id);
      if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });

      payment.status = 'rejected';
      payment.rejectionReason = reason;

      fallbackStore.auditLogs.unshift({
        _id: 'log_' + Date.now(),
        adminId: admin._id,
        adminName: admin.name,
        action: 'Reject payment',
        targetId: id,
        details: { reason },
        timestamp: new Date().toISOString(),
      });

      changeStreamEmitter.emit('PAYMENT_REJECTED', {
        storeId: payment.storeId,
        paymentId: id,
        reason,
      });

      return res.json({ success: true, message: 'Payment rejected', payment });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to reject payment' });
  }
}
