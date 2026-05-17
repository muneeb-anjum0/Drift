import { firestore } from '../config/firebase.js';
import type { FirestoreActivity } from './firebaseInit.service.js';

const ACTIVITIES_COLLECTION = 'activities';

export interface ActivityData {
  workspace: string;
  user: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
}

export const logFirestoreActivity = async (data: ActivityData) => {
  try {
    const activityRef = firestore.collection(ACTIVITIES_COLLECTION).doc();
    const activity: FirestoreActivity = {
      _id: activityRef.id,
      workspace: data.workspace,
      user: data.user,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      metadata: data.metadata || {},
      createdAt: new Date(),
    };

    await activityRef.set(activity);
    return activity;
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw - activity logging should not break the main flow
  }
};

export const getWorkspaceActivities = async (workspaceId: string, limit = 50) => {
  try {
    const activitiesQuery = await firestore
      .collection(ACTIVITIES_COLLECTION)
      .where('workspace', '==', workspaceId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return activitiesQuery.docs.map((doc) => doc.data() as FirestoreActivity);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return [];
  }
};

export const getUserActivities = async (userId: string, limit = 50) => {
  try {
    const activitiesQuery = await firestore
      .collection(ACTIVITIES_COLLECTION)
      .where('user', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return activitiesQuery.docs.map((doc) => doc.data() as FirestoreActivity);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return [];
  }
};
