import { Router } from 'express';
import {
  registerProjectController,
  getProjectByIdController,
  getAllProjectsController,
  getPaginatedProjectsController,
} from '@/controllers/project.controller';

const router = Router();

router.post('/register', registerProjectController);
router.post('/', registerProjectController);
router.get('/', getAllProjectsController);
router.get('/paginated', getPaginatedProjectsController);
router.get('/:id', getProjectByIdController);

export default router;
