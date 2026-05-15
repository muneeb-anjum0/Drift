import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { createWorkspaceController, deleteWorkspaceController, getWorkspaceController, listWorkspacesController, updateWorkspaceController } from '../controllers/workspace.controller.js';

export const workspaceRouter = Router();

workspaceRouter.use(authMiddleware);
workspaceRouter.post('/', createWorkspaceController);
workspaceRouter.get('/', listWorkspacesController);
workspaceRouter.get('/:workspaceId', getWorkspaceController);
workspaceRouter.patch('/:workspaceId', updateWorkspaceController);
workspaceRouter.delete('/:workspaceId', deleteWorkspaceController);
