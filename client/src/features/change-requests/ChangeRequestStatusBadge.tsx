import type { ChangeRequestStatus } from './changeRequest.types';

const badgeClassName = (status: ChangeRequestStatus) => {
  if (status === 'draft') return 'border-gray-700 bg-gray-800/60 text-gray-300';
  if (status === 'sent') return 'border-lime-400/20 bg-lime-400/10 text-lime-300';
  if (status === 'approved') return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300';
  if (status === 'rejected') return 'border-red-400/20 bg-red-400/10 text-red-300';
  return 'border-amber-400/20 bg-amber-400/10 text-amber-300';
};

export const ChangeRequestStatusBadge = ({ status }: { status: ChangeRequestStatus }) => {
  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${badgeClassName(status)}`}>{status}</span>;
};
