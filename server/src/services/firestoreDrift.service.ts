import { firestore } from '../config/firebase.js';
import { ApiError } from '../utils/ApiError.js';
import { logActivity } from './activity.service.js';
import { analyzeDriftWithOllama } from './ollama.service.js';
import { scoreDriftAnalysis } from './driftScoring.service.js';
import { extractRequirementsFromText } from './requirementExtraction.service.js';
import { getProjectById } from './firestoreProject.service.js';
import type { FirestoreDriftAnalysis, FirestoreRequirementSnapshot, FirestoreRequirementVersion } from './firebaseInit.service.js';
import type { AnalysisEngine, DetectedChange, DriftAnalysisPreview, DriftImpact, DriftInputType, RiskLevel } from '../types/drift.js';

const DRIFT_ANALYSES_COLLECTION = 'driftAnalyses';
const REQUIREMENT_VERSIONS_COLLECTION = 'requirementVersions';

const STOP_WORDS = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have', 'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'to', 'was', 'were', 'will', 'with', 'this', 'these', 'those']);
const ADDITION_KEYWORDS = ['should', 'must', 'needs to', 'need to', 'allow', 'support', 'include', 'add', 'create', 'implement', 'integrate', 'generate', 'export', 'import', 'dashboard', 'report', 'analytics', 'notification', 'payment', 'role', 'permission', 'login', 'signup', 'email', 'api', 'admin', 'user'];
const CONTRADICTION_KEYWORDS = ['instead of', 'no longer', 'remove', 'replace', 'should not', "don't need", 'not required', 'cancel', 'disable'];
const AMBIGUITY_KEYWORDS = ['maybe', 'if possible', 'something like', 'etc', 'and more', 'make it better', 'user-friendly', 'modern', 'fast', 'scalable', 'simple', 'advanced', 'premium', 'beautiful', 'professional', 'optimize'];

const splitStatements = (sourceText: string) =>
  sourceText
    .replace(/\r/g, '\n')
    .split(/(?<=[.!?])\s+|\n+/)
    .flatMap((statement) => statement.split(/;+/))
    .map((statement) => statement.trim())
    .filter(Boolean);

const normalizeTokens = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token && !STOP_WORDS.has(token));

const keywordHit = (text: string, keywords: string[]) => keywords.some((keyword) => text.includes(keyword));

const getTimeValue = (value: unknown) => {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().getTime();
  }

  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const similarity = (left: string, right: string) => {
  const leftTokens = new Set(normalizeTokens(left));
  const rightTokens = new Set(normalizeTokens(right));

  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap += 1;
  }

  return overlap / Math.max(leftTokens.size, rightTokens.size);
};

const estimateImpact = (changeType: DetectedChange['changeType'], text: string): DriftImpact => {
  const lower = text.toLowerCase();
  if (keywordHit(lower, ['payment', 'security', 'authentication', 'authorization', 'role', 'permission', 'login', 'signup', 'api', 'admin'])) return 'critical';
  if (changeType === 'contradiction' || changeType === 'removed') return 'high';
  if (keywordHit(lower, ['dashboard', 'report', 'analytics', 'notification', 'integration', 'export', 'import', 'client'])) return 'high';
  if (changeType === 'ambiguous') return 'medium';
  return 'low';
};

const deriveRecommendation = (changeType: DetectedChange['changeType'], title: string) => {
  if (changeType === 'added') return `Confirm whether "${title}" should be added to the approved baseline and update the estimate.`;
  if (changeType === 'modified') return `Review the updated scope for "${title}" and decide whether the baseline needs to be revised.`;
  if (changeType === 'removed') return `Confirm removal of "${title}" and document the scope reduction before implementation.`;
  if (changeType === 'contradiction') return `Resolve the contradiction in "${title}" before the project continues.`;
  return `Clarify the request for "${title}" before it is added to the baseline.`;
};

