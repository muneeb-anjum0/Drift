export type DriftInputType = 'client_message' | 'meeting_note' | 'scope_update' | 'document_text' | 'other';

export type DriftChangeType = 'added' | 'modified' | 'removed' | 'ambiguous' | 'contradiction' | 'unchanged';

export type DriftImpact = 'low' | 'medium' | 'high' | 'critical';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type AnalysisEngine = 'rule_based' | 'ollama' | 'hybrid';

export interface DetectedChange {
  changeType: DriftChangeType;
  title: string;
  description: string;
  baselineRequirementId?: string;
  baselineRequirementTitle?: string;
  newText?: string;
  oldText?: string;
  impact: DriftImpact;
  estimatedEffort?: number;
  confidence: number;
  recommendation: string;
}

export interface DriftAnalysisPreview {
  projectId: string;
  workspaceId: string;
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

export interface ChangeRequestChange {
  title: string;
  description: string;
  changeType: Exclude<DriftChangeType, 'unchanged'>;
  impact: DriftImpact;
  estimatedEffort?: number;
}
