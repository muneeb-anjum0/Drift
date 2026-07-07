import type { ReactNode } from 'react';
import { FileText, GitCompareArrows, History, ListChecks, Upload, type LucideIcon } from 'lucide-react';
import type { Requirement, RequirementFormValues } from '../requirements/requirement.types';

export type ActiveProjectSection = 'requirements' | 'drift' | 'history' | 'changes' | 'documents';

export const projectSectionTabs: Array<{ id: ActiveProjectSection; label: string; description: string; icon: LucideIcon }> = [
  { id: 'requirements', label: 'Requirements', description: 'Scope, extraction, baselines', icon: ListChecks },
  { id: 'drift', label: 'Drift Analysis', description: 'Compare new client input', icon: GitCompareArrows },
  { id: 'history', label: 'History', description: 'Saved drift analyses', icon: History },
  { id: 'changes', label: 'Change Requests', description: 'Client-ready approvals', icon: FileText },
  { id: 'documents', label: 'Documents', description: 'Briefs, scope files, notes', icon: Upload },
];

export const requirementToFormValues = (requirement: Requirement): Partial<RequirementFormValues> => ({
  title: requirement.title,
  description: requirement.description,
  type: requirement.type,
  priority: requirement.priority,
  status: requirement.status,
  source: requirement.source,
  sourceText: requirement.sourceText ?? '',
  acceptanceCriteria: requirement.acceptanceCriteria.join('\n'),
  tags: requirement.tags.join(', '),
  estimatedEffort: requirement.estimatedEffort?.toString() ?? '',
});

export const formatProjectValue = (projectValue: string) => projectValue.replace(/_/g, ' ');

export const PanelHeader = ({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="flex flex-wrap items-start justify-between gap-4">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-lime-400">{eyebrow}</p>
      <h3 className="mt-1 text-xl font-semibold text-white">{title}</h3>
      {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">{description}</p> : null}
    </div>
    {action}
  </div>
);

export const MetricTile = ({ label, value, icon: Icon }: { label: string; value: ReactNode; icon: LucideIcon }) => (
  <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.03] p-3">
    <div className="flex items-center justify-between gap-2.5">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-gray-500">{label}</p>
      <Icon className="h-4 w-4 text-lime-400" />
    </div>
    <div className="mt-2 text-base font-semibold text-white">{value}</div>
  </div>
);

export const ScopeBlock = ({ title, value }: { title: string; value: string }) => (
  <div className="rounded-[1.1rem] border border-white/10 bg-black/40 p-3">
    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-lime-400">{title}</p>
    <p className="mt-2 max-h-28 overflow-y-auto whitespace-pre-line pr-2 text-xs leading-5 text-gray-300">
      {value || `No ${title.toLowerCase()} recorded.`}
    </p>
  </div>
);
