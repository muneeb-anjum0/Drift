import { useState } from 'react';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { RequirementBadges } from './RequirementBadges';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import type { Requirement } from './requirement.types';
import { formatDate } from '../../utils/formatDate';
import { cn } from '../../utils/cn';

const REQUIREMENTS_PAGE_SIZE = 10;

const valueLabel = (value: Requirement['status'] | Requirement['type'] | Requirement['source']) => value.replace(/_/g, ' ');

const MetaPill = ({ children, tone = 'muted' }: { children: string; tone?: 'lime' | 'muted' }) => (
  <span
    className={
      tone === 'lime'
        ? 'rounded-full border border-lime-400/20 bg-lime-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-lime-300'
        : 'rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-gray-300'
    }
  >
    {children}
  </span>
);

export const RequirementTable = ({
  requirements,
  onEdit,
  onDelete,
}: {
  requirements: Requirement[];
  onEdit: (requirement: Requirement) => void;
  onDelete: (requirement: Requirement) => void;
}) => {
  const [openRequirementId, setOpenRequirementId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(REQUIREMENTS_PAGE_SIZE);

  if (!requirements.length) {
    return (
      <EmptyState
        title="No requirements yet"
        description="Add a requirement manually or extract them from the project scope to build the baseline."
        icon={<span className="text-lime-400">REQ</span>}
      />
    );
  }

  const visibleRequirements = requirements.slice(0, visibleCount);
  const hasMore = visibleCount < requirements.length;

  return (
    <div className="space-y-3">
      <div className="divide-y divide-[var(--color-border)] overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)]">
        {visibleRequirements.map((requirement) => {
          const isOpen = openRequirementId === requirement._id;

          return (
            <div key={requirement._id} className="bg-[var(--color-surface)]">
              <button
                type="button"
                onClick={() => setOpenRequirementId(isOpen ? null : requirement._id)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-[var(--color-bg-soft)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-focus)]"
                aria-expanded={isOpen}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[var(--color-text)]">{requirement.title}</span>
                  <span className="mt-1 block truncate text-xs text-[var(--color-text-muted)]">
                    {valueLabel(requirement.type)} · {valueLabel(requirement.status)} · Updated {formatDate(requirement.updatedAt)}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="hidden rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[var(--color-text)] sm:inline-flex">
                    {requirement.estimatedEffort ? `${requirement.estimatedEffort}h` : 'No estimate'}
                  </span>
                  <ChevronDown className={cn('h-4 w-4 text-[var(--color-text-muted)] transition-transform duration-200', isOpen && 'rotate-180')} />
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="bg-[var(--color-bg-soft)] px-4 pb-4">
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <MetaPill tone="lime">{valueLabel(requirement.type)}</MetaPill>
                        <MetaPill>{valueLabel(requirement.status)}</MetaPill>
                        <MetaPill>{valueLabel(requirement.source)}</MetaPill>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{requirement.description}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <RequirementBadges requirement={requirement} />
                        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
                          {requirement.estimatedEffort ? `${requirement.estimatedEffort}h effort` : 'Effort not set'}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap justify-end gap-2">
                        <Button type="button" variant="secondary" size="sm" onClick={() => onEdit(requirement)}>
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button type="button" variant="danger" size="sm" onClick={() => onDelete(requirement)}>
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {hasMore ? (
        <div className="flex justify-center">
          <Button type="button" variant="secondary" size="sm" onClick={() => setVisibleCount((count) => count + REQUIREMENTS_PAGE_SIZE)}>
            Show more
          </Button>
        </div>
      ) : null}
    </div>
  );
};
