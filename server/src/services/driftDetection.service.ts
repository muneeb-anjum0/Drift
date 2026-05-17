import { Types } from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { ProjectModel } from '../models/Project.model.js';
import { WorkspaceMemberModel } from '../models/WorkspaceMember.model.js';
import { RequirementVersionModel } from '../models/RequirementVersion.model.js';
import { DriftAnalysisModel } from '../models/DriftAnalysis.model.js';
import { enhanceDriftAnalysisWithOllama } from './ollama.service.js';
import { scoreDriftAnalysis } from './driftScoring.service.js';
import type { AnalysisEngine, DetectedChange, DriftAnalysisPreview, DriftInputType, RiskLevel } from '../types/drift.js';

type BaselineRequirement = {
  requirementId: string;
  title: string;
  description: string;
};

const requirementKeywords = ['should', 'must', 'needs to', 'allow', 'support', 'include', 'add', 'create', 'implement', 'integrate', 'generate', 'export', 'import', 'dashboard', 'report', 'analytics', 'notification', 'payment', 'role', 'permission', 'login', 'signup', 'email', 'api', 'admin', 'user'];
const contradictionKeywords = ['instead of', 'no longer', 'remove', 'replace', 'should not', "don't need", 'not required', 'cancel', 'disable'];
const ambiguityKeywords = ['maybe', 'if possible', 'something like', 'etc', 'and more', 'make it better', 'improve this', 'user-friendly', 'modern', 'fast', 'scalable', 'simple', 'advanced', 'premium', 'beautiful', 'professional', 'optimize'];
const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'to', 'of', 'for', 'in', 'on', 'with', 'by', 'we', 'it', 'is', 'are', 'be', 'this', 'that', 'should', 'must', 'needs', 'need', 'allow', 'support', 'include', 'add', 'create', 'implement', 'integrate', 'generate', 'export', 'import']);

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (value: string) => normalizeText(value).split(' ').filter((token) => token && !stopWords.has(token));

const similarityScore = (left: string, right: string) => {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      intersection += 1;
    }
  }

  const union = new Set([...leftTokens, ...rightTokens]).size;
  return intersection / union;
};

const splitIntoSentences = (inputText: string) =>
  inputText
    .split(/(?:\r?\n|[.!?])+/)
    .map((sentence) => sentence.replace(/^[-*\d.\s]+/, '').trim())
    .filter(Boolean);

const isRequirementLike = (sentence: string) => {
  const lower = sentence.toLowerCase();
  return requirementKeywords.some((keyword) => lower.includes(keyword));
};

const getImpactForType = (changeType: DetectedChange['changeType'], similarity: number): DetectedChange['impact'] => {
  if (changeType === 'added') return similarity > 0.7 ? 'medium' : 'low';
  if (changeType === 'modified') return similarity > 0.75 ? 'medium' : similarity > 0.5 ? 'high' : 'low';
  if (changeType === 'removed' || changeType === 'contradiction') return 'high';
  if (changeType === 'ambiguous') return similarity > 0.5 ? 'medium' : 'low';
  return 'low';
};

const getEstimatedEffort = (changeType: DetectedChange['changeType'], impact: DetectedChange['impact']) => {
  if (changeType === 'added') {
    if (impact === 'critical') return 30;
    if (impact === 'high') return 18;
    if (impact === 'medium') return 7;
    return 3;
  }

  if (changeType === 'modified') {
    if (impact === 'critical') return 18;
    if (impact === 'high') return 14;
    if (impact === 'medium') return 6;
    return 2;
  }

  if (changeType === 'ambiguous') return 2;
  if (changeType === 'removed') return 1;
  if (changeType === 'contradiction') return 4;
  return 0;
};

const getRecommendation = (changeType: DetectedChange['changeType']) => {
  if (changeType === 'added') return 'Confirm this as a paid change request before implementation.';
  if (changeType === 'modified') return 'Review the original requirement and approve the expanded scope.';
  if (changeType === 'ambiguous') return 'Ask the client for clearer acceptance criteria before development.';
  if (changeType === 'contradiction') return 'Confirm whether this replaces the original approved requirement.';
  if (changeType === 'removed') return 'Confirm removal and update the approved baseline if accepted.';
  return 'No action required.';
};

