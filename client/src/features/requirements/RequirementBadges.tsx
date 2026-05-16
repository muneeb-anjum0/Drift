import type { Requirement } from './requirement.types';

const badgeBase = 'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]';

const typeStyles: Record<Requirement['type'], string> = {
  functional: 'border-lime-400/20 bg-lime-400/10 text-lime-300',
  non_functional: 'border-gray-700 bg-gray-800/70 text-gray-200',
  business: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
  technical: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
  ui_ux: 'border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-300',
  security: 'border-red-400/20 bg-red-400/10 text-red-300',
  performance: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  integration: 'border-indigo-400/20 bg-indigo-400/10 text-indigo-300',
  other: 'border-gray-700 bg-gray-800/60 text-gray-300',
};

const priorityStyles: Record<Requirement['priority'], string> = {
  low: 'border-gray-700 bg-gray-800/60 text-gray-300',
  medium: 'border-gray-700 bg-black/70 text-gray-200',
  high: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  critical: 'border-red-400/20 bg-red-400/10 text-red-300',
};

const statusStyles: Record<Requirement['status'], string> = {
  proposed: 'border-gray-700 bg-gray-800/60 text-gray-300',
  approved: 'border-lime-400/20 bg-lime-400/10 text-lime-300',
  in_progress: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  completed: 'border-lime-400/30 bg-lime-400/20 text-lime-300',
  rejected: 'border-red-400/20 bg-red-400/10 text-red-300',
  changed: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
};

const sourceStyles: Record<Requirement['source'], string> = {
  original_scope: 'border-lime-400/20 bg-lime-400/10 text-lime-300',
  manual: 'border-gray-700 bg-gray-800/60 text-gray-300',
  client_message: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
  meeting_note: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  document: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
  ai_extracted: 'border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-300',
};

const toLabel = (value: string) => value.replace(/_/g, ' ');

export const RequirementBadges = ({ requirement }: { requirement: Pick<Requirement, 'type' | 'priority' | 'status' | 'source'> }) => {
  return (
    <div className="flex flex-wrap gap-2">
      <span className={`${badgeBase} ${typeStyles[requirement.type]}`}>{toLabel(requirement.type)}</span>
      <span className={`${badgeBase} ${priorityStyles[requirement.priority]}`}>{requirement.priority}</span>
      <span className={`${badgeBase} ${statusStyles[requirement.status]}`}>{toLabel(requirement.status)}</span>
      <span className={`${badgeBase} ${sourceStyles[requirement.source]}`}>{toLabel(requirement.source)}</span>
    </div>
  );
};
