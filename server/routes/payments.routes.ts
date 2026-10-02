import { Router } from 'express';
import {
  getPayments,
  getPaymentDetails,
  recordManualPayment,
  approvePayment,
  rejectPayment,
} from '../controllers/payments.controller.ts';
import { verifyAdminToken } from '../middleware/auth.middleware.ts';

const router = Router();

router.use(verifyAdminToken);

router.get('/', getPayments);
router.get('/:id', getPaymentDetails);
router.post('/manual', recordManualPayment);
router.post('/:id/approve', approvePayment);
router.post('/:id/reject', rejectPayment);

export default router;
