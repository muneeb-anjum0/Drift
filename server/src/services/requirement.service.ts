import { Types } from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { ProjectModel } from '../models/Project.model.js';
import { WorkspaceMemberModel } from '../models/WorkspaceMember.model.js';
import { RequirementModel } from '../models/Requirement.model.js';
import { RequirementVersionModel } from '../models/RequirementVersion.model.js';
import { logActivity } from './activity.service.js';
import { extractRequirementsFromText } from './requirementExtraction.service.js';

const ensureProjectAccess = async (projectId: string, userId: string) => {
  if (!Types.ObjectId.isValid(projectId)) {
    throw new ApiError(400, 'Invalid project id');
  }

  const project = await ProjectModel.findById(projectId);
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  const member = await WorkspaceMemberModel.findOne({ workspace: project.workspace, user: userId });
  if (!member) {
    throw new ApiError(403, 'You do not have access to this project');
  }

  return project;
};

const ensureRequirementAccess = async (requirementId: string, userId: string) => {
  if (!Types.ObjectId.isValid(requirementId)) {
    throw new ApiError(400, 'Invalid requirement id');
  }

  const requirement = await RequirementModel.findById(requirementId);
  if (!requirement) {
    throw new ApiError(404, 'Requirement not found');
  }

  const member = await WorkspaceMemberModel.findOne({ workspace: requirement.workspace, user: userId });
  if (!member) {
    throw new ApiError(403, 'You do not have access to this requirement');
  }

  return requirement;
};

const populateRequirement = (query: ReturnType<typeof RequirementModel.findById>) =>
  query
    .populate('project', 'name clientName status priority originalScope')
    .populate('workspace', 'name slug')
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

type RequirementSnapshotSource = {
  _id: { toString: () => string };
  title: string;
  description: string;
  type: 'functional' | 'non_functional' | 'business' | 'technical' | 'ui_ux' | 'security' | 'performance' | 'integration' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'proposed' | 'approved' | 'in_progress' | 'completed' | 'rejected' | 'changed';
  source: 'original_scope' | 'manual' | 'client_message' | 'meeting_note' | 'document' | 'ai_extracted';
  acceptanceCriteria: string[];
  tags: string[];
  estimatedEffort?: number | null;
};

const toRequirementSnapshot = (requirement: RequirementSnapshotSource) => ({
  requirementId: requirement._id.toString(),
  title: requirement.title,
  description: requirement.description,
  type: requirement.type,
  priority: requirement.priority,
  status: requirement.status,
  source: requirement.source,
  acceptanceCriteria: [...requirement.acceptanceCriteria],
  tags: [...requirement.tags],
  estimatedEffort: requirement.estimatedEffort,
});

export const getProjectRequirements = async (projectId: string, userId: string) => {
  await ensureProjectAccess(projectId, userId);

  const requirements = await RequirementModel.find({ project: projectId })
    .sort({ isBaseline: -1, baselineVersion: -1, createdAt: -1 })
    .populate('project', 'name clientName status priority originalScope')
    .populate('workspace', 'name slug')
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

  return requirements;
};

export const getRequirementById = async (requirementId: string, userId: string) => {
  const requirement = await ensureRequirementAccess(requirementId, userId);
  return populateRequirement(RequirementModel.findById(requirement._id));
};

export const createRequirement = async (userId: string, data: {
  projectId: string;
  workspaceId?: string;
  title: string;
  description: string;
  type?: 'functional' | 'non_functional' | 'business' | 'technical' | 'ui_ux' | 'security' | 'performance' | 'integration' | 'other';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'proposed' | 'approved' | 'in_progress' | 'completed' | 'rejected' | 'changed';
  source?: 'original_scope' | 'manual' | 'client_message' | 'meeting_note' | 'document' | 'ai_extracted';
  sourceText?: string;
  acceptanceCriteria?: string[];
  tags?: string[];
  estimatedEffort?: number;
}) => {
  const project = await ensureProjectAccess(data.projectId, userId);

  const requirement = await RequirementModel.create({
    project: project._id,
    workspace: project.workspace,
    title: data.title,
    description: data.description,
    type: data.type ?? 'functional',
    priority: data.priority ?? 'medium',
    status: data.status ?? 'proposed',
    source: data.source ?? 'manual',
    sourceText: data.sourceText ?? '',
    acceptanceCriteria: data.acceptanceCriteria ?? [],
    tags: data.tags ?? [],
    estimatedEffort: data.estimatedEffort,
    createdBy: userId,
  });

  await logActivity({
    workspace: project.workspace.toString(),
    user: userId,
    action: 'REQUIREMENT_CREATED',
    entityType: 'Requirement',
    entityId: requirement._id.toString(),
    metadata: {
      requirementTitle: requirement.title,
      projectId: project._id.toString(),
      projectName: project.name,
    },
  });

  return populateRequirement(RequirementModel.findById(requirement._id));
};