const buildDetectedChange = (params: {
  changeType: DetectedChange['changeType'];
  title: string;
  description: string;
  baselineRequirement?: BaselineRequirement;
  newText?: string;
  oldText?: string;
  similarity: number;
}) => {
  const impact = getImpactForType(params.changeType, params.similarity);
  return {
    changeType: params.changeType,
    title: params.title,
    description: params.description,
    baselineRequirementId: params.baselineRequirement?.requirementId,
    baselineRequirementTitle: params.baselineRequirement?.title,
    newText: params.newText,
    oldText: params.oldText,
    impact,
    estimatedEffort: getEstimatedEffort(params.changeType, impact),
    confidence: Math.max(30, Math.min(100, Math.round(params.similarity * 100))),
    recommendation: getRecommendation(params.changeType),
  } satisfies DetectedChange;
};

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

const ensureDriftAnalysisAccess = async (driftAnalysisId: string, userId: string) => {
  if (!Types.ObjectId.isValid(driftAnalysisId)) {
    throw new ApiError(400, 'Invalid drift analysis id');
  }

  const driftAnalysis = await DriftAnalysisModel.findById(driftAnalysisId);
  if (!driftAnalysis) {
    throw new ApiError(404, 'Drift analysis not found');
  }

  const member = await WorkspaceMemberModel.findOne({ workspace: driftAnalysis.workspace, user: userId });
  if (!member) {
    throw new ApiError(403, 'You do not have access to this drift analysis');
  }

  return driftAnalysis;
};

const getBaselineRequirements = (requirementVersion: { requirementsSnapshot: BaselineRequirement[] }) => requirementVersion.requirementsSnapshot;

const detectRuleBasedChanges = (baselineRequirements: BaselineRequirement[], inputText: string) => {
  const sentences = splitIntoSentences(inputText);
  const detectedChanges: DetectedChange[] = [];
  const matchedBaselineIds = new Set<string>();

  for (const sentence of sentences) {
    const requirementLike = isRequirementLike(sentence);
    const vague = ambiguityKeywords.some((keyword) => sentence.toLowerCase().includes(keyword));
    const contradiction = contradictionKeywords.some((keyword) => sentence.toLowerCase().includes(keyword));

    let bestMatch: BaselineRequirement | undefined;
    let bestSimilarity = 0;

    for (const baselineRequirement of baselineRequirements) {
      const combinedBaseline = `${baselineRequirement.title} ${baselineRequirement.description}`;
      const similarity = similarityScore(sentence, combinedBaseline);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = baselineRequirement;
      }
    }

    if (bestMatch && bestSimilarity >= 0.45) {
      matchedBaselineIds.add(bestMatch.requirementId);

      if (contradiction || /no longer|remove|replace|should not|don't need|not required|cancel|disable/i.test(sentence)) {
        detectedChanges.push(
          buildDetectedChange({
            changeType: 'contradiction',
            title: `Contradiction detected: ${bestMatch.title}`,
            description: `The new request conflicts with the approved baseline requirement: ${bestMatch.title}.`,
            baselineRequirement: bestMatch,
            newText: sentence,
            oldText: bestMatch.description,
            similarity: bestSimilarity,
          })
        );

        if (/remove|no longer|not required|cancel/i.test(sentence)) {
          detectedChanges.push(
            buildDetectedChange({
              changeType: 'removed',
              title: `Removed requirement: ${bestMatch.title}`,
              description: `The new input explicitly indicates this requirement is no longer needed: ${bestMatch.title}.`,
              baselineRequirement: bestMatch,
              newText: sentence,
              oldText: bestMatch.description,
              similarity: bestSimilarity,
            })
          );
        }
        continue;
      }

      if (vague) {
        detectedChanges.push(
          buildDetectedChange({
            changeType: 'ambiguous',
            title: `Ambiguous request: ${bestMatch.title}`,
            description: `The request related to ${bestMatch.title} uses vague language and needs clarification.`,
            baselineRequirement: bestMatch,
            newText: sentence,
            oldText: bestMatch.description,
            similarity: bestSimilarity,
          })
        );
        continue;
      }

      const baselineWords = new Set(tokenize(bestMatch.description));
      const sentenceWords = new Set(tokenize(sentence));
      const extraWords = [...sentenceWords].filter((word) => !baselineWords.has(word));

      if (bestSimilarity >= 0.75 && extraWords.length <= 2) {
        detectedChanges.push(
          buildDetectedChange({
            changeType: 'unchanged',
            title: bestMatch.title,
            description: `The new request appears to keep the baseline requirement intact: ${bestMatch.title}.`,
            baselineRequirement: bestMatch,
            newText: sentence,
            oldText: bestMatch.description,
            similarity: bestSimilarity,
          })
        );
      } else {
        detectedChanges.push(
          buildDetectedChange({
            changeType: 'modified',
            title: `Modified requirement: ${bestMatch.title}`,
            description: `The request expands or changes the baseline requirement: ${bestMatch.title}.`,
            baselineRequirement: bestMatch,
            newText: sentence,
            oldText: bestMatch.description,
            similarity: bestSimilarity,
          })
        );
      }
      continue;
    }

    if (requirementLike) {
      detectedChanges.push(
        buildDetectedChange({
          changeType: vague ? 'ambiguous' : 'added',
          title: vague ? 'Ambiguous new request' : 'Added requirement',
          description: vague
            ? 'The new request is requirement-like but uses unclear wording that needs clarification.'
            : 'The new request introduces a requirement that is not covered by the approved baseline.',
          newText: sentence,
          similarity: Math.max(0.35, bestSimilarity),
        })
      );
    }
  }

  for (const baselineRequirement of baselineRequirements) {
    if (matchedBaselineIds.has(baselineRequirement.requirementId)) {
      continue;
    }

    const baselineText = `${baselineRequirement.title} ${baselineRequirement.description}`;
    const explicitRemoval = sentences.some((sentence) => {
      const lower = sentence.toLowerCase();
      return contradictionKeywords.some((keyword) => lower.includes(keyword)) && similarityScore(sentence, baselineText) >= 0.3;
    });

    if (explicitRemoval) {
      detectedChanges.push(
        buildDetectedChange({
          changeType: 'removed',
          title: `Removed requirement: ${baselineRequirement.title}`,
          description: `The new input explicitly indicates removal of the baseline requirement: ${baselineRequirement.title}.`,
          baselineRequirement,
          oldText: baselineRequirement.description,
          similarity: 0.5,
        })
      );
    }
  }

  return detectedChanges.filter((change) => change.changeType !== 'unchanged');
};

