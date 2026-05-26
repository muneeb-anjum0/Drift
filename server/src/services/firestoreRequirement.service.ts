import { firestore } from '../config/firebase.js';
import { ApiError } from '../utils/ApiError.js';
import { logActivity } from './activity.service.js';
import { getProjectById } from './firestoreProject.service.js';
import { extractRequirementsFromText } from './requirementExtraction.service.js';
import type { FirestoreRequirement, FirestoreRequirementSnapshot, FirestoreRequirementVersion } from './firebaseInit.service.js';

const REQUIREMENTS_COLLECTION = 'requirements';
const REQUIREMENT_VERSIONS_COLLECTION = 'requirementVersions';

const normalizeList = (values: string[] = []) => values.map((value) => value.trim()).filter(Boolean);

const getTimeValue = (value: unknown) => {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().getTime();
  }

  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const toSnapshot = (requirement: FirestoreRequirement): FirestoreRequirementSnapshot => ({
  requirementId: requirement._id,
  title: requirement.title,
  description: requirement.description,
  type: requirement.type,
  priority: requirement.priority,
  status: requirement.status,
  source: requirement.source,
  acceptanceCriteria: requirement.acceptanceCriteria,
  tags: requirement.tags,
  estimatedEffort: requirement.estimatedEffort,
});

export const createRequirement = async (
  userId: string,
  data: {
    projectId: string;
    workspaceId?: string;
    title: string;
    description: string;
    type?: FirestoreRequirement['type'];
    priority?: FirestoreRequirement['priority'];
    status?: FirestoreRequirement['status'];
    source?: FirestoreRequirement['source'];
    sourceText?: string;
    acceptanceCriteria?: string[];
    tags?: string[];
    estimatedEffort?: number;
  }
) => {
  const project = await getProjectById(data.projectId, userId);

  if (data.workspaceId && data.workspaceId !== project.workspace) {
    throw new ApiError(400, 'Workspace does not match the selected project');
  }

  const now = new Date();
  const requirementRef = firestore.collection(REQUIREMENTS_COLLECTION).doc();

  const requirement: FirestoreRequirement = {
    _id: requirementRef.id,
    project: data.projectId,
    workspace: project.workspace,
    title: data.title,
    description: data.description,
    type: data.type || 'functional',
    priority: data.priority || 'medium',
    status: data.status || 'proposed',
    source: data.source || 'manual',
    sourceText: data.sourceText || '',
    acceptanceCriteria: normalizeList(data.acceptanceCriteria),
    tags: normalizeList(data.tags),
    estimatedEffort: data.estimatedEffort ?? null,
    isBaseline: false,
    baselineVersion: 0,
    createdBy: userId,
    updatedBy: userId,
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
    metadata: { title: data.title, projectId: data.projectId },
  });

  return requirement;
};

export const getProjectRequirements = async (projectId: string, userId: string) => {
  const project = await getProjectById(projectId, userId);
  const requirementsQuery = await firestore
    .collection(REQUIREMENTS_COLLECTION)
    .where('project', '==', projectId)
    .get();

  return requirementsQuery.docs
    .map((doc) => doc.data() as FirestoreRequirement)
    .sort((left, right) => getTimeValue(right.createdAt) - getTimeValue(left.createdAt));
};

export const getRequirementById = async (requirementId: string, userId: string) => {
  const reqDoc = await firestore.collection(REQUIREMENTS_COLLECTION).doc(requirementId).get();

  if (!reqDoc.exists) {
    throw new ApiError(404, 'Requirement not found');
  }

  const requirement = reqDoc.data() as FirestoreRequirement;

  await getProjectById(requirement.project, userId);

  return requirement;
};

export const listRequirementsByProject = async (projectId: string, userId: string) => getProjectRequirements(projectId, userId);

