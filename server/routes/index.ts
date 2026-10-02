import { Router } from 'express';
import authRoutes from './auth.routes.ts';
import dashboardRoutes from './dashboard.routes.ts';
import shopsRoutes from './shops.routes.ts';
import plansRoutes from './plans.routes.ts';
import subscriptionsRoutes from './subscriptions.routes.ts';
import paymentsRoutes from './payments.routes.ts';
import supportRoutes from './support.routes.ts';
import settingsRoutes from './settings.routes.ts';
import ownerRoutes from './owner.routes.ts';

const router = Router();

router.use('/admin/auth', authRoutes);
router.use('/admin/dashboard', dashboardRoutes);
router.use('/admin/shops', shopsRoutes);
router.use('/admin/plans', plansRoutes);
router.use('/admin/subscriptions', subscriptionsRoutes);
router.use('/admin/payments', paymentsRoutes);
router.use('/admin/support', supportRoutes);
router.use('/admin', settingsRoutes);
router.use('/owner', ownerRoutes);

export default router;
