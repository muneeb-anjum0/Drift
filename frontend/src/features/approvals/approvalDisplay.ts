import type { ApprovalStatus, ChangeRequest } from '../change-requests/changeRequest.types';

export const approvalStatuses: ApprovalStatus[] = ['draft', 'pending_approval', 'approved', 'rejected', 'needs_revision'];

export const normalizeApprovalStatus = (status?: ApprovalStatus): ApprovalStatus => status ?? 'draft';

export const approvalStatusLabel = (status?: ApprovalStatus) => {
  const normalized = normalizeApprovalStatus(status);
  if (normalized === 'pending_approval') return 'Pending approval';
  if (normalized === 'needs_revision') return 'Needs revision';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

export const approvalBadgeClassName = (status?: ApprovalStatus) => {
  const normalized = normalizeApprovalStatus(status);
  if (normalized === 'pending_approval') return 'border-lime-400/30 bg-lime-400/10 text-lime-300';
  if (normalized === 'approved') return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300';
  if (normalized === 'rejected') return 'border-red-400/30 bg-red-400/10 text-red-300';
  if (normalized === 'needs_revision') return 'border-amber-400/30 bg-amber-400/10 text-amber-300';
  return 'border-white/10 bg-white/[0.04] text-gray-300';
};

export const approvalActionLabel = (action: 'submit' | 'approve' | 'reject' | 'needs_revision') => {
  if (action === 'submit') return 'Submit for approval';
  if (action === 'approve') return 'Approve';
  if (action === 'reject') return 'Reject';
  return 'Request revision';
};

export const projectName = (changeRequest: ChangeRequest) => {
  return typeof changeRequest.project === 'string' ? 'Project' : changeRequest.project.name;
};

export const changeRequestDisplayTitle = (changeRequest: ChangeRequest) => {
  const summaryText = [changeRequest.summary, changeRequest.changesRequested?.[0]?.description]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = summaryText.split(' ').filter(Boolean).slice(0, 8).join(' ');
  if (!words) return changeRequest.title || 'Change request';
  return `${words}${summaryText.split(' ').length > 8 ? '...' : ''}`;
};
