import { Types } from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { ProjectModel } from '../models/Project.model.js';
import { WorkspaceMemberModel } from '../models/WorkspaceMember.model.js';
import { DriftAnalysisModel } from '../models/DriftAnalysis.model.js';
import { ChangeRequestModel } from '../models/ChangeRequest.model.js';
import { logActivity } from './activity.service.js';
import { generateChangeRequestWithOllama } from './ollama.service.js';
import type { ChangeRequestChange, DriftAnalysisPreview } from '../types/drift.js';

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

const ensureChangeRequestAccess = async (changeRequestId: string, userId: string) => {
  if (!Types.ObjectId.isValid(changeRequestId)) {
    throw new ApiError(400, 'Invalid change request id');
  }

  const changeRequest = await ChangeRequestModel.findById(changeRequestId);
  if (!changeRequest) {
    throw new ApiError(404, 'Change request not found');
  }

  const member = await WorkspaceMemberModel.findOne({ workspace: changeRequest.workspace, user: userId });
  if (!member) {
    throw new ApiError(403, 'You do not have access to this change request');
  }

  return changeRequest;
};

const buildTimelineImpact = (riskLevel: DriftAnalysisPreview['riskLevel']) => {
  if (riskLevel === 'low') return 'Minimal timeline impact expected.';
  if (riskLevel === 'medium') return 'Moderate timeline impact expected. Additional planning and implementation time may be required.';
  if (riskLevel === 'high') return 'Significant timeline impact expected. The delivery schedule should be reviewed before work continues.';
  return 'Major timeline impact expected. The current delivery plan may no longer be valid without formal scope approval.';
};

const buildCostImpact = (estimatedExtraHours: number, riskLevel: DriftAnalysisPreview['riskLevel']) => {
  if (estimatedExtraHours <= 0) return 'No additional cost impact identified yet.';
  if (riskLevel === 'low') return `Low cost impact expected. Approximately ${estimatedExtraHours} extra hours may be required.`;
  if (riskLevel === 'medium') return `Moderate cost impact expected. Approximately ${estimatedExtraHours} extra hours may be required.`;
  if (riskLevel === 'high') return `High cost impact expected. Approximately ${estimatedExtraHours} extra hours may be required.`;
  return `Critical cost impact expected. Approximately ${estimatedExtraHours} extra hours may be required.`;
};

const buildBusinessReason = (projectName: string) =>
  `The latest client request introduces new or modified requirements for ${projectName}. These changes differ from the approved baseline and may affect delivery timeline, implementation effort, and original scope.`;

const buildApprovalNote = () =>
  'Please review and approve this change request before implementation begins. Approval confirms that the listed changes are accepted as an expansion or modification of the original scope.';

const buildDraft = (analysis: DriftAnalysisPreview, projectName: string, clientName?: string) => {
  const requestedChanges: ChangeRequestChange[] = analysis.detectedChanges
    .filter((change) => change.changeType !== 'unchanged')
    .map((change) => ({
      title: change.title,
      description: change.description,
      changeType: change.changeType === 'unchanged' ? 'modified' : change.changeType,
      impact: change.impact,
      estimatedEffort: change.estimatedEffort,
    }));

  const title = `Change Request: Additional Scope Detected for ${projectName}`;
  return {
    projectId: analysis.projectId,
    workspaceId: analysis.workspaceId,
    driftAnalysisId: analysis.baselineVersionId,
    title,
    clientName: clientName ?? '',
    summary: `The latest client request introduces new or modified requirements that differ from the approved baseline. These changes may affect delivery timeline, implementation effort, and original scope.`,
    changesRequested: requestedChanges,
    businessReason: buildBusinessReason(projectName),
    timelineImpact: buildTimelineImpact(analysis.riskLevel),
    costImpact: buildCostImpact(analysis.estimatedExtraHours, analysis.riskLevel),
    recommendedAction: 'Review the drift analysis, confirm scope changes, and approve the change request before implementation continues.',
    approvalNote: buildApprovalNote(),
    status: 'draft' as const,
    generatedBy: analysis.analysisEngine,
  };
};

