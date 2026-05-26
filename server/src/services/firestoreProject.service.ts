import { firestore } from '../config/firebase.js';
import { ApiError } from '../utils/ApiError.js';
import { logActivity } from './activity.service.js';
import { assertWorkspaceAccess } from './firestoreWorkspace.service.js';
import type { FirestoreProject } from './firebaseInit.service.js';

const PROJECTS_COLLECTION = 'projects';

const normalizeProject = (project: FirestoreProject): FirestoreProject => ({
  ...project,
  clientName: project.clientName || 'Client',
  description: project.description || '',
  status: project.status || 'planning',
  priority: project.priority || 'medium',
  originalScope: project.originalScope || '',
  deadline: project.deadline ?? null,
});

const getTimeValue = (value: unknown) => {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().getTime();
  }

  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

export const createProject = async (
  userId: string,
  workspaceId: string,
  data: {
    name: string;
    clientName: string;
    description?: string;
    status?: 'planning' | 'active' | 'paused' | 'completed' | 'archived';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    originalScope?: string;
    deadline?: string;
  }
) => {
  await assertWorkspaceAccess(workspaceId, userId);

  const deadlineDate = data.deadline ? new Date(data.deadline) : null;
  const deadline = deadlineDate && !Number.isNaN(deadlineDate.getTime()) ? deadlineDate : null;

  const now = new Date();
  const projectRef = firestore.collection(PROJECTS_COLLECTION).doc();

  const project: FirestoreProject = {
    _id: projectRef.id,
    workspace: workspaceId,
    name: data.name,
    clientName: data.clientName,
    description: data.description || '',
    status: data.status || 'planning',
    priority: data.priority || 'medium',
    originalScope: data.originalScope || '',
    deadline,
    createdBy: userId,
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

  return normalizeProject(project);
};

export const getProjectById = async (projectId: string, userId: string) => {
  const projectDoc = await firestore.collection(PROJECTS_COLLECTION).doc(projectId).get();

  if (!projectDoc.exists) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projectDoc.data() as FirestoreProject;

  // Check access
  await assertWorkspaceAccess(project.workspace, userId);

  return normalizeProject(project);
};

export const listProjectsByWorkspace = async (workspaceId: string, userId: string) => {
  await assertWorkspaceAccess(workspaceId, userId);

  const projectsQuery = await firestore
    .collection(PROJECTS_COLLECTION)
    .where('workspace', '==', workspaceId)
    .get();

  return projectsQuery.docs
    .map((doc) => normalizeProject(doc.data() as FirestoreProject))
    .sort((left, right) => getTimeValue(right.createdAt) - getTimeValue(left.createdAt));
};

export const updateProject = async (
  projectId: string,
  userId: string,
  data: {
    name?: string;
    clientName?: string;
    description?: string;
    status?: 'planning' | 'active' | 'paused' | 'completed' | 'archived';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    originalScope?: string;
    deadline?: string | null;
  }
) => {
  const project = await getProjectById(projectId, userId);

  const updates: Partial<FirestoreProject> = {
    updatedAt: new Date(),
  };

  if (data.name) updates.name = data.name;
  if (data.clientName) updates.clientName = data.clientName;
  if (data.description !== undefined) updates.description = data.description;
  if (data.status) updates.status = data.status;
  if (data.priority) updates.priority = data.priority;
  if (data.originalScope !== undefined) updates.originalScope = data.originalScope;
  if (data.deadline !== undefined) {
    if (data.deadline === null || data.deadline === '') {
      updates.deadline = null;
    } else {
      const deadlineDate = new Date(data.deadline);
      updates.deadline = Number.isNaN(deadlineDate.getTime()) ? null : deadlineDate;
    }
  }

  await firestore.collection(PROJECTS_COLLECTION).doc(projectId).update(updates);

  const updated = await firestore.collection(PROJECTS_COLLECTION).doc(projectId).get();
  return normalizeProject(updated.data() as FirestoreProject);
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
