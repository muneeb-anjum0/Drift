import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import {
  analyzeDriftController,
  deleteDriftAnalysisController,
  getDriftAnalysisController,
  listProjectDriftAnalysesController,
  saveDriftAnalysisController,
} from '../controllers/drift.controller.js';

export const driftRouter = Router();

driftRouter.use(authMiddleware);
driftRouter.post('/analyze', analyzeDriftController);
driftRouter.post('/save', saveDriftAnalysisController);
driftRouter.get('/project/:projectId', listProjectDriftAnalysesController);
driftRouter.get('/:driftAnalysisId', getDriftAnalysisController);
driftRouter.delete('/:driftAnalysisId', deleteDriftAnalysisController);
