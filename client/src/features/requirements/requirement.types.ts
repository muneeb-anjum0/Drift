import type { Project, User, Workspace } from '../../types';

export type RequirementType = 'functional' | 'non_functional' | 'business' | 'technical' | 'ui_ux' | 'security' | 'performance' | 'integration' | 'other';
export type RequirementPriority = 'low' | 'medium' | 'high' | 'critical';
export type RequirementStatus = 'proposed' | 'approved' | 'in_progress' | 'completed' | 'rejected' | 'changed';
export type RequirementSource = 'original_scope' | 'manual' | 'client_message' | 'meeting_note' | 'document' | 'ai_extracted';

export interface RequirementSnapshot {
  requirementId: string;
  title: string;
  description: string;
  type: RequirementType;
  priority: RequirementPriority;
  status: RequirementStatus;
  source: RequirementSource;
  acceptanceCriteria: string[];
  tags: string[];
  estimatedEffort?: number;
}

export interface Requirement {
  _id: string;
  project: string | Pick<Project, '_id' | 'name' | 'clientName' | 'status' | 'priority' | 'originalScope'>;
  workspace: string | Pick<Workspace, '_id' | 'name' | 'slug'>;
  title: string;
  description: string;
  type: RequirementType;
  priority: RequirementPriority;
  status: RequirementStatus;
  source: RequirementSource;
  sourceText?: string;
  acceptanceCriteria: string[];
  tags: string[];
  estimatedEffort?: number | null;
  isBaseline: boolean;
  baselineVersion: number;
  createdBy: string | Pick<User, '_id' | 'name' | 'email'>;
  updatedBy?: string | Pick<User, '_id' | 'name' | 'email'>;
  createdAt: string;
  updatedAt: string;
}

export interface RequirementVersion {
  _id: string;
  project: string | Pick<Project, '_id' | 'name' | 'clientName'>;
  workspace: string | Pick<Workspace, '_id' | 'name' | 'slug'>;
  versionNumber: number;
  label: string;
  description?: string;
  requirementsSnapshot: RequirementSnapshot[];
  createdBy: string | Pick<User, '_id' | 'name' | 'email'>;
  createdAt: string;
}

export interface RequirementFormValues {
  title: string;
  description: string;
  type: RequirementType;
  priority: RequirementPriority;
  status: RequirementStatus;
  source: RequirementSource;
  sourceText: string;
  acceptanceCriteria: string;
  tags: string;
  estimatedEffort: string;
}

export interface RequirementFormSubmitValues {
  title: string;
  description: string;
  type: RequirementType;
  priority: RequirementPriority;
  status: RequirementStatus;
  source: RequirementSource;
  sourceText: string;
  acceptanceCriteria: string[];
  tags: string[];
  estimatedEffort?: number;
}

export interface RequirementCreatePayload extends RequirementFormSubmitValues {
  projectId: string;
  workspaceId?: string;
}

export interface RequirementUpdatePayload extends Partial<RequirementFormSubmitValues> {}

export interface RequirementExtractionSuggestion extends RequirementFormSubmitValues {}

export interface RequirementBaselinePayload {
  projectId: string;
  label?: string;
  description?: string;
}
