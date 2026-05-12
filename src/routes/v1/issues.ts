import { Router } from 'express';
import {
  createIssue,
  deleteIssue,
  getIssueById,
  listIssues,
  updateIssue,
} from '../../controllers/v1/issues';
import { requireAuth } from '../../middleware/requireAuth';
import { requireLocalRole } from '../../middleware/requireLocalRole';

const router = Router();

// Public bug report intake (Sprint 3).
router.post('/', createIssue);

// Admin-gated bug-tracker queue (Sprint 4 / S4-00, S4-01).
// Auth2 token verifies identity; local DB role (`User.role`) determines admin access.
router.get('/', requireAuth, requireLocalRole('admin'), listIssues);
router.get('/:id', requireAuth, requireLocalRole('admin'), getIssueById);
router.patch('/:id', requireAuth, requireLocalRole('admin'), updateIssue);
router.delete('/:id', requireAuth, requireLocalRole('admin'), deleteIssue);

export { router as issuesRouter };