const buildRuleBasedSummary = (riskLevel: RiskLevel) => {
  if (riskLevel === 'low') return 'Minor requirement drift detected. Changes appear manageable but should still be documented.';
  if (riskLevel === 'medium') return 'Moderate requirement drift detected. Some requested changes may affect scope, effort, or delivery expectations.';
  if (riskLevel === 'high') return 'High requirement drift detected. Several changes may expand the original scope and should be reviewed before development continues.';
  return 'Critical requirement drift detected. The new request significantly changes the original baseline and should be converted into a formal change request.';
};

export const analyzeDrift = async (userId: string, data: {
  projectId: string;
  baselineVersionId: string;
  inputText: string;
  inputType?: DriftInputType;
  useOllama?: boolean;
  ollamaModel?: string;
}) => {
  const project = await ensureProjectAccess(data.projectId, userId);

  if (!Types.ObjectId.isValid(data.baselineVersionId)) {
    throw new ApiError(400, 'Invalid baseline version id');
  }

  const baselineVersion = await RequirementVersionModel.findById(data.baselineVersionId);
  if (!baselineVersion) {
    throw new ApiError(404, 'Requirement baseline not found');
  }

  if (baselineVersion.project.toString() !== project._id.toString()) {
    throw new ApiError(400, 'Selected baseline does not belong to this project');
  }

  const baselineRequirements = getBaselineRequirements(baselineVersion as { requirementsSnapshot: BaselineRequirement[] });
  const ruleBasedDetectedChanges = detectRuleBasedChanges(baselineRequirements, data.inputText);
  const ruleBasedScore = scoreDriftAnalysis(ruleBasedDetectedChanges);

  const ruleBasedResult: DriftAnalysisPreview = {
    projectId: project._id.toString(),
    workspaceId: project.workspace.toString(),
    baselineVersionId: baselineVersion._id.toString(),
    baselineVersionNumber: baselineVersion.versionNumber,
    inputType: data.inputType ?? 'client_message',
    inputText: data.inputText,
    driftScore: ruleBasedScore.driftScore,
    riskLevel: ruleBasedScore.riskLevel,
    summary: ruleBasedScore.summary,
    detectedChanges: ruleBasedDetectedChanges,
    addedCount: ruleBasedScore.addedCount,
    modifiedCount: ruleBasedScore.modifiedCount,
    removedCount: ruleBasedScore.removedCount,
    ambiguousCount: ruleBasedScore.ambiguousCount,
    contradictionCount: ruleBasedScore.contradictionCount,
    estimatedExtraHours: ruleBasedScore.estimatedExtraHours,
    analysisEngine: 'rule_based',
    ollamaUsed: false,
    ollamaModel: data.ollamaModel,
  };

  if (!data.useOllama) {
    return ruleBasedResult;
  }

  const ollamaResult = await enhanceDriftAnalysisWithOllama({
    baselineRequirements,
    inputText: data.inputText,
    ruleBasedResult,
    model: data.ollamaModel,
  });

  if (!ollamaResult) {
    return ruleBasedResult;
  }

  const mergedScore = scoreDriftAnalysis(ollamaResult.detectedChanges);

  return {
    ...ruleBasedResult,
    ...ollamaResult,
    driftScore: mergedScore.driftScore,
    riskLevel: mergedScore.riskLevel,
    summary: ollamaResult.summary ?? buildRuleBasedSummary(mergedScore.riskLevel),
    detectedChanges: ollamaResult.detectedChanges,
    addedCount: mergedScore.addedCount,
    modifiedCount: mergedScore.modifiedCount,
    removedCount: mergedScore.removedCount,
    ambiguousCount: mergedScore.ambiguousCount,
    contradictionCount: mergedScore.contradictionCount,
    estimatedExtraHours: mergedScore.estimatedExtraHours,
    analysisEngine: ollamaResult.analysisEngine ?? 'hybrid',
    ollamaUsed: true,
    ollamaModel: data.ollamaModel ?? ollamaResult.ollamaModel,
  } satisfies DriftAnalysisPreview;
};

