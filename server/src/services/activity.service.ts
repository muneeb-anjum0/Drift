import { firestore } from '../config/firebase.js';
import { ActivityLogModel } from '../models/ActivityLog.model.js';

const USE_FIRESTORE = process.env.USE_FIRESTORE === 'true';

export const logActivity = async (params: {
  workspace: string;
  user: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) => {
  try {
    if (USE_FIRESTORE) {
      const activityRef = firestore.collection('activities').doc();
      await activityRef.set({
        _id: activityRef.id,
        workspace: params.workspace,
        user: params.user,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata || {},
        createdAt: new Date(),
      });
      return { _id: activityRef.id, ...params };
    }
  } catch (error) {
    console.error('Error logging to Firestore:', error);
  }

  // Fallback to MongoDB
  return ActivityLogModel.create(params);
};

export const getActivitiesForUser = async (workspaceIds: string[]) => {
  if (USE_FIRESTORE) {
    try {
      if (workspaceIds.length === 0) {
        return [];
      }

      const activitiesQuery = await firestore
        .collection('activities')
        .where('workspace', 'in', workspaceIds)
        .limit(50)
        .get();
      return activitiesQuery.docs.map((doc) => doc.data()).sort((left, right) => new Date((right as { createdAt?: unknown }).createdAt as string | number).getTime() - new Date((left as { createdAt?: unknown }).createdAt as string | number).getTime());
    } catch (error) {
      console.error('Error fetching from Firestore:', error);
      return [];
    }
  }

  return ActivityLogModel.find({ workspace: { $in: workspaceIds } })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('workspace', 'name slug')
    .populate('user', 'name email');
};

export const getActivitiesForWorkspace = async (workspaceId: string) => {
  if (USE_FIRESTORE) {
    try {
      const activitiesQuery = await firestore
        .collection('activities')
        .where('workspace', '==', workspaceId)
        .limit(50)
        .get();
      return activitiesQuery.docs.map((doc) => doc.data()).sort((left, right) => new Date((right as { createdAt?: unknown }).createdAt as string | number).getTime() - new Date((left as { createdAt?: unknown }).createdAt as string | number).getTime());
    } catch (error) {
      console.error('Error fetching from Firestore:', error);
      return [];
    }
  }

  return ActivityLogModel.find({ workspace: workspaceId })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('workspace', 'name slug')
    .populate('user', 'name email');
};
