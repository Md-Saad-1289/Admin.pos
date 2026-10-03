import { Response } from 'express';
import { SubscriptionPlan, SubscriptionModel, StoreModel } from '../models/index.ts';
import { isDbConnected, fallbackStore } from '../db.ts';
import { AdminAuthRequest } from '../middleware/auth.middleware.ts';
import { dbCache } from '../utils/cache.ts';

export async function getPlans(_req: AdminAuthRequest, res: Response) {
  try {
    const cached = dbCache.get<any>('plans');
    if (cached) return res.json(cached);

    if (isDbConnected()) {
      const plans = await SubscriptionPlan.find().sort({ price: 1 }).lean();
      const responseData = { success: true, plans };
      dbCache.set('plans', responseData, 300);
      return res.json(responseData);
    } else {
      const responseData = { success: true, plans: fallbackStore.subscriptionPlans };
      dbCache.set('plans', responseData, 300);
      return res.json(responseData);
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch plans' });
  }
}

export async function createPlan(req: AdminAuthRequest, res: Response) {
  const { name, price, billingCycle = 'monthly', features = [], maxUsers = 5, maxProducts = 500 } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ success: false, error: 'Plan name and price are required' });
  }

  try {
    if (isDbConnected()) {
      const plan = await SubscriptionPlan.create({
        name,
        price: Number(price),
        billingCycle,
        features: Array.isArray(features) ? features : [features],
        maxUsers: Number(maxUsers),
        maxProducts: Number(maxProducts),
        status: 'active',
      });
      dbCache.delete('plans');
      dbCache.delete('dashboard');
      return res.status(201).json({ success: true, plan });
    } else {
      const plan = {
        _id: 'plan_' + Date.now(),
        name,
        price: Number(price),
        billingCycle,
        features: Array.isArray(features) ? features : [features],
        maxUsers: Number(maxUsers),
        maxProducts: Number(maxProducts),
        status: 'active' as const,
        createdAt: new Date().toISOString(),
      };
      fallbackStore.subscriptionPlans.push(plan);
      dbCache.delete('plans');
      dbCache.delete('dashboard');
      return res.status(201).json({ success: true, plan });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to create plan' });
  }
}

export async function updatePlan(req: AdminAuthRequest, res: Response) {
  const { id } = req.params;
  const updates = req.body;

  try {
    dbCache.delete('plans');
    dbCache.delete('dashboard');
    if (isDbConnected()) {
      const plan = await SubscriptionPlan.findByIdAndUpdate(id, updates, { new: true });
      if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' });
      return res.json({ success: true, plan });
    } else {
      const plan = fallbackStore.subscriptionPlans.find((p) => p._id === id);
      if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' });
      Object.assign(plan, updates);
      return res.json({ success: true, plan });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to update plan' });
  }
}

export async function deletePlan(req: AdminAuthRequest, res: Response) {
  const { id } = req.params;

  try {
    dbCache.delete('plans');
    dbCache.delete('dashboard');
    if (isDbConnected()) {
      await SubscriptionPlan.findByIdAndDelete(id);
      return res.json({ success: true, message: 'Plan deleted successfully' });
    } else {
      fallbackStore.subscriptionPlans = fallbackStore.subscriptionPlans.filter((p) => p._id !== id);
      return res.json({ success: true, message: 'Plan deleted successfully' });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to delete plan' });
  }
}

export async function getSubscriptions(_req: AdminAuthRequest, res: Response) {
  try {
    if (isDbConnected()) {
      const [subs, stores, plans] = await Promise.all([
        SubscriptionModel.find().sort({ createdAt: -1 }),
        StoreModel.find(),
        SubscriptionPlan.find(),
      ]);

      const enhanced = subs.map((sub) => {
        const store = stores.find((s) => s._id.toString() === sub.storeId);
        const plan = plans.find((p) => p._id.toString() === sub.planId);
        return {
          _id: sub._id.toString(),
          storeId: sub.storeId,
          planId: sub.planId,
          storeName: store?.name || 'Shop',
          ownerName: store?.ownerName || 'Owner',
          planName: plan?.name || 'Basic',
          price: plan?.price || 999,
          billingCycle: plan?.billingCycle || 'monthly',
          status: sub.status,
          startDate: sub.startDate,
          endDate: sub.endDate,
          createdAt: sub.createdAt,
        };
      });

      return res.json({ success: true, subscriptions: enhanced });
    } else {
      const subs = fallbackStore.subscriptions.map((sub) => {
        const store = fallbackStore.stores.find((s) => s._id === sub.storeId);
        const plan = fallbackStore.subscriptionPlans.find((p) => p._id === sub.planId);
        return {
          ...sub,
          storeName: store?.name || 'Shop',
          ownerName: store?.ownerName || 'Owner',
          planName: plan?.name || 'Basic',
          price: plan?.price || 999,
          billingCycle: plan?.billingCycle || 'monthly',
        };
      });

      return res.json({ success: true, subscriptions: subs });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch subscriptions' });
  }
}