export const generateChangeRequest = async (userId: string, data: {
  driftAnalysisId: string;
  useOllama?: boolean;
  ollamaModel?: string;
}) => {
  const driftAnalysis = await DriftAnalysisModel.findById(data.driftAnalysisId).populate('project', 'name clientName').populate('workspace', 'name slug');
  if (!driftAnalysis) {
    throw new ApiError(404, 'Drift analysis not found');
  }

  const populatedProject = driftAnalysis.project as unknown as { _id: { toString: () => string }; name: string; clientName: string } | string;
  const populatedWorkspace = driftAnalysis.workspace as unknown as { _id: { toString: () => string } } | string;
  const projectId = typeof populatedProject === 'string' ? populatedProject : populatedProject._id.toString();
  const workspaceId = typeof populatedWorkspace === 'string' ? populatedWorkspace : populatedWorkspace._id.toString();

  await ensureProjectAccess(projectId, userId);

  const projectRecord = await ProjectModel.findById(projectId);
  const projectName = projectRecord?.name ?? (typeof populatedProject === 'string' ? 'Project' : populatedProject.name);
  const clientName = projectRecord?.clientName ?? (typeof populatedProject === 'string' ? '' : populatedProject.clientName);
  const draft = buildDraft(
    {
      projectId,
      workspaceId,
      baselineVersionId: driftAnalysis.baselineVersion.toString(),
      baselineVersionNumber: driftAnalysis.baselineVersionNumber,
      inputType: driftAnalysis.inputType,
      inputText: driftAnalysis.inputText,
      driftScore: driftAnalysis.driftScore,
      riskLevel: driftAnalysis.riskLevel,
      summary: driftAnalysis.summary,
      detectedChanges: driftAnalysis.detectedChanges as DriftAnalysisPreview['detectedChanges'],
      addedCount: driftAnalysis.addedCount,
      modifiedCount: driftAnalysis.modifiedCount,
      removedCount: driftAnalysis.removedCount,
      ambiguousCount: driftAnalysis.ambiguousCount,
      contradictionCount: driftAnalysis.contradictionCount,
      estimatedExtraHours: driftAnalysis.estimatedExtraHours,
      analysisEngine: driftAnalysis.analysisEngine,
      ollamaUsed: driftAnalysis.ollamaUsed,
      ollamaModel: driftAnalysis.ollamaModel ?? undefined,
    },
    projectName,
    clientName
  );

  if (data.useOllama) {
    const ollamaDraft = await generateChangeRequestWithOllama({
      driftAnalysis: {
        projectId,
        workspaceId,
        baselineVersionId: driftAnalysis.baselineVersion.toString(),
        baselineVersionNumber: driftAnalysis.baselineVersionNumber,
        inputType: driftAnalysis.inputType,
        inputText: driftAnalysis.inputText,
        driftScore: driftAnalysis.driftScore,
        riskLevel: driftAnalysis.riskLevel,
        summary: driftAnalysis.summary,
        detectedChanges: driftAnalysis.detectedChanges as DriftAnalysisPreview['detectedChanges'],
        addedCount: driftAnalysis.addedCount,
        modifiedCount: driftAnalysis.modifiedCount,
        removedCount: driftAnalysis.removedCount,
        ambiguousCount: driftAnalysis.ambiguousCount,
        contradictionCount: driftAnalysis.contradictionCount,
        estimatedExtraHours: driftAnalysis.estimatedExtraHours,
        analysisEngine: driftAnalysis.analysisEngine,
        ollamaUsed: driftAnalysis.ollamaUsed,
        ollamaModel: driftAnalysis.ollamaModel ?? undefined,
      },
      changeRequestDraft: draft,
      model: data.ollamaModel,
    });

    if (ollamaDraft) {
      return {
        ...draft,
        ...ollamaDraft,
        driftAnalysisId: driftAnalysis._id.toString(),
        generatedBy: 'ollama' as const,
      };
    }
  }

  return {
    ...draft,
    driftAnalysisId: driftAnalysis._id.toString(),
  };
};

