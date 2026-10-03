import { Response } from 'express';
import {
  StoreModel,
  SubscriptionModel,
  PaymentModel,
  SubscriptionPlan,
} from '../models/index.ts';
import { isDbConnected, fallbackStore } from '../db.ts';
import { AdminAuthRequest } from '../middleware/auth.middleware.ts';
import { dbCache } from '../utils/cache.ts';

export async function getDashboardStats(_req: AdminAuthRequest, res: Response) {
  try {
    // 1. Check in-memory cache first to avoid DB load
    const cached = dbCache.get<any>('dashboard');
    if (cached) {
      return res.json(cached);
    }

    if (isDbConnected()) {
      // 2. Optimized parallel queries with lean() and aggregation
      const [
        totalShops,
        activeShops,
        suspendedShops,
        activeSubscriptions,
        expiringSubscriptions,
        expiredSubscriptions,
        pendingPaymentsCount,
        revenueAgg,
        recentStores,
        recentPaymentsDocs,
        pendingPaymentsList,
        plans,
      ] = await Promise.all([
        StoreModel.countDocuments(),
        StoreModel.countDocuments({ status: 'active' }),
        StoreModel.countDocuments({ status: 'suspended' }),
        SubscriptionModel.countDocuments({ status: 'active' }),
        SubscriptionModel.countDocuments({ status: 'expiring' }),
        SubscriptionModel.countDocuments({ status: 'expired' }),
        PaymentModel.countDocuments({ status: 'pending' }),
        PaymentModel.aggregate([
          { $match: { status: 'approved' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        StoreModel.find().sort({ createdAt: -1 }).limit(5).lean(),
        PaymentModel.find().sort({ createdAt: -1 }).limit(5).lean(),
        PaymentModel.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(10).lean(),
        SubscriptionPlan.find().lean(),
      ]);

      const monthlyRevenue = revenueAgg[0]?.total || 0;

      // 3. Batch fetch subscriptions for recent stores (Eliminates N+1 queries)
      const storeIds = recentStores.map((s) => s._id.toString());
      const storeSubs = await SubscriptionModel.find({ storeId: { $in: storeIds } }).lean();
      const subMap = new Map(storeSubs.map((sub) => [sub.storeId, sub]));
      const planMap = new Map(plans.map((pl) => [pl._id.toString(), pl]));

      const recentShopsEnhanced = recentStores.map((s) => {
        const sub = subMap.get(s._id.toString());
        const plan = sub ? planMap.get(sub.planId) : null;
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
      });

      // 4. Batch fetch stores for payments (Eliminates N+1 queries)
      const paymentStoreIds = [
        ...new Set([
          ...recentPaymentsDocs.map((p) => p.storeId),
          ...pendingPaymentsList.map((p) => p.storeId),
        ]),
      ];
      const paymentStores = await StoreModel.find({ _id: { $in: paymentStoreIds } })
        .select('name ownerName')
        .lean();
      const pStoreMap = new Map(paymentStores.map((st) => [st._id.toString(), st]));

      const recentPaymentsEnhanced = recentPaymentsDocs.map((p) => {
        const store = pStoreMap.get(p.storeId);
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
      });

      const pendingPaymentsEnhanced = pendingPaymentsList.map((p) => {
        const store = pStoreMap.get(p.storeId);
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
      });

      const responseData = {
        success: true,
        stats: {
          totalShops,
          activeShops,
          suspendedShops,
          monthlyRevenue,
          activeSubscriptions,
          expiringSubscriptions,
          expiredSubscriptions,
          pendingPayments: pendingPaymentsCount,
          newShopsThisMonth: recentStores.length,
        },
        recentShops: recentShopsEnhanced,
        recentPayments: recentPaymentsEnhanced,
        pendingPayments: pendingPaymentsEnhanced,
      };

      // 5. Store in cache for 30s to keep DB load low
      dbCache.set('dashboard', responseData, 30);

      return res.json(responseData);
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

      const pendingPaymentsEnhanced = pendingPaymentsList.slice(0, 10).map((p) => {
        const store = stores.find((s) => s._id === p.storeId);
        return {
          ...p,
          storeName: store?.name || 'Shop',
          ownerName: store?.ownerName || 'Owner',
        };
      });

      const responseData = {
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
        pendingPayments: pendingPaymentsEnhanced,
      };

      dbCache.set('dashboard', responseData, 30);
      return res.json(responseData);
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch dashboard stats' });
  }
}
