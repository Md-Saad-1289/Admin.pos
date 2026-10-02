import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  getTeam,
  addTeamMember,
  deleteTeamMember,
  getAuditLogs,
} from '../controllers/settings.controller.ts';
import { verifyAdminToken } from '../middleware/auth.middleware.ts';

const router = Router();

router.use(verifyAdminToken);

router.get('/settings', getSettings);
router.patch('/settings', updateSettings);
router.get('/team', getTeam);
router.post('/team', addTeamMember);
router.delete('/team/:id', deleteTeamMember);
router.get('/audit-logs', getAuditLogs);

export default router;