const detectChangeForSentence = (sentence: string, baselineRequirements: FirestoreRequirementSnapshot[]): DetectedChange | null => {
  const lower = sentence.toLowerCase();
  const extractedSuggestions = extractRequirementsFromText(sentence, 'client_message');
  const suggestion = extractedSuggestions[0];
  const bestMatch = baselineRequirements
    .map((baseline) => ({ baseline, score: similarity(`${baseline.title} ${baseline.description}`, sentence) }))
    .sort((left, right) => right.score - left.score)[0];

  if (keywordHit(lower, AMBIGUITY_KEYWORDS)) {
    const title = suggestion?.title || sentence.slice(0, 80);
    return {
      changeType: 'ambiguous',
      title,
      description: sentence,
      baselineRequirementId: bestMatch && bestMatch.score >= 0.35 ? bestMatch.baseline.requirementId : undefined,
      baselineRequirementTitle: bestMatch && bestMatch.score >= 0.35 ? bestMatch.baseline.title : undefined,
      newText: sentence,
      oldText: bestMatch && bestMatch.score >= 0.35 ? bestMatch.baseline.description : undefined,
      impact: 'medium',
      estimatedEffort: 2,
      confidence: 58,
      recommendation: deriveRecommendation('ambiguous', title),
    };
  }

  const isExplicitRemoval = keywordHit(lower, CONTRADICTION_KEYWORDS);
  const isRequirementLike = keywordHit(lower, ADDITION_KEYWORDS) || extractedSuggestions.length > 0;

  if (!isExplicitRemoval && !isRequirementLike) {
    return null;
  }

  const title = suggestion?.title || sentence.slice(0, 80);
  const description = suggestion?.description || sentence;

  if (bestMatch && bestMatch.score >= 0.7) {
    const changeType = isExplicitRemoval ? (keywordHit(lower, ['remove', 'no longer', 'cancel', "don't need", 'not required']) ? 'removed' : 'contradiction') : 'modified';
    return {
      changeType,
      title: bestMatch.baseline.title,
      description,
      baselineRequirementId: bestMatch.baseline.requirementId,
      baselineRequirementTitle: bestMatch.baseline.title,
      newText: sentence,
      oldText: bestMatch.baseline.description,
      impact: estimateImpact(changeType, sentence),
      estimatedEffort: suggestion?.estimatedEffort ?? (changeType === 'removed' ? 1 : 4),
      confidence: Math.min(96, Math.round(bestMatch.score * 100)),
      recommendation: deriveRecommendation(changeType, bestMatch.baseline.title),
    };
  }

  if (bestMatch && bestMatch.score >= 0.4) {
    const changeType = isExplicitRemoval ? 'contradiction' : 'modified';
    return {
      changeType,
      title,
      description,
      baselineRequirementId: bestMatch.baseline.requirementId,
      baselineRequirementTitle: bestMatch.baseline.title,
      newText: sentence,
      oldText: bestMatch.baseline.description,
      impact: estimateImpact(changeType, sentence),
      estimatedEffort: suggestion?.estimatedEffort ?? 4,
      confidence: Math.min(88, Math.round(bestMatch.score * 100)),
      recommendation: deriveRecommendation(changeType, bestMatch.baseline.title),
    };
  }

  const changeType: DetectedChange['changeType'] = isExplicitRemoval ? 'removed' : 'added';
  return {
    changeType,
    title,
    description,
    newText: sentence,
    impact: estimateImpact(changeType, sentence),
    estimatedEffort: suggestion?.estimatedEffort ?? (changeType === 'removed' ? 1 : 4),
    confidence: isRequirementLike ? 72 : 55,
    recommendation: deriveRecommendation(changeType, title),
  };
};

const buildRuleBasedAnalysis = (
  baselineVersion: FirestoreRequirementVersion,
  projectId: string,
  workspaceId: string,
  inputText: string,
  inputType: DriftInputType
): DriftAnalysisPreview => {
  const detectedChanges = splitStatements(inputText)
    .map((sentence) => detectChangeForSentence(sentence, baselineVersion.requirementsSnapshot))
    .filter((change): change is DetectedChange => Boolean(change));

  const scored = scoreDriftAnalysis(detectedChanges);

  return {
    projectId,
    workspaceId,
    baselineVersionId: baselineVersion._id,
    baselineVersionNumber: baselineVersion.versionNumber,
    inputType,
    inputText,
    driftScore: scored.driftScore,
    riskLevel: scored.riskLevel,
    summary: scored.summary,
    detectedChanges,
    addedCount: scored.addedCount,
    modifiedCount: scored.modifiedCount,
    removedCount: scored.removedCount,
    ambiguousCount: scored.ambiguousCount,
    contradictionCount: scored.contradictionCount,
    estimatedExtraHours: scored.estimatedExtraHours,
    analysisEngine: 'rule_based',
    ollamaUsed: false,
    ollamaModel: null,
  };
};

const getBaselineVersionById = async (baselineVersionId: string, projectId: string, userId: string) => {
  const project = await getProjectById(projectId, userId);
  const versionDoc = await firestore.collection(REQUIREMENT_VERSIONS_COLLECTION).doc(baselineVersionId).get();

  if (!versionDoc.exists) {
    throw new ApiError(404, 'Requirement baseline not found');
  }

  const baselineVersion = versionDoc.data() as FirestoreRequirementVersion;
  if (baselineVersion.project !== projectId) {
    throw new ApiError(403, 'You do not have access to this baseline');
  }

  return { project, baselineVersion };
};

