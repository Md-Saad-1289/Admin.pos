import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboard.controller.ts';
import { verifyAdminToken } from '../middleware/auth.middleware.ts';

const router = Router();

router.get('/', verifyAdminToken, getDashboardStats);

export default router;
