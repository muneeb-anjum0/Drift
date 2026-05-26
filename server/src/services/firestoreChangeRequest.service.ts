import { firestore } from '../config/firebase.js';
import { ApiError } from '../utils/ApiError.js';
import { logActivity } from './activity.service.js';
import { generateChangeRequestWithOllama } from './ollama.service.js';
import { getDriftAnalysisById } from './firestoreDrift.service.js';
import { getProjectById } from './firestoreProject.service.js';
import type { FirestoreChangeRequest } from './firebaseInit.service.js';

const CHANGE_REQUESTS_COLLECTION = 'changeRequests';

const getTimeValue = (value: unknown) => {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().getTime();
  }

  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const toChangeRequestChanges = (changes: Array<{ title: string; description: string; changeType: 'added' | 'modified' | 'removed' | 'ambiguous' | 'contradiction'; impact: 'low' | 'medium' | 'high' | 'critical'; estimatedEffort?: number }>) =>
  changes.map((change) => ({
    title: change.title,
    description: change.description,
    changeType: change.changeType,
    impact: change.impact,
    estimatedEffort: change.estimatedEffort,
  }));

const buildDraft = (params: {
  driftAnalysisId: string;
  driftAnalysis: Awaited<ReturnType<typeof getDriftAnalysisById>>;
  project: Awaited<ReturnType<typeof getProjectById>>;
}) => {
  const { driftAnalysis, project, driftAnalysisId } = params;
  const changeCount = driftAnalysis.detectedChanges.length;
  const changeWord = changeCount === 1 ? 'change' : 'changes';
  const riskSentence = driftAnalysis.riskLevel === 'critical' ? 'This request materially expands the current scope.' : 'This request contains scope changes that should be reviewed before implementation.';
  const estimatedHours = driftAnalysis.estimatedExtraHours;

  return {
    driftAnalysisId,
    title: `Change Request - ${project.name}`,
    clientName: project.clientName,
    summary: driftAnalysis.summary,
    changesRequested: toChangeRequestChanges(driftAnalysis.detectedChanges as Array<{ title: string; description: string; changeType: 'added' | 'modified' | 'removed' | 'ambiguous' | 'contradiction'; impact: 'low' | 'medium' | 'high' | 'critical'; estimatedEffort?: number }>),
    businessReason: `The current request introduces ${changeCount} ${changeWord} compared to the approved baseline.`,
    timelineImpact: estimatedHours > 0 ? `Estimated additional delivery time: approximately ${estimatedHours} hour${estimatedHours === 1 ? '' : 's'}.` : 'Timeline impact appears limited, but the request should still be approved before work continues.',
    costImpact: riskSentence,
    recommendedAction: 'Review the scope delta, confirm approval, and update estimates before implementation begins.',
    approvalNote:
      'Please review and approve this change request before implementation begins. Approval confirms that the listed changes are accepted as an expansion or modification of the original scope.',
    status: 'draft' as const,
    generatedBy: driftAnalysis.analysisEngine,
  };
};

export const generateChangeRequest = async (
  userId: string,
  data: {
    driftAnalysisId: string;
    useOllama?: boolean;
    ollamaModel?: string;
  }
) => {
  const driftAnalysis = await getDriftAnalysisById(data.driftAnalysisId, userId);
  const project = await getProjectById(driftAnalysis.project, userId);

  const ruleBasedDraft = buildDraft({
    driftAnalysisId: data.driftAnalysisId,
    driftAnalysis,
    project,
  });

  if (data.useOllama) {
    const enhancement = await generateChangeRequestWithOllama({
      driftAnalysis: {
        projectId: driftAnalysis.project,
        workspaceId: driftAnalysis.workspace,
        baselineVersionId: driftAnalysis.baselineVersion,
        baselineVersionNumber: driftAnalysis.baselineVersionNumber,
        inputType: driftAnalysis.inputType,
        inputText: driftAnalysis.inputText,
        driftScore: driftAnalysis.driftScore,
        riskLevel: driftAnalysis.riskLevel,
        summary: driftAnalysis.summary,
        detectedChanges: driftAnalysis.detectedChanges as never,
        addedCount: driftAnalysis.addedCount,
        modifiedCount: driftAnalysis.modifiedCount,
        removedCount: driftAnalysis.removedCount,
        ambiguousCount: driftAnalysis.ambiguousCount,
        contradictionCount: driftAnalysis.contradictionCount,
        estimatedExtraHours: driftAnalysis.estimatedExtraHours,
        analysisEngine: driftAnalysis.analysisEngine,
        ollamaUsed: driftAnalysis.ollamaUsed,
        ollamaModel: driftAnalysis.ollamaModel,
      },
      changeRequestDraft: ruleBasedDraft,
      model: data.ollamaModel,
    });

    if (enhancement) {
      return {
        ...ruleBasedDraft,
        ...enhancement,
        driftAnalysisId: data.driftAnalysisId,
      };
    }
  }

  return ruleBasedDraft;
};