export const analyzeDrift = async (
  userId: string,
  payload: {
    projectId: string;
    baselineVersionId: string;
    inputType?: DriftInputType;
    inputText: string;
    ollamaModel?: string;
  }
) => {
  const { project, baselineVersion } = await getBaselineVersionById(payload.baselineVersionId, payload.projectId, userId);
  const inputType = payload.inputType || 'client_message';
  const ollamaResult = await analyzeDriftWithOllama({
    baselineRequirements: baselineVersion.requirementsSnapshot,
    inputText: payload.inputText,
    inputType,
    model: payload.ollamaModel,
  });
  const scored = scoreDriftAnalysis(ollamaResult.detectedChanges);

  return {
    projectId: payload.projectId,
    workspaceId: project.workspace,
    baselineVersionId: baselineVersion._id,
    baselineVersionNumber: baselineVersion.versionNumber,
    inputType,
    inputText: payload.inputText,
    driftScore: scored.driftScore,
    riskLevel: scored.riskLevel,
    summary: ollamaResult.summary,
    detectedChanges: ollamaResult.detectedChanges,
    addedCount: scored.addedCount,
    modifiedCount: scored.modifiedCount,
    removedCount: scored.removedCount,
    ambiguousCount: scored.ambiguousCount,
    contradictionCount: scored.contradictionCount,
    estimatedExtraHours: scored.estimatedExtraHours,
    analysisEngine: ollamaResult.analysisEngine,
    ollamaUsed: ollamaResult.ollamaUsed,
    ollamaModel: ollamaResult.ollamaModel,
  } satisfies DriftAnalysisPreview;
};

export const saveDriftAnalysis = async (
  userId: string,
  payload: {
    projectId: string;
    baselineVersionId: string;
    inputType?: DriftInputType;
    inputText: string;
    detectedChanges: DetectedChange[];
    driftScore: number;
    riskLevel: RiskLevel;
    summary: string;
    addedCount: number;
    modifiedCount: number;
    removedCount: number;
    ambiguousCount: number;
    contradictionCount: number;
    estimatedExtraHours: number;
    analysisEngine: AnalysisEngine;
    ollamaUsed: boolean;
    ollamaModel?: string | null;
    status?: 'draft' | 'saved' | 'reviewed';
  }
) => {
  const { project, baselineVersion } = await getBaselineVersionById(payload.baselineVersionId, payload.projectId, userId);

  const analysisRef = firestore.collection(DRIFT_ANALYSES_COLLECTION).doc();
  const now = new Date();

  const analysis: FirestoreDriftAnalysis = {
    _id: analysisRef.id,
    project: payload.projectId,
    workspace: project.workspace,
    baselineVersion: baselineVersion._id,
    baselineVersionNumber: baselineVersion.versionNumber,
    inputType: payload.inputType || 'client_message',
    inputText: payload.inputText,
    driftScore: payload.driftScore,
    riskLevel: payload.riskLevel,
    summary: payload.summary,
    detectedChanges: payload.detectedChanges.map((change) => ({ ...change })),
    addedCount: payload.addedCount,
    modifiedCount: payload.modifiedCount,
    removedCount: payload.removedCount,
    ambiguousCount: payload.ambiguousCount,
    contradictionCount: payload.contradictionCount,
    estimatedExtraHours: payload.estimatedExtraHours,
    analysisEngine: payload.analysisEngine,
    ollamaUsed: payload.ollamaUsed,
    ollamaModel: payload.ollamaModel ?? null,
    status: payload.status || 'saved',
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };

  await analysisRef.set(analysis);

  await logActivity({
    workspace: project.workspace,
    user: userId,
    action: 'DRIFT_ANALYSIS_CREATED',
    entityType: 'DriftAnalysis',
    entityId: analysisRef.id,
    metadata: { projectId: payload.projectId, baselineVersionId: baselineVersion._id, driftScore: payload.driftScore },
  });

  return analysis;
};

export const getDriftAnalysisById = async (analysisId: string, userId: string) => {
  const docSnapshot = await firestore.collection(DRIFT_ANALYSES_COLLECTION).doc(analysisId).get();

  if (!docSnapshot.exists) {
    throw new ApiError(404, 'Drift analysis not found');
  }

  const analysis = docSnapshot.data() as FirestoreDriftAnalysis;

  await getProjectById(analysis.project, userId);

  return analysis;
};

export const getProjectDriftAnalyses = async (projectId: string, userId: string) => {
  await getProjectById(projectId, userId);

  const analysesQuery = await firestore
    .collection(DRIFT_ANALYSES_COLLECTION)
    .where('project', '==', projectId)
    .get();

  return analysesQuery.docs
    .map((doc) => doc.data() as FirestoreDriftAnalysis)
    .sort((left, right) => getTimeValue(right.createdAt) - getTimeValue(left.createdAt));
};

export const listDriftAnalysesByProject = getProjectDriftAnalyses;

export const deleteDriftAnalysis = async (analysisId: string, userId: string) => {
  const analysis = await getDriftAnalysisById(analysisId, userId);
  const project = await getProjectById(analysis.project, userId);

  await firestore.collection(DRIFT_ANALYSES_COLLECTION).doc(analysisId).delete();

  await logActivity({
    workspace: project.workspace,
    user: userId,
    action: 'DRIFT_ANALYSIS_DELETED',
    entityType: 'DriftAnalysis',
    entityId: analysisId,
    metadata: { baselineVersionId: analysis.baselineVersion },
  });

  return analysis;
};
