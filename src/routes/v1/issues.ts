import { Router } from 'express';
import { createIssue } from '../../controllers/v1/issues';

const router = Router();

router.post('/', createIssue);

export { router as issuesRouter };
