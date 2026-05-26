import type { Project, User, Workspace } from '../../types';

export type DriftInputType = 'client_message' | 'meeting_note' | 'scope_update' | 'document_text' | 'other';
export type ChangeType = 'added' | 'modified' | 'removed' | 'ambiguous' | 'contradiction' | 'unchanged';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type AnalysisEngine = 'rule_based' | 'ollama' | 'hybrid';

export interface DetectedChange {
  changeType: ChangeType;
  title: string;
  description: string;
  baselineRequirementId?: string;
  baselineRequirementTitle?: string;
  newText?: string;
  oldText?: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  estimatedEffort?: number;
  confidence: number;
  recommendation: string;
}

export interface DriftAnalysis {
  _id?: string;
  project: string | Pick<Project, '_id' | 'name' | 'clientName' | 'status' | 'priority'>;
  workspace: string | Pick<Workspace, '_id' | 'name' | 'slug'>;
  baselineVersion: string;
  baselineVersionNumber: number;
  inputType: DriftInputType;
  inputText: string;
  driftScore: number;
  riskLevel: RiskLevel;
  summary: string;
  detectedChanges: DetectedChange[];
  addedCount: number;
  modifiedCount: number;
  removedCount: number;
  ambiguousCount: number;
  contradictionCount: number;
  estimatedExtraHours: number;
  analysisEngine: AnalysisEngine;
  ollamaUsed: boolean;
  ollamaModel?: string | null;
  status: 'draft' | 'saved' | 'reviewed';
  createdBy: string | Pick<User, '_id' | 'name' | 'email'>;
  createdAt: string;
  updatedAt: string;
}

export interface DriftAnalysisPreview {
  projectId: string;
  baselineVersionId: string;
  baselineVersionNumber: number;
  inputType: DriftInputType;
  inputText: string;
  driftScore: number;
  riskLevel: RiskLevel;
  summary: string;
  detectedChanges: DetectedChange[];
  addedCount: number;
  modifiedCount: number;
  removedCount: number;
  ambiguousCount: number;
  contradictionCount: number;
  estimatedExtraHours: number;
  analysisEngine: AnalysisEngine;
  ollamaUsed: boolean;
  ollamaModel?: string | null;
}

export interface DriftAnalysisFormValues {
  baselineVersionId: string;
  inputType: DriftInputType;
  inputText: string;
}
