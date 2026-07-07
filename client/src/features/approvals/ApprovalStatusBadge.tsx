import type { ApprovalStatus } from '../change-requests/changeRequest.types';
import { approvalBadgeClassName, approvalStatusLabel } from './approvalDisplay';

export const ApprovalStatusBadge = ({ status }: { status?: ApprovalStatus }) => {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${approvalBadgeClassName(status)}`}>
      {approvalStatusLabel(status)}
    </span>
  );
};