export const updateRequirement = async (
  requirementId: string,
  userId: string,
  data: Partial<Pick<FirestoreRequirement, 'title' | 'description' | 'type' | 'priority' | 'status' | 'source' | 'sourceText' | 'acceptanceCriteria' | 'tags' | 'estimatedEffort'>>
) => {
  const requirement = await getRequirementById(requirementId, userId);

  const updates: Partial<FirestoreRequirement> = {
    updatedAt: new Date(),
    updatedBy: userId,
  };

  if (data.title) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.type) updates.type = data.type;
  if (data.priority) updates.priority = data.priority;
  if (data.status) updates.status = data.status;
  if (data.source) updates.source = data.source;
  if (data.sourceText !== undefined) updates.sourceText = data.sourceText;
  if (data.acceptanceCriteria) updates.acceptanceCriteria = normalizeList(data.acceptanceCriteria);
  if (data.tags) updates.tags = normalizeList(data.tags);
  if (typeof data.estimatedEffort === 'number') updates.estimatedEffort = data.estimatedEffort;

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
    metadata: { title: requirement.title, projectId: requirement.project },
  });

  return requirement;
};

export const extractRequirements = async (
  userId: string,
  payload: { projectId: string; sourceText: string; source?: FirestoreRequirement['source'] }
) => {
  const project = await getProjectById(payload.projectId, userId);
  const suggestions = extractRequirementsFromText(payload.sourceText, payload.source || 'original_scope');

  await logActivity({
    workspace: project.workspace,
    user: userId,
    action: 'REQUIREMENTS_EXTRACTED',
    entityType: 'Requirement',
    entityId: payload.projectId,
    metadata: { suggestionCount: suggestions.length },
  });

  return suggestions;
};

export const createRequirementBaseline = async (
  userId: string,
  payload: { projectId: string; label?: string; description?: string }
) => {
  const project = await getProjectById(payload.projectId, userId);
  const requirements = await getProjectRequirements(payload.projectId, userId);

  if (requirements.length === 0) {
    throw new ApiError(400, 'Add requirements before creating a baseline');
  }

  const latestVersionQuery = await firestore
    .collection(REQUIREMENT_VERSIONS_COLLECTION)
    .where('project', '==', payload.projectId)
    .orderBy('versionNumber', 'desc')
    .limit(1)
    .get();

  const latestVersion = latestVersionQuery.empty ? 0 : ((latestVersionQuery.docs[0].data() as FirestoreRequirementVersion).versionNumber || 0);
  const versionNumber = latestVersion + 1;
  const now = new Date();
  const versionRef = firestore.collection(REQUIREMENT_VERSIONS_COLLECTION).doc();

  const version: FirestoreRequirementVersion = {
    _id: versionRef.id,
    project: payload.projectId,
    workspace: project.workspace,
    versionNumber,
    label: payload.label || `Baseline v${versionNumber}`,
    description: payload.description || `Requirement baseline version ${versionNumber}`,
    requirementsSnapshot: requirements.map(toSnapshot),
    createdBy: userId,
    createdAt: now,
  };

  await versionRef.set(version);

  const batch = firestore.batch();
  for (const requirement of requirements) {
    batch.update(firestore.collection(REQUIREMENTS_COLLECTION).doc(requirement._id), {
      isBaseline: true,
      baselineVersion: versionNumber,
      status: requirement.status === 'proposed' ? 'approved' : requirement.status,
      updatedAt: now,
      updatedBy: userId,
    });
  }
  await batch.commit();

  await logActivity({
    workspace: project.workspace,
    user: userId,
    action: 'REQUIREMENT_BASELINE_CREATED',
    entityType: 'RequirementVersion',
    entityId: versionRef.id,
    metadata: { projectId: payload.projectId, versionNumber, requirementCount: requirements.length },
  });

  return version;
};

export const getRequirementVersions = async (projectId: string, userId: string) => {
  await getProjectById(projectId, userId);

  const versionsQuery = await firestore
    .collection(REQUIREMENT_VERSIONS_COLLECTION)
    .where('project', '==', projectId)
    .get();

  return versionsQuery.docs
    .map((doc) => doc.data() as FirestoreRequirementVersion)
    .sort((left, right) => right.versionNumber - left.versionNumber);
};
