import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, FileCheck2, RotateCcw, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { Spinner } from '../components/common/Spinner';
import { useApprovalDecision, useApprovals } from '../hooks/useChangeRequests';
import { formatDate } from '../utils/formatDate';
import type { ApprovalStatus, ChangeRequest } from '../features/change-requests/changeRequest.types';
import { ApprovalStatusBadge } from '../features/approvals/ApprovalStatusBadge';
import {
  approvalActionLabel,
  approvalStatuses,
  approvalStatusLabel,
  changeRequestDisplayTitle,
  normalizeApprovalStatus,
  projectName,
} from '../features/approvals/approvalDisplay';

type ApprovalAction = 'submit' | 'approve' | 'reject' | 'needs_revision';
type ApprovalFilter = 'all' | ApprovalStatus;

const statusFilters: ApprovalFilter[] = ['all', ...approvalStatuses];

const actionStatus: Record<ApprovalAction, ApprovalStatus> = {
  submit: 'pending_approval',
  approve: 'approved',
  reject: 'rejected',
  needs_revision: 'needs_revision',
};

const availableActions = (changeRequest: ChangeRequest): ApprovalAction[] => {
  const status = normalizeApprovalStatus(changeRequest.approvalStatus);
  if (status === 'draft' || status === 'needs_revision' || status === 'rejected') return ['submit'];
  if (status === 'pending_approval') return ['approve', 'reject', 'needs_revision'];
  return [];
};

const kpiItems = (approvals: ChangeRequest[]) => [
  { label: 'Pending', value: approvals.filter((item) => normalizeApprovalStatus(item.approvalStatus) === 'pending_approval').length, icon: Clock3 },
  { label: 'Approved', value: approvals.filter((item) => normalizeApprovalStatus(item.approvalStatus) === 'approved').length, icon: CheckCircle2 },
  { label: 'Rejected', value: approvals.filter((item) => normalizeApprovalStatus(item.approvalStatus) === 'rejected').length, icon: XCircle },
  { label: 'Revision', value: approvals.filter((item) => normalizeApprovalStatus(item.approvalStatus) === 'needs_revision').length, icon: RotateCcw },
];

const ApprovalDecisionModal = ({
  action,
  changeRequest,
  isPending,
  onClose,
  onConfirm,
}: {
  action: ApprovalAction | null;
  changeRequest: ChangeRequest | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
}) => {
  const [note, setNote] = useState('');

  useEffect(() => {
    setNote('');
  }, [action, changeRequest?._id]);

  if (!action || !changeRequest) return null;

  return (
    <Modal
      open
      title={approvalActionLabel(action)}
      description={changeRequestDisplayTitle(changeRequest)}
      onClose={onClose}
      size="md"
      density="compact"
      footer={(
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={() => onConfirm(note)} disabled={isPending}>
            {isPending ? 'Saving...' : approvalActionLabel(action)}
          </Button>
        </div>
      )}
    >
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[var(--color-text)]">Decision note</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, 1200))}
          rows={4}
          className="w-full rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text)] outline-none focus:border-lime-400 focus:ring-2 focus:ring-lime-400/20"
          placeholder="Optional context for the approval history"
        />
      </label>
    </Modal>
  );
};

