import type { Project, User, Workspace } from '../../types';
import type { DriftAnalysis, DetectedChange } from '../drift/drift.types';

export type ChangeRequestStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'archived';

export interface ChangeRequestChange {
  title: string;
  description: string;
  changeType: 'added' | 'modified' | 'removed' | 'ambiguous' | 'contradiction';
  impact: 'low' | 'medium' | 'high' | 'critical';
  estimatedEffort?: number;
}

export interface ChangeRequest {
  _id?: string;
  project: string | Pick<Project, '_id' | 'name' | 'clientName'>;
  workspace: string | Pick<Workspace, '_id' | 'name' | 'slug'>;
  driftAnalysis: string | Pick<DriftAnalysis, '_id' | 'baselineVersionNumber' | 'riskLevel' | 'driftScore'>;
  title: string;
  clientName?: string;
  summary: string;
  changesRequested: ChangeRequestChange[];
  businessReason: string;
  timelineImpact: string;
  costImpact: string;
  recommendedAction: string;
  approvalNote: string;
  status: ChangeRequestStatus;
  generatedBy: 'rule_based' | 'ollama' | 'hybrid';
  createdBy: string | Pick<User, '_id' | 'name' | 'email'>;
  createdAt: string;
  updatedAt: string;
}

export interface ChangeRequestDraft {
  driftAnalysisId: string;
  title: string;
  clientName: string;
  summary: string;
  changesRequested: ChangeRequestChange[];
  businessReason: string;
  timelineImpact: string;
  costImpact: string;
  recommendedAction: string;
  approvalNote: string;
  status: ChangeRequestStatus;
  generatedBy: 'rule_based' | 'ollama' | 'hybrid';
}

export interface ChangeRequestFormValues {
  title: string;
  clientName: string;
  summary: string;
  businessReason: string;
  timelineImpact: string;
  costImpact: string;
  recommendedAction: string;
  approvalNote: string;
  status: ChangeRequestStatus;
}
