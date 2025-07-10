import { Router } from 'express';
import { getTrees } from '@/controllers/tree.controller';

const router = Router();

router.get('/', getTrees);

export default router;