const ApprovalDetailModal = ({ changeRequest, onClose }: { changeRequest: ChangeRequest | null; onClose: () => void }) => {
  if (!changeRequest) return null;

  return (
    <Modal open title={changeRequest.title} description={projectName(changeRequest)} onClose={onClose} size="xl" density="compact">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <ApprovalStatusBadge status={changeRequest.approvalStatus} />
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-[var(--color-text-muted)]">
            Created {formatDate(changeRequest.createdAt)}
          </span>
          {changeRequest.decisionAt ? (
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-[var(--color-text-muted)]">
              Decided {formatDate(changeRequest.decisionAt)}
            </span>
          ) : null}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-400">Summary</p>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{changeRequest.summary}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-white/10 bg-black/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Timeline</p>
            <p className="mt-2 text-sm leading-6 text-gray-300">{changeRequest.timelineImpact}</p>
          </Card>
          <Card className="border-white/10 bg-black/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Cost</p>
            <p className="mt-2 text-sm leading-6 text-gray-300">{changeRequest.costImpact}</p>
          </Card>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-400">Approval history</p>
          <div className="mt-3 divide-y divide-white/10 rounded-[var(--radius-card)] border border-white/10">
            {(changeRequest.approvalHistory ?? []).length ? (
              changeRequest.approvalHistory?.map((event, index) => (
                <div key={`${event.status}-${event.createdAt}-${index}`} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <ApprovalStatusBadge status={event.status} />
                    <span className="text-xs text-[var(--color-text-muted)]">{formatDate(event.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-text)]">{event.actorName || 'Approver'}</p>
                  {event.note ? <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">{event.note}</p> : null}
                </div>
              ))
            ) : (
              <p className="p-4 text-sm text-[var(--color-text-muted)]">No approval activity yet.</p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export const ApprovalsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const approvalsQuery = useApprovals();
  const decisionMutation = useApprovalDecision();
  const [filter, setFilter] = useState<ApprovalFilter>('all');
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
  const [decisionTarget, setDecisionTarget] = useState<ChangeRequest | null>(null);
  const [decisionAction, setDecisionAction] = useState<ApprovalAction | null>(null);

  const approvals = approvalsQuery.data ?? [];
  const filteredApprovals = useMemo(() => {
    if (filter === 'all') return approvals;
    return approvals.filter((item) => normalizeApprovalStatus(item.approvalStatus) === filter);
  }, [approvals, filter]);

  useEffect(() => {
    const requestId = searchParams.get('requestId');
    if (!requestId || !approvals.length) return;
    const match = approvals.find((item) => item._id === requestId);
    if (match) setSelectedRequest(match);
  }, [approvals, searchParams]);

  const openDecision = (changeRequest: ChangeRequest, action: ApprovalAction) => {
    setDecisionTarget(changeRequest);
    setDecisionAction(action);
  };

  const closeDetail = () => {
    setSelectedRequest(null);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('requestId');
      return next;
    }, { replace: true });
  };

  const handleDecision = async (note: string) => {
    if (!decisionTarget?._id || !decisionAction) return;
    await decisionMutation.mutateAsync({
      action: decisionAction,
      changeRequestId: decisionTarget._id,
      projectId: typeof decisionTarget.project === 'string' ? decisionTarget.project : decisionTarget.project._id,
      note,
    });
    setDecisionTarget(null);
    setDecisionAction(null);
  };

  if (approvalsQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 text-[var(--color-text)]">
      <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
        <p className="app-eyebrow">Approvals</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Client approval queue</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
              Review submitted change requests, record decisions, and keep a clean approval history.
            </p>
          </div>
          <FileCheck2 className="h-7 w-7 text-lime-400" />
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpiItems(approvals).map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-white/10 bg-black/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
              </div>
              <Icon className="h-5 w-5 text-lime-400" />
            </div>
          </Card>
        ))}
      </div>

      <Card className="border-white/10 bg-black/60 p-5">
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((item) => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={filter === item ? 'primary' : 'secondary'}
              onClick={() => setFilter(item)}
            >
              {item === 'all' ? 'All' : approvalStatusLabel(item)}
            </Button>
          ))}
        </div>

        <div className="mt-5">
          {!filteredApprovals.length ? (
            <EmptyState title="No approvals here yet" description="Submit a saved change request for approval to populate this queue." />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredApprovals.map((changeRequest) => {
                const actions = availableActions(changeRequest);
                return (
                  <Card key={changeRequest._id ?? changeRequest.title} className="border-white/10 bg-black/45 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-400">{projectName(changeRequest)}</p>
                        <h2 className="mt-2 text-lg font-semibold text-white">{changeRequestDisplayTitle(changeRequest)}</h2>
                        <p className="mt-2 text-sm leading-6 text-gray-400">{changeRequest.summary}</p>
                      </div>
                      <ApprovalStatusBadge status={changeRequest.approvalStatus} />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs text-gray-500">Updated {formatDate(changeRequest.updatedAt)}</span>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="secondary" onClick={() => setSelectedRequest(changeRequest)}>
                          Details
                        </Button>
                        {actions.map((action) => (
                          <Button
                            key={action}
                            type="button"
                            size="sm"
                            variant={actionStatus[action] === 'rejected' ? 'danger' : 'primary'}
                            onClick={() => openDecision(changeRequest, action)}
                          >
                            {approvalActionLabel(action)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <ApprovalDetailModal changeRequest={selectedRequest} onClose={closeDetail} />
      <ApprovalDecisionModal
        action={decisionAction}
        changeRequest={decisionTarget}
        isPending={decisionMutation.isPending}
        onClose={() => {
          setDecisionTarget(null);
          setDecisionAction(null);
        }}
        onConfirm={handleDecision}
      />
    </motion.div>
  );
};
