import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import {
  deleteChangeRequestController,
  generateChangeRequestController,
  getChangeRequestController,
  listProjectChangeRequestsController,
  saveChangeRequestController,
  updateChangeRequestController,
} from '../controllers/changeRequest.controller.js';

export const changeRequestRouter = Router();

changeRequestRouter.use(authMiddleware);
changeRequestRouter.post('/generate', generateChangeRequestController);
changeRequestRouter.post('/', saveChangeRequestController);
changeRequestRouter.get('/project/:projectId', listProjectChangeRequestsController);
changeRequestRouter.get('/:changeRequestId', getChangeRequestController);
changeRequestRouter.patch('/:changeRequestId', updateChangeRequestController);
changeRequestRouter.delete('/:changeRequestId', deleteChangeRequestController);
