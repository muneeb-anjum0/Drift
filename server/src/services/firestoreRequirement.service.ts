import { firestore } from '../config/firebase.js';
import { ApiError } from '../utils/ApiError.js';
import { logActivity } from './activity.service.js';
import { getProjectById } from './firestoreProject.service.js';
import type { FirestoreRequirement } from './firebaseInit.service.js';

const REQUIREMENTS_COLLECTION = 'requirements';

export const createRequirement = async (
  userId: string,
  projectId: string,
  data: { title: string; description: string; tags?: string[] }
) => {
  const project = await getProjectById(projectId, userId);

  const now = new Date();
  const requirementRef = firestore.collection(REQUIREMENTS_COLLECTION).doc();

  const requirement: FirestoreRequirement = {
    _id: requirementRef.id,
    project: projectId,
    title: data.title,
    description: data.description,
    status: 'active',
    version: 1,
    tags: data.tags || [],
    createdAt: now,
    updatedAt: now,
  };

  await requirementRef.set(requirement);

  await logActivity({
    workspace: project.workspace,
    user: userId,
    action: 'REQUIREMENT_CREATED',
    entityType: 'Requirement',
    entityId: requirementRef.id,
    metadata: { title: data.title },
  });

  return requirement;
};

export const getRequirementById = async (requirementId: string, userId: string) => {
  const reqDoc = await firestore.collection(REQUIREMENTS_COLLECTION).doc(requirementId).get();

  if (!reqDoc.exists) {
    throw new ApiError(404, 'Requirement not found');
  }

  const requirement = reqDoc.data() as FirestoreRequirement;

  // Verify project access
  await getProjectById(requirement.project, userId);

  return requirement;
};

export const listRequirementsByProject = async (projectId: string, userId: string) => {
  const project = await getProjectById(projectId, userId);

  const reqsQuery = await firestore
    .collection(REQUIREMENTS_COLLECTION)
    .where('project', '==', projectId)
    .orderBy('createdAt', 'desc')
    .get();

  return reqsQuery.docs.map((doc) => doc.data() as FirestoreRequirement);
};

export const updateRequirement = async (
  requirementId: string,
  userId: string,
  data: { title?: string; description?: string; status?: 'active' | 'deprecated' | 'replaced'; tags?: string[] }
) => {
  const requirement = await getRequirementById(requirementId, userId);

  const updates: Partial<FirestoreRequirement> = {
    updatedAt: new Date(),
  };

  if (data.title) updates.title = data.title;
  if (data.description) updates.description = data.description;
  if (data.status) updates.status = data.status;
  if (data.tags) updates.tags = data.tags;

  await firestore.collection(REQUIREMENTS_COLLECTION).doc(requirementId).update(updates);

  const updated = await firestore.collection(REQUIREMENTS_COLLECTION).doc(requirementId).get();
  return updated.data() as FirestoreRequirement;
};

export const deleteRequirement = async (requirementId: string, userId: string) => {
  const requirement = await getRequirementById(requirementId, userId);
  const project = await getProjectById(requirement.project, userId);

  await firestore.collection(REQUIREMENTS_COLLECTION).doc(requirementId).delete();

  await logActivity({
    workspace: project.workspace,
    user: userId,
    action: 'REQUIREMENT_DELETED',
    entityType: 'Requirement',
    entityId: requirementId,
    metadata: { title: requirement.title },
  });

  return requirement;
};
