import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { WorkspaceMemberModel } from '../models/WorkspaceMember.model.js';
import { Types } from 'mongoose';
import { getActivitiesForUser, getActivitiesForWorkspace } from '../services/activity.service.js';

export const listActivitiesController = asyncHandler(async (req: Request, res: Response) => {
  // If req.user.id is not a Mongo ObjectId (e.g. Firebase UID), there are no MongoDB workspace memberships
  let workspaceIds: string[] = [];
  if (req.user && Types.ObjectId.isValid(req.user.id)) {
    const memberships = await WorkspaceMemberModel.find({ user: req.user.id }).select('workspace');
    workspaceIds = memberships.map((member) => member.workspace.toString());
  }
  const activities = await getActivitiesForUser(workspaceIds);
  res.status(200).json(new ApiResponse('Activities fetched', { activities }));
});

export const listWorkspaceActivitiesController = asyncHandler(async (req: Request, res: Response) => {
  const { workspaceId } = req.params as { workspaceId: string };
  const activities = await getActivitiesForWorkspace(workspaceId);
  res.status(200).json(new ApiResponse('Workspace activities fetched', { activities }));
});
