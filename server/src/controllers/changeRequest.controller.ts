import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { generateChangeRequestSchema, saveChangeRequestSchema, updateChangeRequestSchema } from '../validators/drift.validator.js';
import * as changeRequestService from '../services/changeRequest.service.js';

// Keep using MongoDB for change requests until Firestore is fully migrated
const crService = changeRequestService;

export const generateChangeRequestController = asyncHandler(async (req: Request, res: Response) => {
  const payload = generateChangeRequestSchema.parse(req.body);
  const changeRequest = await crService.generateChangeRequest(req.user!.id, payload);
  res.status(200).json(new ApiResponse('Change request generated', { changeRequest }));
});

export const saveChangeRequestController = asyncHandler(async (req: Request, res: Response) => {
  const payload = saveChangeRequestSchema.parse(req.body);
  const changeRequest = await crService.saveChangeRequest(req.user!.id, payload);
  res.status(201).json(new ApiResponse('Change request saved', { changeRequest }));
});

export const listProjectChangeRequestsController = asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.params as { projectId: string };
  const changeRequests = await crService.getProjectChangeRequests(projectId, req.user!.id);
  res.status(200).json(new ApiResponse('Change requests fetched', { changeRequests }));
});

export const getChangeRequestController = asyncHandler(async (req: Request, res: Response) => {
  const { changeRequestId } = req.params as { changeRequestId: string };
  const changeRequest = await crService.getChangeRequestById(changeRequestId, req.user!.id);
  res.status(200).json(new ApiResponse('Change request fetched', { changeRequest }));
});

export const updateChangeRequestController = asyncHandler(async (req: Request, res: Response) => {
  const payload = updateChangeRequestSchema.parse(req.body);
  const { changeRequestId } = req.params as { changeRequestId: string };
  const changeRequest = await crService.updateChangeRequest(changeRequestId, req.user!.id, payload);
  res.status(200).json(new ApiResponse('Change request updated', { changeRequest }));
});

export const deleteChangeRequestController = asyncHandler(async (req: Request, res: Response) => {
  const { changeRequestId } = req.params as { changeRequestId: string };
  await crService.deleteChangeRequest(changeRequestId, req.user!.id);
  res.status(200).json(new ApiResponse('Change request deleted', {}));
});
