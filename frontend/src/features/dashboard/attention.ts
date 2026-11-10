import type { Project } from '../../types';
import type { Requirement, RequirementVersion } from '../requirements/requirement.types';
import type { DriftAnalysis } from '../drift/drift.types';
import type { ChangeRequest } from '../change-requests/changeRequest.types';

export interface ProjectSummary {
  project: Project;
  requirements: Requirement[];
  versions: RequirementVersion[];
  analyses: DriftAnalysis[];
  requests: ChangeRequest[];
}

const analysisId = (request: ChangeRequest) =>
  typeof request.driftAnalysis === 'string' ? request.driftAnalysis : request.driftAnalysis._id;

export const nextProjectAction = (summary: ProjectSummary, writable: boolean, approver: boolean) => {
  const base = `/projects/${summary.project._id}`;
  const pending = summary.requests.find((request) => request.approvalStatus === 'pending_approval');
  if (pending && approver) return { title: 'A decision is waiting', detail: pending.title, label: 'Review decision', to: `/approvals?requestId=${pending._id}` };
  if (!summary.requirements.length) return { title: 'Define the agreed scope', detail: 'Add what this project is expected to deliver.', label: writable ? 'Add agreed scope' : 'View project', to: `${base}?section=scope` };
  if (!summary.versions.length) return { title: 'Save a comparison point', detail: 'Capture the current requirements as a fixed snapshot. This is not an approval.', label: writable && approver ? 'Create scope snapshot' : 'View agreed scope', to: `${base}?section=scope` };
  const draft = summary.requests.find((request) => request.approvalStatus === 'draft' || request.approvalStatus === 'needs_revision');
  if (draft) return { title: 'A change request needs attention', detail: draft.title, label: writable ? 'Finish change request' : 'View decision', to: `${base}?section=decisions` };
  const unprepared = summary.analyses.find((analysis) => analysis._id && analysis.detectedChanges.length && !summary.requests.some((request) => analysisId(request) === analysis._id));
  if (unprepared) return { title: 'A proposed change needs a decision', detail: unprepared.summary, label: writable ? 'Prepare change request' : 'Review change', to: `${base}?section=decisions` };
  return { title: 'Ready for the next client change', detail: 'Compare a new request with the saved scope snapshot.', label: writable ? 'Compare a change' : 'View changes', to: `${base}?section=compare` };
};
