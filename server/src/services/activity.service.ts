import { ActivityLogModel } from '../models/ActivityLog.model.js';

export const logActivity = async (params: {
  workspace: string;
  user: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) => {
  return ActivityLogModel.create(params);
};

export const getActivitiesForUser = async (workspaceIds: string[]) => {
  return ActivityLogModel.find({ workspace: { $in: workspaceIds } })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('workspace', 'name slug')
    .populate('user', 'name email');
};

export const getActivitiesForWorkspace = async (workspaceId: string) => {
  return ActivityLogModel.find({ workspace: workspaceId })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('workspace', 'name slug')
    .populate('user', 'name email');
};
