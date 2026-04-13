import express, { Router } from 'express';
import { collinsHello } from '../controllers/collins.controller';

const router: Router = express.Router();

router.get('/hello/collins', collinsHello);

export default router;
