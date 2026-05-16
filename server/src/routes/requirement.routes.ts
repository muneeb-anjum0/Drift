import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import {
  createRequirementBaselineController,
  createRequirementController,
  deleteRequirementController,
  extractRequirementsController,
  getRequirementController,
  listProjectRequirementsController,
  listRequirementVersionsController,
  updateRequirementController,
} from '../controllers/requirement.controller.js';

export const requirementRouter = Router();

requirementRouter.use(authMiddleware);
requirementRouter.post('/extract', extractRequirementsController);
requirementRouter.post('/baseline', createRequirementBaselineController);
requirementRouter.get('/versions/:projectId', listRequirementVersionsController);
requirementRouter.get('/project/:projectId', listProjectRequirementsController);
requirementRouter.post('/', createRequirementController);
requirementRouter.get('/:requirementId', getRequirementController);
requirementRouter.patch('/:requirementId', updateRequirementController);
requirementRouter.delete('/:requirementId', deleteRequirementController);