export const updateRequirement = async (requirementId: string, userId: string, data: {
  title?: string;
  description?: string;
  type?: 'functional' | 'non_functional' | 'business' | 'technical' | 'ui_ux' | 'security' | 'performance' | 'integration' | 'other';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'proposed' | 'approved' | 'in_progress' | 'completed' | 'rejected' | 'changed';
  source?: 'original_scope' | 'manual' | 'client_message' | 'meeting_note' | 'document' | 'ai_extracted';
  sourceText?: string;
  acceptanceCriteria?: string[];
  tags?: string[];
  estimatedEffort?: number;
}) => {
  const requirement = await ensureRequirementAccess(requirementId, userId);

  if (data.title !== undefined) requirement.title = data.title;
  if (data.description !== undefined) requirement.description = data.description;
  if (data.type !== undefined) requirement.type = data.type;
  if (data.priority !== undefined) requirement.priority = data.priority;
  if (data.status !== undefined) requirement.status = data.status;
  if (data.source !== undefined) requirement.source = data.source;
  if (data.sourceText !== undefined) requirement.sourceText = data.sourceText;
  if (data.acceptanceCriteria !== undefined) requirement.acceptanceCriteria = data.acceptanceCriteria;
  if (data.tags !== undefined) requirement.tags = data.tags;
  if (data.estimatedEffort !== undefined) requirement.estimatedEffort = data.estimatedEffort;
  requirement.updatedBy = new Types.ObjectId(userId);

  await requirement.save();

  await logActivity({
    workspace: requirement.workspace.toString(),
    user: userId,
    action: 'REQUIREMENT_UPDATED',
    entityType: 'Requirement',
    entityId: requirement._id.toString(),
    metadata: {
      requirementTitle: requirement.title,
      projectId: requirement.project.toString(),
      requirementId: requirement._id.toString(),
    },
  });

  return populateRequirement(RequirementModel.findById(requirement._id));
};

export const deleteRequirement = async (requirementId: string, userId: string) => {
  const requirement = await ensureRequirementAccess(requirementId, userId);

  await RequirementModel.findByIdAndDelete(requirementId);

  await logActivity({
    workspace: requirement.workspace.toString(),
    user: userId,
    action: 'REQUIREMENT_DELETED',
    entityType: 'Requirement',
    entityId: requirementId,
    metadata: {
      requirementTitle: requirement.title,
      projectId: requirement.project.toString(),
    },
  });

  return requirement;
};

export const extractRequirements = async (userId: string, data: {
  projectId: string;
  sourceText: string;
  source?: 'original_scope' | 'manual' | 'client_message' | 'meeting_note' | 'document' | 'ai_extracted';
}) => {
  const project = await ensureProjectAccess(data.projectId, userId);
  const suggestions = extractRequirementsFromText(data.sourceText, data.source ?? 'original_scope');

  await logActivity({
    workspace: project.workspace.toString(),
    user: userId,
    action: 'REQUIREMENTS_EXTRACTED',
    entityType: 'Project',
    entityId: project._id.toString(),
    metadata: {
      projectId: project._id.toString(),
      projectName: project.name,
      source: data.source ?? 'original_scope',
      extractedCount: suggestions.length,
    },
  });

  return suggestions;
};

export const createRequirementBaseline = async (userId: string, data: {
  projectId: string;
  label?: string;
  description?: string;
}) => {
  const project = await ensureProjectAccess(data.projectId, userId);
  const requirements = await RequirementModel.find({ project: project._id }).sort({ createdAt: 1 });

  if (requirements.length === 0) {
    throw new ApiError(400, 'Create at least one requirement before building a baseline');
  }

  const latestVersion = await RequirementVersionModel.findOne({ project: project._id }).sort({ versionNumber: -1 });
  const versionNumber = (latestVersion?.versionNumber ?? 0) + 1;

  const version = await RequirementVersionModel.create({
    project: project._id,
    workspace: project.workspace,
    versionNumber,
    label: data.label?.trim() || (versionNumber === 1 ? 'Initial Baseline' : 'Manual Update'),
    description: data.description?.trim() ?? '',
      requirementsSnapshot: requirements.map((requirement) => toRequirementSnapshot(requirement)),
    createdBy: userId,
  });

  await RequirementModel.updateMany(
    { project: project._id },
    { $set: { isBaseline: true, baselineVersion: versionNumber } }
  );

  await logActivity({
    workspace: project.workspace.toString(),
    user: userId,
    action: 'REQUIREMENT_BASELINE_CREATED',
    entityType: 'RequirementVersion',
    entityId: version._id.toString(),
    metadata: {
      projectId: project._id.toString(),
      projectName: project.name,
      versionNumber,
      requirementCount: requirements.length,
    },
  });

  return RequirementVersionModel.findById(version._id).populate('createdBy', 'name email');
};

export const getRequirementVersions = async (projectId: string, userId: string) => {
  await ensureProjectAccess(projectId, userId);

  return RequirementVersionModel.find({ project: projectId })
    .sort({ versionNumber: -1 })
    .populate('createdBy', 'name email');
};
