import { firestore } from '../config/firebase.js';
import { ApiError } from '../utils/ApiError.js';
import { logActivity } from './activity.service.js';
import { assertWorkspaceAccess } from './firestoreWorkspace.service.js';
import type { FirestoreProject } from './firebaseInit.service.js';

const PROJECTS_COLLECTION = 'projects';

export const createProject = async (
  userId: string,
  workspaceId: string,
  data: { name: string; description?: string }
) => {
  await assertWorkspaceAccess(workspaceId, userId);

  const now = new Date();
  const projectRef = firestore.collection(PROJECTS_COLLECTION).doc();

  const project: FirestoreProject = {
    _id: projectRef.id,
    name: data.name,
    description: data.description || '',
    workspace: workspaceId,
    owner: userId,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  await projectRef.set(project);

  await logActivity({
    workspace: workspaceId,
    user: userId,
    action: 'PROJECT_CREATED',
    entityType: 'Project',
    entityId: projectRef.id,
    metadata: { name: data.name },
  });

  return project;
};

export const getProjectById = async (projectId: string, userId: string) => {
  const projectDoc = await firestore.collection(PROJECTS_COLLECTION).doc(projectId).get();

  if (!projectDoc.exists) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projectDoc.data() as FirestoreProject;

  // Check access
  await assertWorkspaceAccess(project.workspace, userId);

  return project;
};

export const listProjectsByWorkspace = async (workspaceId: string, userId: string) => {
  await assertWorkspaceAccess(workspaceId, userId);

  const projectsQuery = await firestore
    .collection(PROJECTS_COLLECTION)
    .where('workspace', '==', workspaceId)
    .orderBy('createdAt', 'desc')
    .get();

  return projectsQuery.docs.map((doc) => doc.data() as FirestoreProject);
};

export const updateProject = async (
  projectId: string,
  userId: string,
  data: { name?: string; description?: string; status?: 'active' | 'archived' | 'completed' }
) => {
  const project = await getProjectById(projectId, userId);

  const updates: Partial<FirestoreProject> = {
    updatedAt: new Date(),
  };

  if (data.name) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;
  if (data.status) updates.status = data.status;

  await firestore.collection(PROJECTS_COLLECTION).doc(projectId).update(updates);

  const updated = await firestore.collection(PROJECTS_COLLECTION).doc(projectId).get();
  return updated.data() as FirestoreProject;
};

export const deleteProject = async (projectId: string, userId: string) => {
  const project = await getProjectById(projectId, userId);

  await firestore.collection(PROJECTS_COLLECTION).doc(projectId).delete();

  await logActivity({
    workspace: project.workspace,
    user: userId,
    action: 'PROJECT_DELETED',
    entityType: 'Project',
    entityId: projectId,
    metadata: { name: project.name },
  });

  return project;
};
