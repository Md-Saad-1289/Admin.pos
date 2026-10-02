import { Response } from 'express';
import {
  StoreModel,
  SubscriptionModel,
  PaymentModel,
  SubscriptionPlan,
} from '../models/index.ts';
import { isDbConnected, fallbackStore } from '../db.ts';
import { AdminAuthRequest } from '../middleware/auth.middleware.ts';

export async function getDashboardStats(_req: AdminAuthRequest, res: Response) {
  try {
    if (isDbConnected()) {
      const [
        totalShops,
        activeShops,
        suspendedShops,
        activeSubscriptions,
        expiringSubscriptions,
        expiredSubscriptions,
        pendingPaymentsList,
        approvedPaymentsList,
        recentStores,
        recentPaymentsDocs,
        plans,
      ] = await Promise.all([
        StoreModel.countDocuments(),
        StoreModel.countDocuments({ status: 'active' }),
        StoreModel.countDocuments({ status: 'suspended' }),
        SubscriptionModel.countDocuments({ status: 'active' }),
        SubscriptionModel.countDocuments({ status: 'expiring' }),
        SubscriptionModel.countDocuments({ status: 'expired' }),
        PaymentModel.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(10),
        PaymentModel.find({ status: 'approved' }),
        StoreModel.find().sort({ createdAt: -1 }).limit(5),
        PaymentModel.find().sort({ createdAt: -1 }).limit(5),
        SubscriptionPlan.find(),
      ]);

      const monthlyRevenue = approvedPaymentsList.reduce((acc, p) => acc + (p.amount || 0), 0);

      // Enhance recent shops with plan info
      const recentShopsEnhanced = await Promise.all(
        recentStores.map(async (s) => {
          const sub = await SubscriptionModel.findOne({ storeId: s._id.toString() });
          const plan = sub ? plans.find((p) => p._id.toString() === sub.planId) : null;
          return {
            _id: s._id.toString(),
            name: s.name,
            branch: s.branch,
            ownerName: s.ownerName,
            ownerEmail: s.ownerEmail,
            storeType: s.storeType,
            status: s.status,
            planName: plan?.name || 'Basic',
            createdAt: s.createdAt,
          };
        })
      );

      // Enhance recent payments
      const recentPaymentsEnhanced = await Promise.all(
        recentPaymentsDocs.map(async (p) => {
          const store = await StoreModel.findById(p.storeId);
          return {
            _id: p._id.toString(),
            storeId: p.storeId,
            storeName: store?.name || 'Shop',
            ownerName: store?.ownerName || 'Owner',
            amount: p.amount,
            method: p.method,
            transactionId: p.transactionId,
            status: p.status,
            createdAt: p.createdAt,
          };
        })
      );

      // Enhance pending payments
      const pendingPaymentsEnhanced = await Promise.all(
        pendingPaymentsList.map(async (p) => {
          const store = await StoreModel.findById(p.storeId);
          return {
            _id: p._id.toString(),
            storeId: p.storeId,
            storeName: store?.name || 'Shop',
            ownerName: store?.ownerName || 'Owner',
            amount: p.amount,
            method: p.method,
            transactionId: p.transactionId,
            status: p.status,
            createdAt: p.createdAt,
          };
        })
      );

      return res.json({
        success: true,
        stats: {
          totalShops,
          activeShops,
          suspendedShops,
          monthlyRevenue,
          activeSubscriptions,
          expiringSubscriptions,
          expiredSubscriptions,
          pendingPayments: pendingPaymentsList.length,
          newShopsThisMonth: recentStores.length,
        },
        recentShops: recentShopsEnhanced,
        recentPayments: recentPaymentsEnhanced,
        pendingPayments: pendingPaymentsEnhanced,
      });
    } else {
      // Fallback in-memory computation
      const stores = fallbackStore.stores;
      const subs = fallbackStore.subscriptions;
      const payments = fallbackStore.payments;
      const plans = fallbackStore.subscriptionPlans;

      const totalShops = stores.length;
      const activeShops = stores.filter((s) => s.status === 'active').length;
      const suspendedShops = stores.filter((s) => s.status === 'suspended').length;
      const activeSubscriptions = subs.filter((s) => s.status === 'active').length;
      const expiringSubscriptions = subs.filter((s) => s.status === 'expiring').length;
      const expiredSubscriptions = subs.filter((s) => s.status === 'expired').length;

      const approvedPayments = payments.filter((p) => p.status === 'approved');
      const monthlyRevenue = approvedPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

      const pendingPaymentsList = payments.filter((p) => p.status === 'pending');

      const recentShops = stores.slice(0, 5).map((s) => {
        const sub = subs.find((su) => su.storeId === s._id);
        const plan = sub ? plans.find((p) => p._id === sub.planId) : null;
        return {
          ...s,
          planName: plan?.name || 'Basic',
        };
      });

      const recentPayments = payments.slice(0, 5).map((p) => {
        const store = stores.find((s) => s._id === p.storeId);
        return {
          ...p,
          storeName: store?.name || 'Shop',
          ownerName: store?.ownerName || 'Owner',
        };
      });

      const pendingPayments = pendingPaymentsList.map((p) => {
        const store = stores.find((s) => s._id === p.storeId);
        return {
          ...p,
          storeName: store?.name || 'Shop',
          ownerName: store?.ownerName || 'Owner',
        };
      });

      return res.json({
        success: true,
        stats: {
          totalShops,
          activeShops,
          suspendedShops,
          monthlyRevenue,
          activeSubscriptions,
          expiringSubscriptions,
          expiredSubscriptions,
          pendingPayments: pendingPaymentsList.length,
          newShopsThisMonth: stores.length,
        },
        recentShops,
        recentPayments,
        pendingPayments,
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch dashboard stats' });
  }
}
