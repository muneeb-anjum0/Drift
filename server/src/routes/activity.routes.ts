import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { listActivitiesController, listWorkspaceActivitiesController } from '../controllers/activity.controller.js';

export const activityRouter = Router();

activityRouter.use(authMiddleware);
activityRouter.get('/', listActivitiesController);
activityRouter.get('/:workspaceId', listWorkspaceActivitiesController);
