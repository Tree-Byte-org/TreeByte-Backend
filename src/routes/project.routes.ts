import { Router } from 'express';
import { registerProject } from '@/controllers/project.controller';

const router = Router();

router.post('/', registerProject);

export default router;
