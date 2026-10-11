import { EmptyState } from '../../components/common/EmptyState';
import { DetectedChangeCard } from './DetectedChangeCard';
import type { DetectedChange } from './drift.types';

const groupedTypes: Array<{ label: string; changeType: DetectedChange['changeType'][] }> = [
  { label: 'New requirements', changeType: ['added'] },
  { label: 'Changed requirements', changeType: ['modified'] },
  { label: 'Requirements removed', changeType: ['removed'] },
  { label: 'Needs clarification', changeType: ['ambiguous'] },
  { label: 'Conflicts with agreement', changeType: ['contradiction'] },
];

export const DetectedChangesList = ({ changes }: { changes: DetectedChange[] }) => {
  const visibleChanges = changes.filter((change) => change.changeType !== 'unchanged');

  if (!visibleChanges.length) {
    return (
      <EmptyState
        title="No meaningful change proposed"
        description="Review the input yourself before treating scope as unchanged."
        icon={<span className="text-lime-400">DRIFT</span>}
      />
    );
  }

  return (
    <div className="space-y-4">
      {groupedTypes.map((group) => {
        const groupedChanges = visibleChanges.filter((change) => group.changeType.includes(change.changeType));
        if (!groupedChanges.length) return null;

        return (
          <section key={group.label} className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-400">{group.label}</h4>
              <span className="rounded-full border border-gray-700 bg-black/70 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-gray-300">
                {groupedChanges.length}
              </span>
            </div>
            <div className="space-y-2.5">
              {groupedChanges.map((change, index) => (
                <DetectedChangeCard key={`${change.title}-${index}`} change={change} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};