export const saveChangeRequest = async (userId: string, data: {
  driftAnalysisId: string;
  title: string;
  clientName?: string;
  summary: string;
  changesRequested: ChangeRequestChange[];
  businessReason?: string;
  timelineImpact?: string;
  costImpact?: string;
  recommendedAction?: string;
  approvalNote?: string;
  status?: 'draft' | 'sent' | 'approved' | 'rejected' | 'archived';
  generatedBy?: 'rule_based' | 'ollama' | 'hybrid';
}) => {
  const driftAnalysis = await DriftAnalysisModel.findById(data.driftAnalysisId);
  if (!driftAnalysis) {
    throw new ApiError(404, 'Drift analysis not found');
  }

  const project = await ensureProjectAccess(driftAnalysis.project.toString(), userId);

  const changeRequest = await ChangeRequestModel.create({
    project: project._id,
    workspace: project.workspace,
    driftAnalysis: driftAnalysis._id,
    title: data.title,
    clientName: data.clientName ?? '',
    summary: data.summary,
    changesRequested: data.changesRequested,
    businessReason: data.businessReason ?? '',
    timelineImpact: data.timelineImpact ?? '',
    costImpact: data.costImpact ?? '',
    recommendedAction: data.recommendedAction ?? '',
    approvalNote: data.approvalNote ?? '',
    status: data.status ?? 'draft',
    generatedBy: data.generatedBy ?? 'rule_based',
    createdBy: userId,
  });

  await logActivity({
    workspace: project.workspace.toString(),
    user: userId,
    action: 'CHANGE_REQUEST_CREATED',
    entityType: 'ChangeRequest',
    entityId: changeRequest._id.toString(),
    metadata: {
      projectId: project._id.toString(),
      driftAnalysisId: driftAnalysis._id.toString(),
      title: changeRequest.title,
    },
  });

  return ChangeRequestModel.findById(changeRequest._id).populate('createdBy', 'name email');
};

export const getProjectChangeRequests = async (projectId: string, userId: string) => {
  await ensureProjectAccess(projectId, userId);
  return ChangeRequestModel.find({ project: projectId }).sort({ createdAt: -1 }).populate('createdBy', 'name email');
};

export const getChangeRequestById = async (changeRequestId: string, userId: string) => {
  const changeRequest = await ensureChangeRequestAccess(changeRequestId, userId);
  return ChangeRequestModel.findById(changeRequest._id).populate('createdBy', 'name email');
};

export const updateChangeRequest = async (changeRequestId: string, userId: string, data: Partial<{
  title: string;
  summary: string;
  businessReason: string;
  timelineImpact: string;
  costImpact: string;
  recommendedAction: string;
  approvalNote: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'archived';
}>) => {
  const changeRequest = await ensureChangeRequestAccess(changeRequestId, userId);

  if (data.title !== undefined) changeRequest.title = data.title;
  if (data.summary !== undefined) changeRequest.summary = data.summary;
  if (data.businessReason !== undefined) changeRequest.businessReason = data.businessReason;
  if (data.timelineImpact !== undefined) changeRequest.timelineImpact = data.timelineImpact;
  if (data.costImpact !== undefined) changeRequest.costImpact = data.costImpact;
  if (data.recommendedAction !== undefined) changeRequest.recommendedAction = data.recommendedAction;
  if (data.approvalNote !== undefined) changeRequest.approvalNote = data.approvalNote;
  if (data.status !== undefined) changeRequest.status = data.status;

  await changeRequest.save();

  await logActivity({
    workspace: changeRequest.workspace.toString(),
    user: userId,
    action: 'CHANGE_REQUEST_UPDATED',
    entityType: 'ChangeRequest',
    entityId: changeRequest._id.toString(),
    metadata: {
      projectId: changeRequest.project.toString(),
      title: changeRequest.title,
      status: changeRequest.status,
    },
  });

  return ChangeRequestModel.findById(changeRequest._id).populate('createdBy', 'name email');
};

export const deleteChangeRequest = async (changeRequestId: string, userId: string) => {
  const changeRequest = await ensureChangeRequestAccess(changeRequestId, userId);

  await ChangeRequestModel.findByIdAndDelete(changeRequestId);

  await logActivity({
    workspace: changeRequest.workspace.toString(),
    user: userId,
    action: 'CHANGE_REQUEST_DELETED',
    entityType: 'ChangeRequest',
    entityId: changeRequestId,
    metadata: {
      projectId: changeRequest.project.toString(),
      title: changeRequest.title,
    },
  });

  return changeRequest;
};
