import { Router } from 'express';
import {
  createIssue,
  deleteIssue,
  getIssueById,
  listIssues,
  updateIssue,
} from '../../controllers/v1/issues';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import { USER_ROLES } from '../../types/auth';

const router = Router();

// Public bug report intake (Sprint 3).
router.post('/', createIssue);

// Admin-gated bug-tracker queue (Sprint 4 / S4-00, S4-01).
// `requireRole(USER_ROLES.admin)` uses `hasRoleAtLeast`, so Admin, SuperAdmin,
// and Owner all pass while User and Moderator are rejected with 403.
router.get('/', requireAuth, requireRole(USER_ROLES.admin), listIssues);
router.get('/:id', requireAuth, requireRole(USER_ROLES.admin), getIssueById);
router.patch('/:id', requireAuth, requireRole(USER_ROLES.admin), updateIssue);
router.delete('/:id', requireAuth, requireRole(USER_ROLES.admin), deleteIssue);

export { router as issuesRouter };
