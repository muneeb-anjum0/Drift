import { firestore } from '../config/firebase.js';
import { ApiError } from '../utils/ApiError.js';
import { logActivity } from './activity.service.js';
import { getDriftAnalysisById } from './firestoreDrift.service.js';
import { getProjectById } from './firestoreProject.service.js';
import type { FirestoreChangeRequest } from './firebaseInit.service.js';

const CHANGE_REQUESTS_COLLECTION = 'changeRequests';

export interface ChangeRequestInput {
  driftAnalysis: string;
  title: string;
  description: string;
  estimatedEffort: 'low' | 'medium' | 'high' | 'complex';
  estimatedTimeline: string;
  costImpact: string;
}

export const createChangeRequest = async (userId: string, data: ChangeRequestInput) => {
  const driftAnalysis = await getDriftAnalysisById(data.driftAnalysis, userId);
  const project = await getProjectById(driftAnalysis.project, userId);

  const now = new Date();
  const crRef = firestore.collection(CHANGE_REQUESTS_COLLECTION).doc();

  const changeRequest: FirestoreChangeRequest = {
    _id: crRef.id,
    project: driftAnalysis.project,
    driftAnalysis: data.driftAnalysis,
    title: data.title,
    description: data.description,
    estimatedEffort: data.estimatedEffort,
    estimatedTimeline: data.estimatedTimeline,
    costImpact: data.costImpact,
    status: 'open',
    createdAt: now,
    updatedAt: now,
  };

  await crRef.set(changeRequest);

  await logActivity({
    workspace: project.workspace,
    user: userId,
    action: 'CHANGE_REQUEST_CREATED',
    entityType: 'ChangeRequest',
    entityId: crRef.id,
    metadata: { title: data.title },
  });

  return changeRequest;
};

export const getChangeRequestById = async (crId: string, userId: string) => {
  const docSnapshot = await firestore.collection(CHANGE_REQUESTS_COLLECTION).doc(crId).get();

  if (!docSnapshot.exists) {
    throw new ApiError(404, 'Change request not found');
  }

  const changeRequest = docSnapshot.data() as FirestoreChangeRequest;

  // Verify project access
  await getProjectById(changeRequest.project, userId);

  return changeRequest;
};

export const listChangeRequestsByProject = async (projectId: string, userId: string) => {
  const project = await getProjectById(projectId, userId);

  const crsQuery = await firestore
    .collection(CHANGE_REQUESTS_COLLECTION)
    .where('project', '==', projectId)
    .orderBy('createdAt', 'desc')
    .get();

  return crsQuery.docs.map((doc) => doc.data() as FirestoreChangeRequest);
};

export const updateChangeRequestStatus = async (
  crId: string,
  userId: string,
  status: 'open' | 'approved' | 'in_progress' | 'completed' | 'rejected'
) => {
  const changeRequest = await getChangeRequestById(crId, userId);
  const project = await getProjectById(changeRequest.project, userId);

  await firestore.collection(CHANGE_REQUESTS_COLLECTION).doc(crId).update({
    status,
    updatedAt: new Date(),
  });

  const updated = await firestore.collection(CHANGE_REQUESTS_COLLECTION).doc(crId).get();

  await logActivity({
    workspace: project.workspace,
    user: userId,
    action: 'CHANGE_REQUEST_UPDATED',
    entityType: 'ChangeRequest',
    entityId: crId,
    metadata: { status },
  });

  return updated.data() as FirestoreChangeRequest;
};

export const deleteChangeRequest = async (crId: string, userId: string) => {
  const changeRequest = await getChangeRequestById(crId, userId);
  const project = await getProjectById(changeRequest.project, userId);

  await firestore.collection(CHANGE_REQUESTS_COLLECTION).doc(crId).delete();

  await logActivity({
    workspace: project.workspace,
    user: userId,
    action: 'CHANGE_REQUEST_DELETED',
    entityType: 'ChangeRequest',
    entityId: crId,
    metadata: { title: changeRequest.title },
  });

  return changeRequest;
};
