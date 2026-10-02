import { Router } from 'express';
import {
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  getSubscriptions,
} from '../controllers/plans.controller.ts';
import { verifyAdminToken } from '../middleware/auth.middleware.ts';

const router = Router();

router.use(verifyAdminToken);

router.get('/', getPlans);
router.post('/', createPlan);
router.patch('/:id', updatePlan);
router.delete('/:id', deletePlan);

export default router;
