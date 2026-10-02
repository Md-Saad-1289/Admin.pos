import { Router } from 'express';
import {
  getSupportTickets,
  getSupportTicketDetails,
  createSupportTicket,
  replySupportTicket,
  updateTicketStatus,
} from '../controllers/support.controller.ts';
import { verifyAdminToken } from '../middleware/auth.middleware.ts';

const router = Router();

router.use(verifyAdminToken);

router.get('/', getSupportTickets);
router.post('/', createSupportTicket);
router.get('/:id', getSupportTicketDetails);
router.post('/:id/reply', replySupportTicket);
router.patch('/:id', updateTicketStatus);

export default router;
