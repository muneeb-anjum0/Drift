import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { createWorkspaceSchema, updateWorkspaceSchema } from '../validators/workspace.validator.js';
import { createWorkspace, deleteWorkspace, getUserWorkspaces, getWorkspaceById, updateWorkspace } from '../services/workspace.service.js';

export const createWorkspaceController = asyncHandler(async (req: Request, res: Response) => {
  const payload = createWorkspaceSchema.parse(req.body);
  const workspace = await createWorkspace(req.user!.id, payload.name, payload.description);
  res.status(201).json(new ApiResponse('Workspace created', { workspace }));
});

export const listWorkspacesController = asyncHandler(async (req: Request, res: Response) => {
  const workspaces = await getUserWorkspaces(req.user!.id);
  res.status(200).json(new ApiResponse('Workspaces fetched', { workspaces }));
});

export const getWorkspaceController = asyncHandler(async (req: Request, res: Response) => {
  const { workspaceId } = req.params as { workspaceId: string };
  const workspace = await getWorkspaceById(workspaceId, req.user!.id);
  res.status(200).json(new ApiResponse('Workspace fetched', { workspace }));
});

export const updateWorkspaceController = asyncHandler(async (req: Request, res: Response) => {
  const payload = updateWorkspaceSchema.parse(req.body);
  const { workspaceId } = req.params as { workspaceId: string };
  const workspace = await updateWorkspace(workspaceId, req.user!.id, payload);
  res.status(200).json(new ApiResponse('Workspace updated', { workspace }));
});

export const deleteWorkspaceController = asyncHandler(async (req: Request, res: Response) => {
  const { workspaceId } = req.params as { workspaceId: string };
  await deleteWorkspace(workspaceId, req.user!.id);
  res.status(200).json(new ApiResponse('Workspace deleted', {}));
});
