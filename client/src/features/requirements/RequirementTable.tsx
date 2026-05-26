import { Pencil, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { RequirementCard } from './RequirementCard';
import { RequirementBadges } from './RequirementBadges';
import { EmptyState } from '../../components/common/EmptyState';
import type { Requirement } from './requirement.types';
import { formatDate } from '../../utils/formatDate';

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
  if (!requirements.length) {
    return (
      <EmptyState
        title="No requirements yet"
        description="Add a requirement manually or extract them from the project scope to build the baseline."
        icon={<span className="text-lime-400">REQ</span>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:hidden">
        {requirements.map((requirement) => (
          <RequirementCard
            key={requirement._id}
            requirement={requirement}
            onEdit={() => onEdit(requirement)}
            onDelete={() => onDelete(requirement)}
          />
        ))}
      </div>

      <div className="hidden space-y-3 lg:block">
        {requirements.map((requirement, index) => (
          <motion.article
            key={requirement._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            whileHover={{ y: -3 }}
            className="rounded-[1.75rem] border border-white/10 bg-black/55 p-5 transition-colors hover:border-lime-400/25 hover:bg-lime-400/[0.04]"
          >
            <div className="flex items-start justify-between gap-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <MetaPill tone="lime">{valueLabel(requirement.type)}</MetaPill>
                  <MetaPill>{valueLabel(requirement.status)}</MetaPill>
                  <MetaPill>{valueLabel(requirement.source)}</MetaPill>
                </div>

                <h4 className="mt-4 text-xl font-semibold text-white">{requirement.title}</h4>
                <p className="mt-2 line-clamp-2 max-w-4xl text-base leading-7 text-gray-400">{requirement.description}</p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <RequirementBadges requirement={requirement} />
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-gray-400">
                    {requirement.estimatedEffort ? `${requirement.estimatedEffort}h effort` : 'Effort not set'}
                  </span>
                  <span className="text-sm text-gray-500">Updated {formatDate(requirement.updatedAt)}</span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(requirement)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-lime-400/20 bg-lime-400/10 text-lime-300 transition hover:border-lime-400/40 hover:bg-lime-400/15"
                  aria-label={`Edit ${requirement.title}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(requirement)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-gray-300 transition hover:border-lime-400/30 hover:bg-lime-400/10 hover:text-lime-200"
                  aria-label={`Delete ${requirement.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
};
