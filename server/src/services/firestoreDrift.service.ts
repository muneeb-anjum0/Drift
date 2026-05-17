import { firestore } from '../config/firebase.js';
import { ApiError } from '../utils/ApiError.js';
import { logActivity } from './activity.service.js';
import { getRequirementById } from './firestoreRequirement.service.js';
import { getProjectById } from './firestoreProject.service.js';
import type { FirestoreDriftAnalysis } from './firebaseInit.service.js';

const DRIFT_ANALYSES_COLLECTION = 'driftAnalyses';

export interface DriftAnalysisInput {
  requirement: string;
  baseline: string;
  input: string;
  changes: {
    added: string[];
    modified: string[];
    removed: string[];
    ambiguous: string[];
  };
  score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const createDriftAnalysis = async (userId: string, data: DriftAnalysisInput) => {
  const requirement = await getRequirementById(data.requirement, userId);
  const project = await getProjectById(requirement.project, userId);

  const now = new Date();
  const analysisRef = firestore.collection(DRIFT_ANALYSES_COLLECTION).doc();

  const analysis: FirestoreDriftAnalysis = {
    _id: analysisRef.id,
    project: requirement.project,
    requirement: data.requirement,
    baseline: data.baseline,
    input: data.input,
    score: data.score,
    severity: data.severity,
    changes: data.changes,
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
    metadata: { requirement: data.requirement, score: data.score },
  });

  return analysis;
};

export const getDriftAnalysisById = async (analysisId: string, userId: string) => {
  const docSnapshot = await firestore.collection(DRIFT_ANALYSES_COLLECTION).doc(analysisId).get();

  if (!docSnapshot.exists) {
    throw new ApiError(404, 'Drift analysis not found');
  }

  const analysis = docSnapshot.data() as FirestoreDriftAnalysis;

  // Verify project access
  await getProjectById(analysis.project, userId);

  return analysis;
};

export const listDriftAnalysesByProject = async (projectId: string, userId: string) => {
  const project = await getProjectById(projectId, userId);

  const analysesQuery = await firestore
    .collection(DRIFT_ANALYSES_COLLECTION)
    .where('project', '==', projectId)
    .orderBy('createdAt', 'desc')
    .get();

  return analysesQuery.docs.map((doc) => doc.data() as FirestoreDriftAnalysis);
};

export const listDriftAnalysesByRequirement = async (requirementId: string, userId: string) => {
  const requirement = await getRequirementById(requirementId, userId);

  const analysesQuery = await firestore
    .collection(DRIFT_ANALYSES_COLLECTION)
    .where('requirement', '==', requirementId)
    .orderBy('createdAt', 'desc')
    .get();

  return analysesQuery.docs.map((doc) => doc.data() as FirestoreDriftAnalysis);
};

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
    metadata: { requirement: analysis.requirement },
  });

  return analysis;
};