export const saveDriftAnalysis = async (userId: string, data: {
  projectId: string;
  baselineVersionId: string;
  inputText: string;
  inputType?: DriftInputType;
  detectedChanges: DetectedChange[];
  driftScore: number;
  riskLevel: RiskLevel;
  summary: string;
  addedCount?: number;
  modifiedCount?: number;
  removedCount?: number;
  ambiguousCount?: number;
  contradictionCount?: number;
  estimatedExtraHours?: number;
  analysisEngine?: AnalysisEngine;
  ollamaUsed?: boolean;
  ollamaModel?: string;
  status?: 'draft' | 'saved' | 'reviewed';
}) => {
  const project = await ensureProjectAccess(data.projectId, userId);

  if (!Types.ObjectId.isValid(data.baselineVersionId)) {
    throw new ApiError(400, 'Invalid baseline version id');
  }

  const baselineVersion = await RequirementVersionModel.findById(data.baselineVersionId);
  if (!baselineVersion || baselineVersion.project.toString() !== project._id.toString()) {
    throw new ApiError(404, 'Requirement baseline not found');
  }

  const analysis = await DriftAnalysisModel.create({
    project: project._id,
    workspace: project.workspace,
    baselineVersion: baselineVersion._id,
    baselineVersionNumber: baselineVersion.versionNumber,
    inputType: data.inputType ?? 'client_message',
    inputText: data.inputText,
    driftScore: data.driftScore,
    riskLevel: data.riskLevel,
    summary: data.summary,
    detectedChanges: data.detectedChanges,
    addedCount: data.addedCount ?? 0,
    modifiedCount: data.modifiedCount ?? 0,
    removedCount: data.removedCount ?? 0,
    ambiguousCount: data.ambiguousCount ?? 0,
    contradictionCount: data.contradictionCount ?? 0,
    estimatedExtraHours: data.estimatedExtraHours ?? 0,
    analysisEngine: data.analysisEngine ?? 'rule_based',
    ollamaUsed: data.ollamaUsed ?? false,
    ollamaModel: data.ollamaModel,
    status: data.status ?? 'saved',
    createdBy: userId,
  });

  return DriftAnalysisModel.findById(analysis._id).populate('createdBy', 'name email');
};

export const getProjectDriftAnalyses = async (projectId: string, userId: string) => {
  await ensureProjectAccess(projectId, userId);

  return DriftAnalysisModel.find({ project: projectId }).sort({ createdAt: -1 }).populate('createdBy', 'name email');
};

export const getDriftAnalysisById = async (driftAnalysisId: string, userId: string) => {
  const driftAnalysis = await ensureDriftAnalysisAccess(driftAnalysisId, userId);
  return DriftAnalysisModel.findById(driftAnalysis._id).populate('createdBy', 'name email');
};

export const deleteDriftAnalysis = async (driftAnalysisId: string, userId: string) => {
  const driftAnalysis = await ensureDriftAnalysisAccess(driftAnalysisId, userId);
  await DriftAnalysisModel.findByIdAndDelete(driftAnalysisId);
  return driftAnalysis;
};
