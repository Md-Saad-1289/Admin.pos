import { Router } from 'express';
import {
  getShops,
  getShopDetails,
  createShop,
  updateShop,
  deleteShop,
  suspendShop,
  activateShop,
  updateShopSubscription,
  addStaff,
  updateStaff,
  deleteStaff,
} from '../controllers/shops.controller.ts';
import { verifyAdminToken } from '../middleware/auth.middleware.ts';

const router = Router();

router.use(verifyAdminToken);

router.get('/', getShops);
router.post('/', createShop);
router.get('/:id', getShopDetails);
router.patch('/:id', updateShop);
router.delete('/:id', deleteShop);
router.post('/:id/suspend', suspendShop);
router.post('/:id/activate', activateShop);
router.post('/:id/subscription', updateShopSubscription);
router.post('/:id/staff', addStaff);
router.patch('/:id/staff/:userId', updateStaff);
router.delete('/:id/staff/:userId', deleteStaff);

export default router;
