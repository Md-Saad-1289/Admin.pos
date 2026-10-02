import { Router } from 'express';
import {
  login,
  getMe,
  logout,
  updateProfile,
  changePassword,
} from '../controllers/auth.controller.ts';
import { verifyAdminToken } from '../middleware/auth.middleware.ts';

const router = Router();

router.post('/login', login);
router.get('/me', verifyAdminToken, getMe);
router.post('/logout', verifyAdminToken, logout);
router.patch('/update-profile', verifyAdminToken, updateProfile);
router.post('/change-password', verifyAdminToken, changePassword);

export default router;
