import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import {
  createRequirementBaselineSchema,
  createRequirementSchema,
  extractRequirementsSchema,
  updateRequirementSchema,
} from '../validators/requirement.validator.js';
import {
  createRequirement,
  createRequirementBaseline,
  deleteRequirement,
  extractRequirements,
  getProjectRequirements,
  getRequirementById,
  getRequirementVersions,
  updateRequirement,
} from '../services/requirement.service.js';

export const listProjectRequirementsController = asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.params as { projectId: string };
  const requirements = await getProjectRequirements(projectId, req.user!.id);
  res.status(200).json(new ApiResponse('Requirements fetched', { requirements }));
});

export const getRequirementController = asyncHandler(async (req: Request, res: Response) => {
  const { requirementId } = req.params as { requirementId: string };
  const requirement = await getRequirementById(requirementId, req.user!.id);
  res.status(200).json(new ApiResponse('Requirement fetched', { requirement }));
});

export const createRequirementController = asyncHandler(async (req: Request, res: Response) => {
  const payload = createRequirementSchema.parse(req.body);
  const requirement = await createRequirement(req.user!.id, payload);
  res.status(201).json(new ApiResponse('Requirement created', { requirement }));
});

export const updateRequirementController = asyncHandler(async (req: Request, res: Response) => {
  const payload = updateRequirementSchema.parse(req.body);
  const { requirementId } = req.params as { requirementId: string };
  const requirement = await updateRequirement(requirementId, req.user!.id, payload);
  res.status(200).json(new ApiResponse('Requirement updated', { requirement }));
});

export const deleteRequirementController = asyncHandler(async (req: Request, res: Response) => {
  const { requirementId } = req.params as { requirementId: string };
  await deleteRequirement(requirementId, req.user!.id);
  res.status(200).json(new ApiResponse('Requirement deleted', {}));
});

export const extractRequirementsController = asyncHandler(async (req: Request, res: Response) => {
  const payload = extractRequirementsSchema.parse(req.body);
  const suggestions = await extractRequirements(req.user!.id, payload);
  res.status(200).json(new ApiResponse('Requirements extracted', { suggestions }));
});

export const createRequirementBaselineController = asyncHandler(async (req: Request, res: Response) => {
  const payload = createRequirementBaselineSchema.parse(req.body);
  const version = await createRequirementBaseline(req.user!.id, payload);
  res.status(201).json(new ApiResponse('Requirement baseline created', { version }));
});

export const listRequirementVersionsController = asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.params as { projectId: string };
  const versions = await getRequirementVersions(projectId, req.user!.id);
  res.status(200).json(new ApiResponse('Requirement versions fetched', { versions }));
});
