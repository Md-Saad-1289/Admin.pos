import { Router } from 'express';
import { getSubscriptions } from '../controllers/plans.controller.ts';
import { verifyAdminToken } from '../middleware/auth.middleware.ts';

const router = Router();

router.use(verifyAdminToken);

router.get('/', getSubscriptions);

export default router;