export const saveChangeRequest = async (
  userId: string,
  data: {
    driftAnalysisId: string;
    title: string;
    clientName?: string;
    summary: string;
    changesRequested: Array<{ title: string; description: string; changeType: 'added' | 'modified' | 'removed' | 'ambiguous' | 'contradiction'; impact: 'low' | 'medium' | 'high' | 'critical'; estimatedEffort?: number }>;
    businessReason: string;
    timelineImpact: string;
    costImpact: string;
    recommendedAction: string;
    approvalNote: string;
    status?: 'draft' | 'sent' | 'approved' | 'rejected' | 'archived';
    generatedBy?: 'rule_based' | 'ollama' | 'hybrid';
  }
) => {
  const driftAnalysis = await getDriftAnalysisById(data.driftAnalysisId, userId);
  const project = await getProjectById(driftAnalysis.project, userId);

  const now = new Date();
  const changeRequestRef = firestore.collection(CHANGE_REQUESTS_COLLECTION).doc();

  const changeRequest: FirestoreChangeRequest = {
    _id: changeRequestRef.id,
    project: driftAnalysis.project,
    workspace: project.workspace,
    driftAnalysis: data.driftAnalysisId,
    title: data.title,
    clientName: data.clientName || project.clientName,
    summary: data.summary,
    changesRequested: toChangeRequestChanges(data.changesRequested),
    businessReason: data.businessReason,
    timelineImpact: data.timelineImpact,
    costImpact: data.costImpact,
    recommendedAction: data.recommendedAction,
    approvalNote: data.approvalNote,
    status: data.status || 'draft',
    generatedBy: data.generatedBy || driftAnalysis.analysisEngine,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };

  await changeRequestRef.set(changeRequest);

  await logActivity({
    workspace: project.workspace,
    user: userId,
    action: 'CHANGE_REQUEST_CREATED',
    entityType: 'ChangeRequest',
    entityId: changeRequestRef.id,
    metadata: { title: data.title, projectId: driftAnalysis.project },
  });

  return changeRequest;
};

export const getChangeRequestById = async (crId: string, userId: string) => {
  const docSnapshot = await firestore.collection(CHANGE_REQUESTS_COLLECTION).doc(crId).get();

  if (!docSnapshot.exists) {
    throw new ApiError(404, 'Change request not found');
  }

  const changeRequest = docSnapshot.data() as FirestoreChangeRequest;

  await getProjectById(changeRequest.project, userId);

  return changeRequest;
};

export const getProjectChangeRequests = async (projectId: string, userId: string) => {
  await getProjectById(projectId, userId);

  const crsQuery = await firestore
    .collection(CHANGE_REQUESTS_COLLECTION)
    .where('project', '==', projectId)
    .get();

  return crsQuery.docs
    .map((doc) => doc.data() as FirestoreChangeRequest)
    .sort((left, right) => getTimeValue(right.createdAt) - getTimeValue(left.createdAt));
};

export const listChangeRequestsByProject = getProjectChangeRequests;

export const updateChangeRequest = async (
  crId: string,
  userId: string,
  data: Partial<Pick<FirestoreChangeRequest, 'title' | 'clientName' | 'summary' | 'businessReason' | 'timelineImpact' | 'costImpact' | 'recommendedAction' | 'approvalNote' | 'status' | 'generatedBy'>>
) => {
  const changeRequest = await getChangeRequestById(crId, userId);
  const project = await getProjectById(changeRequest.project, userId);

  const updates: Partial<FirestoreChangeRequest> = { updatedAt: new Date() };
  if (data.title) updates.title = data.title;
  if (data.clientName !== undefined) updates.clientName = data.clientName;
  if (data.summary !== undefined) updates.summary = data.summary;
  if (data.businessReason !== undefined) updates.businessReason = data.businessReason;
  if (data.timelineImpact !== undefined) updates.timelineImpact = data.timelineImpact;
  if (data.costImpact !== undefined) updates.costImpact = data.costImpact;
  if (data.recommendedAction !== undefined) updates.recommendedAction = data.recommendedAction;
  if (data.approvalNote !== undefined) updates.approvalNote = data.approvalNote;
  if (data.status) updates.status = data.status;
  if (data.generatedBy) updates.generatedBy = data.generatedBy;

  await firestore.collection(CHANGE_REQUESTS_COLLECTION).doc(crId).update(updates);
  const updated = await firestore.collection(CHANGE_REQUESTS_COLLECTION).doc(crId).get();

  await logActivity({
    workspace: project.workspace,
    user: userId,
    action: 'CHANGE_REQUEST_UPDATED',
    entityType: 'ChangeRequest',
    entityId: crId,
    metadata: { status: data.status ?? changeRequest.status },
  });

  return updated.data() as FirestoreChangeRequest;
};

export const updateChangeRequestStatus = async (
  crId: string,
  userId: string,
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'archived'
) => updateChangeRequest(crId, userId, { status });

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
    metadata: { title: changeRequest.title, projectId: changeRequest.project },
  });

  return changeRequest;
};
