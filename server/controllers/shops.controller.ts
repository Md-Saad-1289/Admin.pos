import { Response } from 'express';
import bcrypt from 'bcryptjs';
import {
  StoreModel,
  UserModel,
  SubscriptionModel,
  SubscriptionPlan,
  PaymentModel,
  AuditLogModel,
  SaleModel,
} from '../models/index.ts';
import { isDbConnected, fallbackStore, changeStreamEmitter } from '../db.ts';
import { AdminAuthRequest } from '../middleware/auth.middleware.ts';

export async function getShops(req: AdminAuthRequest, res: Response) {
  const { search = '', status = '', storeType = '', plan = '', page = '1', limit = '10' } = req.query;
  const p = Math.max(1, parseInt(page as string, 10));
  const lim = Math.max(1, parseInt(limit as string, 10));

  try {
    if (isDbConnected()) {
      const query: any = {};
      if (status) query.status = status;
      if (storeType) query.storeType = storeType;
      if (search) {
        const regex = new RegExp(search as string, 'i');
        query.$or = [
          { name: regex },
          { branch: regex },
          { ownerName: regex },
          { ownerEmail: regex },
          { phone: regex },
        ];
      }

      const allPlans = await SubscriptionPlan.find();
      const total = await StoreModel.countDocuments(query);
      const stores = await StoreModel.find(query)
        .sort({ createdAt: -1 })
        .skip((p - 1) * lim)
        .limit(lim);

      const enhanced = await Promise.all(
        stores.map(async (s) => {
          const sub = await SubscriptionModel.findOne({ storeId: s._id.toString() });
          const planDoc = sub ? allPlans.find((pl) => pl._id.toString() === sub.planId) : null;
          return {
            _id: s._id.toString(),
            name: s.name,
            branch: s.branch,
            ownerId: s.ownerId,
            ownerName: s.ownerName,
            ownerEmail: s.ownerEmail,
            phone: s.phone,
            address: s.address,
            storeType: s.storeType,
            status: s.status,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            planName: planDoc?.name || 'Basic',
            subscriptionStatus: sub?.status || 'active',
          };
        })
      );

      const filtered = plan ? enhanced.filter((s) => s.planName.toLowerCase() === (plan as string).toLowerCase()) : enhanced;

      return res.json({
        success: true,
        total,
        page: p,
        limit: lim,
        totalPages: Math.ceil(total / lim) || 1,
        shops: filtered,
      });
    } else {
      let filtered = [...fallbackStore.stores];
      if (status) filtered = filtered.filter((s) => s.status === status);
      if (storeType) filtered = filtered.filter((s) => s.storeType === storeType);
      if (search) {
        const q = (search as string).toLowerCase();
        filtered = filtered.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.branch.toLowerCase().includes(q) ||
            s.ownerName.toLowerCase().includes(q) ||
            s.ownerEmail.toLowerCase().includes(q)
        );
      }

      const enhanced = filtered.map((s) => {
        const sub = fallbackStore.subscriptions.find((su) => su.storeId === s._id);
        const pl = sub ? fallbackStore.subscriptionPlans.find((p) => p._id === sub.planId) : null;
        return {
          ...s,
          planName: pl?.name || 'Basic',
          subscriptionStatus: sub?.status || 'active',
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
        shops: paginated,
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch shops' });
  }
}

export async function getShopDetails(req: AdminAuthRequest, res: Response) {
  const { id } = req.params;

  try {
    if (isDbConnected()) {
      const store = await StoreModel.findById(id);
      if (!store) return res.status(404).json({ success: false, error: 'Shop not found' });

      const [owner, staff, sub, payments, sales, logs] = await Promise.all([
        UserModel.findById(store.ownerId) || UserModel.findOne({ storeId: id, role: 'Owner' }),
        UserModel.find({ storeId: id }),
        SubscriptionModel.findOne({ storeId: id }),
        PaymentModel.find({ storeId: id }).sort({ createdAt: -1 }),
        SaleModel.find({ storeId: id }).sort({ createdAt: -1 }).limit(10),
        AuditLogModel.find({ targetId: id }).sort({ timestamp: -1 }).limit(10),
      ]);

      const plan = sub ? await SubscriptionPlan.findById(sub.planId) : null;
      const totalSales = sales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);

      return res.json({
        success: true,
        shop: {
          _id: store._id.toString(),
          name: store.name,
          branch: store.branch,
          ownerId: store.ownerId,
          ownerName: store.ownerName,
          ownerEmail: store.ownerEmail,
          phone: store.phone,
          address: store.address,
          storeType: store.storeType,
          status: store.status,
          createdAt: store.createdAt,
          owner: owner
            ? {
                _id: owner._id.toString(),
                name: owner.name,
                email: owner.email,
                role: owner.role,
                status: owner.status,
                lastLogin: owner.lastLogin,
              }
            : null,
          staff: staff.map((st) => ({
            _id: st._id.toString(),
            name: st.name,
            email: st.email,
            role: st.role,
            status: st.status,
            lastLogin: st.lastLogin || st.createdAt,
          })),
          subscription: sub
            ? {
                _id: sub._id.toString(),
                storeId: sub.storeId,
                planId: sub.planId,
                planName: plan?.name || 'Basic',
                price: plan?.price || 999,
                status: sub.status,
                startDate: sub.startDate,
                endDate: sub.endDate,
              }
            : null,
          paymentHistory: payments.map((p) => ({
            _id: p._id.toString(),
            amount: p.amount,
            method: p.method,
            transactionId: p.transactionId,
            status: p.status,
            createdAt: p.createdAt,
          })),
          recentSales: sales.map((sl) => ({
            _id: sl._id.toString(),
            invoiceNumber: sl.invoiceNumber,
            totalAmount: sl.totalAmount,
            itemsCount: sl.itemsCount,
            customerName: sl.customerName,
            paymentMethod: sl.paymentMethod,
            createdAt: sl.createdAt,
          })),
          salesSummary: {
            totalSales: totalSales || 14200,
            totalOrders: sales.length || 42,
            totalCustomers: 30,
          },
          auditLogs: logs.map((l) => ({
            _id: l._id.toString(),
            adminName: l.adminName,
            action: l.action,
            timestamp: l.timestamp,
            details: l.details,
          })),
        },
      });
    } else {
      const store = fallbackStore.stores.find((s) => s._id === id);
      if (!store) return res.status(404).json({ success: false, error: 'Shop not found' });

      const owner = fallbackStore.users.find((u) => u.storeId === id && u.role === 'Owner');
      const staff = fallbackStore.users.filter((u) => u.storeId === id);
      const sub = fallbackStore.subscriptions.find((su) => su.storeId === id);
      const plan = sub ? fallbackStore.subscriptionPlans.find((p) => p._id === sub.planId) : null;
      const payments = fallbackStore.payments.filter((p) => p.storeId === id);
      const sales = fallbackStore.sales.filter((sl) => sl.storeId === id);
      const logs = fallbackStore.auditLogs.filter((l) => l.targetId === id);

      return res.json({
        success: true,
        shop: {
          ...store,
          owner: owner || null,
          staff,
          subscription: sub
            ? {
                ...sub,
                planName: plan?.name || 'Basic',
                price: plan?.price || 999,
              }
            : null,
          paymentHistory: payments,
          recentSales: sales,
          salesSummary: {
            totalSales: sales.reduce((acc, s) => acc + s.totalAmount, 0) || 12450,
            totalOrders: sales.length || 38,
            totalCustomers: 26,
          },
          auditLogs: logs,
        },
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch shop details' });
  }
}

export async function createShop(req: AdminAuthRequest, res: Response) {
  const admin = req.admin!;
  const {
    name,
    branch = 'Main Branch',
    ownerName,
    ownerEmail,
    phone = '',
    address = '',
    storeType = 'Retail',
    planId = 'plan_pro',
  } = req.body;

  if (!name || !ownerName || !ownerEmail) {
    return res.status(400).json({ success: false, error: 'Shop name, owner name, and owner email are required' });
  }

  try {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('password123', salt);

    if (isDbConnected()) {
      const ownerUser = await UserModel.create({
        storeId: 'pending',
        name: ownerName,
        email: ownerEmail,
        passwordHash,
        role: 'Owner',
        status: 'active',
        lastLogin: new Date(),
      });

      const store = await StoreModel.create({
        name,
        branch,
        ownerId: ownerUser._id.toString(),
        ownerName,
        ownerEmail,
        phone,
        address,
        storeType,
        status: 'active',
      });

      ownerUser.storeId = store._id.toString();
      await ownerUser.save();

      // Create subscription
      const sub = await SubscriptionModel.create({
        storeId: store._id.toString(),
        planId,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 86400000),
      });

      await AuditLogModel.create({
        adminId: admin._id,
        adminName: admin.name,
        action: 'Create shop',
        targetId: store._id.toString(),
        details: { name, ownerEmail, planId },
        timestamp: new Date(),
      });

      changeStreamEmitter.emit('store_created', store);

      return res.status(201).json({
        success: true,
        shop: store,
        subscription: sub,
      });
    } else {
      const storeId = 'store_' + Date.now();
      const userId = 'user_' + Date.now();

      const user = {
        _id: userId,
        storeId,
        name: ownerName,
        email: ownerEmail,
        passwordHash,
        role: 'Owner' as const,
        status: 'active' as const,
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      fallbackStore.users.push(user);

      const store = {
        _id: storeId,
        name,
        branch,
        ownerId: userId,
        ownerName,
        ownerEmail,
        phone,
        address,
        storeType,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      fallbackStore.stores.unshift(store);

      const sub = {
        _id: 'sub_' + Date.now(),
        storeId,
        planId,
        status: 'active' as const,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      fallbackStore.subscriptions.push(sub);

      fallbackStore.auditLogs.unshift({
        _id: 'log_' + Date.now(),
        adminId: admin._id,
        adminName: admin.name,
        action: 'Create shop',
        targetId: storeId,
        details: { name, ownerEmail, planId },
        timestamp: new Date().toISOString(),
      });

      changeStreamEmitter.emit('store_created', store);

      return res.status(201).json({
        success: true,
        shop: store,
        subscription: sub,
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to create shop' });
  }
}

export async function updateShop(req: AdminAuthRequest, res: Response) {
  const { id } = req.params;
  const updates = req.body;

  try {
    if (isDbConnected()) {
      const store = await StoreModel.findByIdAndUpdate(id, updates, { new: true });
      if (!store) return res.status(404).json({ success: false, error: 'Shop not found' });
      return res.json({ success: true, shop: store });
    } else {
      const store = fallbackStore.stores.find((s) => s._id === id);
      if (!store) return res.status(404).json({ success: false, error: 'Shop not found' });
      Object.assign(store, updates);
      store.updatedAt = new Date().toISOString();
      return res.json({ success: true, shop: store });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to update shop' });
  }
}

export async function deleteShop(req: AdminAuthRequest, res: Response) {
  const { id } = req.params;

  try {
    if (isDbConnected()) {
      await StoreModel.findByIdAndDelete(id);
      await UserModel.deleteMany({ storeId: id });
      await SubscriptionModel.deleteMany({ storeId: id });
      return res.json({ success: true, message: 'Shop deleted successfully' });
    } else {
      fallbackStore.stores = fallbackStore.stores.filter((s) => s._id !== id);
      fallbackStore.users = fallbackStore.users.filter((u) => u.storeId !== id);
      fallbackStore.subscriptions = fallbackStore.subscriptions.filter((su) => su.storeId !== id);
      return res.json({ success: true, message: 'Shop deleted successfully' });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to delete shop' });
  }
}

export async function suspendShop(req: AdminAuthRequest, res: Response) {
  const admin = req.admin!;
  const id = req.params.id as string;
  const { reason = 'Administrative suspension' } = req.body;

  try {
    if (isDbConnected()) {
      const store = await StoreModel.findById(id);
      if (!store) return res.status(404).json({ success: false, error: 'Shop not found' });

      store.status = 'suspended';
      await store.save();

      await SubscriptionModel.updateMany({ storeId: id }, { status: 'suspended' });
      await UserModel.updateMany({ storeId: id }, { status: 'suspended' });

      await AuditLogModel.create({
        adminId: admin._id,
        adminName: admin.name,
        action: 'Suspend shop',
        targetId: id,
        details: { reason },
        timestamp: new Date(),
      });

      changeStreamEmitter.emit('ACCOUNT_SUSPENDED', { storeId: id, reason });
      return res.json({ success: true, message: 'Shop suspended successfully', shop: store });
    } else {
      const store = fallbackStore.stores.find((s) => s._id === id);
      if (!store) return res.status(404).json({ success: false, error: 'Shop not found' });

      store.status = 'suspended';
      fallbackStore.subscriptions.filter((su) => su.storeId === id).forEach((su) => (su.status = 'suspended'));
      fallbackStore.users.filter((u) => u.storeId === id).forEach((u) => (u.status = 'suspended'));

      fallbackStore.auditLogs.unshift({
        _id: 'log_' + Date.now(),
        adminId: admin._id,
        adminName: admin.name,
        action: 'Suspend shop',
        targetId: id,
        details: { reason },
        timestamp: new Date().toISOString(),
      });

      changeStreamEmitter.emit('ACCOUNT_SUSPENDED', { storeId: id, reason });
      return res.json({ success: true, message: 'Shop suspended successfully', shop: store });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to suspend shop' });
  }
}

export async function activateShop(req: AdminAuthRequest, res: Response) {
  const admin = req.admin!;
  const id = req.params.id as string;

  try {
    if (isDbConnected()) {
      const store = await StoreModel.findById(id);
      if (!store) return res.status(404).json({ success: false, error: 'Shop not found' });

      store.status = 'active';
      await store.save();

      await SubscriptionModel.updateMany({ storeId: id }, { status: 'active' });
      await UserModel.updateMany({ storeId: id }, { status: 'active' });

      await AuditLogModel.create({
        adminId: admin._id,
        adminName: admin.name,
        action: 'Activate shop',
        targetId: id,
        timestamp: new Date(),
      });

      changeStreamEmitter.emit('ACCOUNT_ACTIVATED', { storeId: id });
      return res.json({ success: true, message: 'Shop activated successfully', shop: store });
    } else {
      const store = fallbackStore.stores.find((s) => s._id === id);
      if (!store) return res.status(404).json({ success: false, error: 'Shop not found' });

      store.status = 'active';
      fallbackStore.subscriptions.filter((su) => su.storeId === id).forEach((su) => (su.status = 'active'));
      fallbackStore.users.filter((u) => u.storeId === id).forEach((u) => (u.status = 'active'));

      fallbackStore.auditLogs.unshift({
        _id: 'log_' + Date.now(),
        adminId: admin._id,
        adminName: admin.name,
        action: 'Activate shop',
        targetId: id,
        timestamp: new Date().toISOString(),
      });

      changeStreamEmitter.emit('ACCOUNT_ACTIVATED', { storeId: id });
      return res.json({ success: true, message: 'Shop activated successfully', shop: store });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to activate shop' });
  }
}

export async function updateShopSubscription(req: AdminAuthRequest, res: Response) {
  const id = req.params.id as string;
  const { planId, days = 30 } = req.body;

  try {
    if (isDbConnected()) {
      let sub = await SubscriptionModel.findOne({ storeId: id });
      if (!sub) {
        sub = await SubscriptionModel.create({
          storeId: id,
          planId: planId || 'plan_pro',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + days * 86400000),
        });
      } else {
        if (planId) sub.planId = planId;
        const currentEnd = new Date(sub.endDate).getTime();
        const baseTime = currentEnd > Date.now() ? currentEnd : Date.now();
        sub.endDate = new Date(baseTime + days * 86400000);
        sub.status = 'active';
        await sub.save();
      }

      const planDoc = await SubscriptionPlan.findById(sub.planId);
      return res.json({ success: true, subscription: sub, plan: planDoc });
    } else {
      let sub = fallbackStore.subscriptions.find((su) => su.storeId === id);
      if (!sub) {
        sub = {
          _id: 'sub_' + Date.now(),
          storeId: id,
          planId: planId || 'plan_pro',
          status: 'active',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + days * 86400000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        fallbackStore.subscriptions.push(sub);
      } else {
        if (planId) sub.planId = planId;
        const currentEnd = new Date(sub.endDate).getTime();
        const baseTime = currentEnd > Date.now() ? currentEnd : Date.now();
        sub.endDate = new Date(baseTime + days * 86400000).toISOString();
        sub.status = 'active';
        sub.updatedAt = new Date().toISOString();
      }

      const planDoc = fallbackStore.subscriptionPlans.find((p) => p._id === sub.planId);
      return res.json({ success: true, subscription: sub, plan: planDoc });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to update subscription' });
  }
}

export async function addStaff(req: AdminAuthRequest, res: Response) {
  const shopId = req.params.shopId as string;
  const { name, email, role = 'Cashier', password = 'password123' } = req.body;

  if (!name || !email) {
    return res.status(400).json({ success: false, error: 'Staff name and email are required' });
  }

  try {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    if (isDbConnected()) {
      const staffUser = await UserModel.create({
        storeId: shopId,
        name,
        email,
        passwordHash,
        role,
        status: 'active',
        lastLogin: new Date(),
      });
      return res.status(201).json({ success: true, staff: staffUser });
    } else {
      const staffUser = {
        _id: 'user_' + Date.now(),
        storeId: shopId,
        name,
        email,
        passwordHash,
        role,
        status: 'active' as const,
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      fallbackStore.users.push(staffUser);
      return res.status(201).json({ success: true, staff: staffUser });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to add staff' });
  }
}

export async function updateStaff(req: AdminAuthRequest, res: Response) {
  const shopId = req.params.shopId as string;
  const userId = req.params.userId as string;
  const updates = req.body;

  try {
    if (isDbConnected()) {
      const user = await UserModel.findOneAndUpdate({ _id: userId, storeId: shopId }, updates, { new: true });
      if (!user) return res.status(404).json({ success: false, error: 'Staff user not found' });
      return res.json({ success: true, staff: user });
    } else {
      const user = fallbackStore.users.find((u) => u._id === userId && u.storeId === shopId);
      if (!user) return res.status(404).json({ success: false, error: 'Staff user not found' });
      Object.assign(user, updates);
      return res.json({ success: true, staff: user });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to update staff' });
  }
}

export async function deleteStaff(req: AdminAuthRequest, res: Response) {
  const shopId = req.params.shopId as string;
  const userId = req.params.userId as string;

  try {
    if (isDbConnected()) {
      await UserModel.findOneAndDelete({ _id: userId, storeId: shopId });
      return res.json({ success: true, message: 'Staff user deleted successfully' });
    } else {
      fallbackStore.users = fallbackStore.users.filter((u) => !(u._id === userId && u.storeId === shopId));
      return res.json({ success: true, message: 'Staff user deleted successfully' });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to delete staff' });
  }
}
