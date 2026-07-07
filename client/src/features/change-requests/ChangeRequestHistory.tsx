import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import { formatDate } from '../../utils/formatDate';
import type { ChangeRequest, ChangeRequestStatus } from './changeRequest.types';
import { ChangeRequestStatusBadge } from './ChangeRequestStatusBadge';
import { ApprovalStatusBadge } from '../approvals/ApprovalStatusBadge';
import { normalizeApprovalStatus } from '../approvals/approvalDisplay';
import { generatedByLabel } from './changeRequestDisplay';

const selectClass =
  'h-9 w-full rounded-[0.9rem] border border-gray-700 bg-black px-3 text-sm text-white shadow-sm outline-none transition focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30';

const statusOptions: ChangeRequestStatus[] = ['draft', 'sent', 'approved', 'rejected', 'archived'];

const ChangeRequestHistoryItem = ({
  changeRequest,
  onUpdate,
  onSubmitApproval,
  onDelete,
  isUpdating,
  isApprovalUpdating,
  isDeleting,
}: {
  changeRequest: ChangeRequest;
  onUpdate: (changeRequest: ChangeRequest, status: ChangeRequestStatus) => void;
  onSubmitApproval: (changeRequest: ChangeRequest) => void;
  onDelete: (changeRequest: ChangeRequest) => void;
  isUpdating?: boolean;
  isApprovalUpdating?: boolean;
  isDeleting?: boolean;
}) => {
  const [status, setStatus] = useState(changeRequest.status);
  const canSubmitForApproval = ['draft', 'needs_revision', 'rejected'].includes(normalizeApprovalStatus(changeRequest.approvalStatus));

  return (
    <Card className="overflow-hidden border-gray-800 bg-black/55 p-0">
      <div className="grid gap-0 lg:grid-cols-[0.35rem_minmax(0,1fr)]">
        <div className="hidden bg-lime-400/30 lg:block" />
        <div className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-lime-400">Change request</p>
          <h4 className="mt-1 text-base font-semibold text-white">{changeRequest.title}</h4>
          <p className="mt-1 text-xs text-gray-400">Created {formatDate(changeRequest.createdAt)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-gray-700 bg-black/70 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-gray-300">
            {typeof changeRequest.project === 'string' ? 'Project' : changeRequest.project.name}
          </span>
          <ChangeRequestStatusBadge status={changeRequest.status} />
          <ApprovalStatusBadge status={changeRequest.approvalStatus} />
          <span className="rounded-full border border-gray-700 bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
            {generatedByLabel(changeRequest.generatedBy)}
          </span>
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-gray-300">{changeRequest.summary}</p>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-[1rem] border border-gray-800 bg-black/40 p-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-gray-500">Timeline impact</p>
          <p className="mt-2 text-xs leading-5 text-gray-300">{changeRequest.timelineImpact}</p>
        </div>
        <div className="rounded-[1rem] border border-gray-800 bg-black/40 p-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-gray-500">Cost impact</p>
          <p className="mt-2 text-xs leading-5 text-gray-300">{changeRequest.costImpact}</p>
        </div>
      </div>

      <div className="mt-3 rounded-[1rem] border border-gray-800 bg-black/40 p-3">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-gray-500">Requested changes</p>
        <div className="mt-2 space-y-2">
          {changeRequest.changesRequested.map((change, index) => (
            <div key={`${change.title}-${index}`} className="rounded-[0.9rem] border border-gray-800 bg-black/50 p-3">
              <p className="text-sm font-semibold text-white">{change.title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-400">{change.description}</p>
              {change.affectedModules?.length ? (
                <p className="mt-2 text-xs text-gray-500">Affected modules: {change.affectedModules.join(', ')}</p>
              ) : null}
              <p className="mt-2 text-xs uppercase tracking-[0.14em] text-gray-500">
                {change.changeType} / {change.impact} / {change.estimatedEffort ?? 0}h
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(180px,1fr)_auto_auto_auto_auto] lg:items-end">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-gray-300">Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as ChangeRequestStatus)} className={selectClass}>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <Button type="button" variant="secondary" size="sm" onClick={() => onUpdate(changeRequest, status)} disabled={isUpdating || status === changeRequest.status}>
          Update status
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => onSubmitApproval(changeRequest)} disabled={isApprovalUpdating || !canSubmitForApproval || !changeRequest._id}>
          Submit for approval
        </Button>
        <Link to={`/approvals?requestId=${changeRequest._id ?? ''}`}>
          <Button type="button" variant="secondary" size="sm">
            View in Approvals
          </Button>
        </Link>
        <Button type="button" variant="danger" size="sm" onClick={() => onDelete(changeRequest)} disabled={isDeleting}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>
        </div>
      </div>
    </Card>
  );
};

export const ChangeRequestHistory = ({
  changeRequests,
  onUpdate,
  onSubmitApproval,
  onDelete,
  isUpdating = false,
  isApprovalUpdating = false,
  isDeleting = false,
}: {
  changeRequests: ChangeRequest[];
  onUpdate: (changeRequest: ChangeRequest, status: ChangeRequestStatus) => void;
  onSubmitApproval: (changeRequest: ChangeRequest) => void;
  onDelete: (changeRequest: ChangeRequest) => void;
  isUpdating?: boolean;
  isApprovalUpdating?: boolean;
  isDeleting?: boolean;
}) => {
  if (!changeRequests.length) {
    return (
      <EmptyState
        title="No change requests yet"
        description="Generate and save a client-friendly request after reviewing a drift analysis."
        icon={<span className="text-lime-400">CR</span>}
      />
    );
  }

  return (
    <div className="space-y-4">
      {changeRequests.map((changeRequest) => (
        <ChangeRequestHistoryItem
          key={changeRequest._id ?? changeRequest.title}
          changeRequest={changeRequest}
          onUpdate={onUpdate}
          onSubmitApproval={onSubmitApproval}
          onDelete={onDelete}
          isUpdating={isUpdating}
          isApprovalUpdating={isApprovalUpdating}
          isDeleting={isDeleting}
        />
      ))}
    </div>
  );
};
