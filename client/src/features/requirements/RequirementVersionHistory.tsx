import { Clock3, History } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { formatDate } from '../../utils/formatDate';
import type { RequirementVersion } from './requirement.types';

export const RequirementVersionHistory = ({ versions }: { versions: RequirementVersion[] }) => {
  if (!versions.length) {
    return (
      <EmptyState
        title="No baseline versions yet."
        description="Create a baseline after your current requirements are structured."
        icon={<History className="h-5 w-5" />}
      />
    );
  }

  return (
    <Card className="p-6 border-lime-400/20 bg-black/60">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-lime-400">Version history</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Baseline versions</h3>
        </div>
        <History className="h-5 w-5 text-lime-400" />
      </div>

      <div className="space-y-3">
        {versions.map((version) => (
          <div key={version._id} className="rounded-2xl border border-gray-800 bg-black/40 p-4 transition hover:border-lime-400/30">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Version {version.versionNumber}</p>
                <p className="mt-1 text-sm text-lime-300">{version.label || 'Baseline snapshot'}</p>
              </div>
              <div className="rounded-full border border-lime-400/20 bg-lime-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-lime-300">
                {version.requirementsSnapshot.length} requirements
              </div>
            </div>
            {version.description ? <p className="mt-3 text-sm leading-6 text-gray-400">{version.description}</p> : null}
            <div className="mt-4 flex items-center justify-between gap-3 text-xs text-gray-500">
              <span className="inline-flex items-center gap-2">
                <Clock3 className="h-3.5 w-3.5 text-lime-400" />
                {formatDate(version.createdAt)}
              </span>
              <span className="truncate text-right">
                Created by {typeof version.createdBy === 'string' ? 'Team member' : version.createdBy.name}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
