import { Card } from '../../components/common/Card';
import type { DetectedChange } from './drift.types';

const changeStyles: Record<DetectedChange['changeType'], string> = {
  added: 'border-lime-400/20 bg-lime-400/10 text-lime-300',
  modified: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  removed: 'border-red-400/20 bg-red-400/10 text-red-300',
  ambiguous: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
  contradiction: 'border-orange-400/20 bg-orange-400/10 text-orange-300',
  unchanged: 'border-gray-700 bg-gray-800/50 text-gray-300',
};

export const DetectedChangeCard = ({ change }: { change: DetectedChange }) => {
  return (
    <Card className="border-gray-800 bg-black/50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${changeStyles[change.changeType]}`}>
              {change.changeType}
            </span>
            <span className="rounded-full border border-gray-700 bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
              Impact {change.impact}
            </span>
          </div>
          <h4 className="mt-3 text-lg font-semibold text-white">{change.title}</h4>
          <p className="mt-2 text-sm leading-6 text-gray-400">{change.description}</p>
        </div>
        <div className="space-y-2 text-right text-xs text-gray-400">
          <p>Confidence {change.confidence}%</p>
          <p>{change.estimatedEffort ? `${change.estimatedEffort}h estimate` : 'Effort not estimated'}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {change.oldText ? (
          <div className="rounded-2xl border border-gray-800 bg-black/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Baseline text</p>
            <p className="mt-2 text-sm leading-6 text-gray-300">{change.oldText}</p>
          </div>
        ) : null}
        {change.newText ? (
          <div className="rounded-2xl border border-gray-800 bg-black/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">New text</p>
            <p className="mt-2 text-sm leading-6 text-gray-300">{change.newText}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-4 rounded-2xl border border-lime-400/15 bg-lime-400/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-400">Recommendation</p>
        <p className="mt-2 text-sm leading-6 text-gray-200">{change.recommendation}</p>
      </div>
    </Card>
  );
};
