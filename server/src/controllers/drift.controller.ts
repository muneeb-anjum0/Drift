import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { analyzeDriftSchema, saveDriftAnalysisSchema } from '../validators/drift.validator.js';
import { analyzeDrift, deleteDriftAnalysis, getDriftAnalysisById, getProjectDriftAnalyses, saveDriftAnalysis } from '../services/driftDetection.service.js';

export const analyzeDriftController = asyncHandler(async (req: Request, res: Response) => {
  const payload = analyzeDriftSchema.parse(req.body);
  const analysis = await analyzeDrift(req.user!.id, payload);
  res.status(200).json(new ApiResponse('Drift analysis completed', { analysis }));
});

export const saveDriftAnalysisController = asyncHandler(async (req: Request, res: Response) => {
  const payload = saveDriftAnalysisSchema.parse(req.body);
  const analysis = await saveDriftAnalysis(req.user!.id, payload);
  res.status(201).json(new ApiResponse('Drift analysis saved', { analysis }));
});

export const listProjectDriftAnalysesController = asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.params as { projectId: string };
  const analyses = await getProjectDriftAnalyses(projectId, req.user!.id);
  res.status(200).json(new ApiResponse('Drift analyses fetched', { analyses }));
});

export const getDriftAnalysisController = asyncHandler(async (req: Request, res: Response) => {
  const { driftAnalysisId } = req.params as { driftAnalysisId: string };
  const analysis = await getDriftAnalysisById(driftAnalysisId, req.user!.id);
  res.status(200).json(new ApiResponse('Drift analysis fetched', { analysis }));
});

export const deleteDriftAnalysisController = asyncHandler(async (req: Request, res: Response) => {
  const { driftAnalysisId } = req.params as { driftAnalysisId: string };
  await deleteDriftAnalysis(driftAnalysisId, req.user!.id);
  res.status(200).json(new ApiResponse('Drift analysis deleted', {}));
});
