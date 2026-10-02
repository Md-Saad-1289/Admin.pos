import { Router } from 'express';
import {
  ownerLogin,
  getOwnerStatus,
  submitOwnerPayment,
  ownerPosCheckout,
} from '../controllers/owner.controller.ts';
import { verifyOwnerToken } from '../middleware/auth.middleware.ts';

const router = Router();

router.post('/auth/login', ownerLogin);
router.get('/status', verifyOwnerToken, getOwnerStatus);
router.post('/payments/submit', verifyOwnerToken, submitOwnerPayment);
router.post('/pos/checkout', verifyOwnerToken, ownerPosCheckout);

export default router;
