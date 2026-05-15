import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { createProjectController, deleteProjectController, getProjectController, listProjectsController, updateProjectController } from '../controllers/project.controller.js';

export const projectRouter = Router();

projectRouter.use(authMiddleware);
projectRouter.post('/', createProjectController);
projectRouter.get('/', listProjectsController);
projectRouter.get('/:projectId', getProjectController);
projectRouter.patch('/:projectId', updateProjectController);
projectRouter.delete('/:projectId', deleteProjectController);
