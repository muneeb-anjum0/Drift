import { firestore } from '../config/firebase.js';
import { ApiError } from '../utils/ApiError.js';
import { logActivity } from './activity.service.js';
import type { FirestoreWorkspace } from './firebaseInit.service.js';

const WORKSPACES_COLLECTION = 'workspaces';
const WORKSPACE_MEMBERS_COLLECTION = 'workspaceMembers';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const makeUniqueSlug = async (name: string) => {
  const baseSlug = slugify(name) || 'workspace';
  const query = await firestore
    .collection(WORKSPACES_COLLECTION)
    .where('slug', '>=', baseSlug)
    .where('slug', '<', baseSlug + '~')
    .get();

  return query.empty ? baseSlug : `${baseSlug}-${query.size + 1}`;
};

const ensureWorkspaceAccess = async (workspaceId: string, userId: string) => {
  const memberQuery = await firestore
    .collection(WORKSPACE_MEMBERS_COLLECTION)
    .where('workspace', '==', workspaceId)
    .where('user', '==', userId)
    .limit(1)
    .get();

  if (memberQuery.empty) {
    throw new ApiError(403, 'You do not have access to this workspace');
  }

  const member = memberQuery.docs[0].data();
  return member;
};

export const createDefaultWorkspace = async (userId: string, userName: string) => {
  const workspaceName = `${userName.split(' ')[0] || 'My'} Workspace`;
  const slug = await makeUniqueSlug(workspaceName);
  const now = new Date();

  const workspaceRef = firestore.collection(WORKSPACES_COLLECTION).doc();
  const workspace: FirestoreWorkspace = {
    _id: workspaceRef.id,
    name: workspaceName,
    description: 'Default workspace created during onboarding',
    owner: userId,
    members: [userId],
    createdAt: now,
    updatedAt: now,
  };

  await workspaceRef.set(workspace);

  // Add workspace member
  await firestore.collection(WORKSPACE_MEMBERS_COLLECTION).add({
    workspace: workspaceRef.id,
    user: userId,
    role: 'owner',
    joinedAt: now,
  });

  // Log activity
  await logActivity({
    workspace: workspaceRef.id,
    user: userId,
    action: 'WORKSPACE_CREATED',
    entityType: 'Workspace',
    entityId: workspaceRef.id,
    metadata: { source: 'default-workspace' },
  });

  return workspace;
};

export const createWorkspace = async (userId: string, name: string, description = '') => {
  const slug = await makeUniqueSlug(name);
  const now = new Date();

  const workspaceRef = firestore.collection(WORKSPACES_COLLECTION).doc();
  const workspace: FirestoreWorkspace = {
    _id: workspaceRef.id,
    name,
    description,
    owner: userId,
    members: [userId],
    createdAt: now,
    updatedAt: now,
  };

  await workspaceRef.set(workspace);

  // Add workspace member
  await firestore.collection(WORKSPACE_MEMBERS_COLLECTION).add({
    workspace: workspaceRef.id,
    user: userId,
    role: 'owner',
    joinedAt: now,
  });

  // Log activity
  await logActivity({
    workspace: workspaceRef.id,
    user: userId,
    action: 'WORKSPACE_CREATED',
    entityType: 'Workspace',
    entityId: workspaceRef.id,
    metadata: { name },
  });

  return workspace;
};

export const getUserWorkspaces = async (userId: string) => {
  const memberQuery = await firestore
    .collection(WORKSPACE_MEMBERS_COLLECTION)
    .where('user', '==', userId)
    .get();

  const workspaces: FirestoreWorkspace[] = [];
  for (const doc of memberQuery.docs) {
    const member = doc.data();
    const workspaceDoc = await firestore.collection(WORKSPACES_COLLECTION).doc(member.workspace).get();
    if (workspaceDoc.exists) {
      workspaces.push(workspaceDoc.data() as FirestoreWorkspace);
    }
  }

  return workspaces;
};

export const getWorkspaceById = async (workspaceId: string, userId: string) => {
  await ensureWorkspaceAccess(workspaceId, userId);

  const workspaceDoc = await firestore.collection(WORKSPACES_COLLECTION).doc(workspaceId).get();

  if (!workspaceDoc.exists) {
    throw new ApiError(404, 'Workspace not found');
  }

  return workspaceDoc.data() as FirestoreWorkspace;
};

export const updateWorkspace = async (workspaceId: string, userId: string, data: { name?: string; description?: string }) => {
  await ensureWorkspaceAccess(workspaceId, userId);

  const workspaceDoc = await firestore.collection(WORKSPACES_COLLECTION).doc(workspaceId).get();

  if (!workspaceDoc.exists) {
    throw new ApiError(404, 'Workspace not found');
  }

  const updates: Partial<FirestoreWorkspace> = {
    updatedAt: new Date(),
  };

  if (data.name) {
    updates.name = data.name;
  }

  if (typeof data.description === 'string') {
    updates.description = data.description;
  }

  await firestore.collection(WORKSPACES_COLLECTION).doc(workspaceId).update(updates);

  const updated = await firestore.collection(WORKSPACES_COLLECTION).doc(workspaceId).get();
  return updated.data() as FirestoreWorkspace;
};

export const deleteWorkspace = async (workspaceId: string, userId: string) => {
  await ensureWorkspaceAccess(workspaceId, userId);

  const workspaceDoc = await firestore.collection(WORKSPACES_COLLECTION).doc(workspaceId).get();

  if (!workspaceDoc.exists) {
    throw new ApiError(404, 'Workspace not found');
  }

  const workspace = workspaceDoc.data() as FirestoreWorkspace;

  // Delete members
  const membersQuery = await firestore.collection(WORKSPACE_MEMBERS_COLLECTION).where('workspace', '==', workspaceId).get();
  const batch = firestore.batch();

  for (const doc of membersQuery.docs) {
    batch.delete(doc.ref);
  }

  batch.delete(workspaceDoc.ref);
  await batch.commit();

  // Log activity
  await logActivity({
    workspace: workspaceId,
    user: userId,
    action: 'WORKSPACE_DELETED',
    entityType: 'Workspace',
    entityId: workspaceId,
    metadata: { name: workspace.name },
  });

  return workspace;
};

export const assertWorkspaceAccess = ensureWorkspaceAccess;
