import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { generateChangeRequestSchema, saveChangeRequestSchema, updateChangeRequestSchema } from '../validators/drift.validator.js';
import { deleteChangeRequest, generateChangeRequest, getChangeRequestById, getProjectChangeRequests, saveChangeRequest, updateChangeRequest } from '../services/changeRequest.service.js';

export const generateChangeRequestController = asyncHandler(async (req: Request, res: Response) => {
  const payload = generateChangeRequestSchema.parse(req.body);
  const changeRequest = await generateChangeRequest(req.user!.id, payload);
  res.status(200).json(new ApiResponse('Change request generated', { changeRequest }));
});

export const saveChangeRequestController = asyncHandler(async (req: Request, res: Response) => {
  const payload = saveChangeRequestSchema.parse(req.body);
  const changeRequest = await saveChangeRequest(req.user!.id, payload);
  res.status(201).json(new ApiResponse('Change request saved', { changeRequest }));
});

export const listProjectChangeRequestsController = asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.params as { projectId: string };
  const changeRequests = await getProjectChangeRequests(projectId, req.user!.id);
  res.status(200).json(new ApiResponse('Change requests fetched', { changeRequests }));
});

export const getChangeRequestController = asyncHandler(async (req: Request, res: Response) => {
  const { changeRequestId } = req.params as { changeRequestId: string };
  const changeRequest = await getChangeRequestById(changeRequestId, req.user!.id);
  res.status(200).json(new ApiResponse('Change request fetched', { changeRequest }));
});

export const updateChangeRequestController = asyncHandler(async (req: Request, res: Response) => {
  const payload = updateChangeRequestSchema.parse(req.body);
  const { changeRequestId } = req.params as { changeRequestId: string };
  const changeRequest = await updateChangeRequest(changeRequestId, req.user!.id, payload);
  res.status(200).json(new ApiResponse('Change request updated', { changeRequest }));
});

export const deleteChangeRequestController = asyncHandler(async (req: Request, res: Response) => {
  const { changeRequestId } = req.params as { changeRequestId: string };
  await deleteChangeRequest(changeRequestId, req.user!.id);
  res.status(200).json(new ApiResponse('Change request deleted', {}));
});
