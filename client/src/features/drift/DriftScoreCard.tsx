import { Card } from '../../components/common/Card';
import { DriftBadges } from './DriftBadges';
import type { DriftAnalysis, DriftAnalysisPreview } from './drift.types';

type DriftScoreCardAnalysis = Pick<
  DriftAnalysis,
  | 'driftScore'
  | 'riskLevel'
  | 'summary'
  | 'addedCount'
  | 'modifiedCount'
  | 'removedCount'
  | 'ambiguousCount'
  | 'contradictionCount'
  | 'estimatedExtraHours'
  | 'analysisEngine'
  | 'ollamaUsed'
  | 'inputType'
  | 'baselineVersionNumber'
> &
  Pick<DriftAnalysisPreview, 'inputType'>;

const statBlock = (label: string, value: number | string) => (
  <div className="min-w-0 rounded-2xl border border-gray-800 bg-black/40 px-3 py-3">
    <p className="truncate whitespace-nowrap text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-gray-500" title={label}>
      {label}
    </p>
    <p className="mt-2 break-words text-base font-semibold leading-6 text-white">{value}</p>
  </div>
);

export const DriftScoreCard = ({ analysis }: { analysis: DriftScoreCardAnalysis }) => {
  return (
    <Card className="border-lime-400/20 bg-black/60 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-lime-400">Drift score</p>
          <h3 className="mt-1 text-3xl font-semibold text-white">{analysis.driftScore}/100</h3>
          <p className="mt-2 text-sm leading-6 text-gray-400">{analysis.summary}</p>
        </div>
        <DriftBadges riskLevel={analysis.riskLevel} analysisEngine={analysis.analysisEngine} ollamaUsed={analysis.ollamaUsed} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 2xl:grid-cols-4">
        {statBlock('Added', analysis.addedCount)}
        {statBlock('Modified', analysis.modifiedCount)}
        {statBlock('Removed', analysis.removedCount)}
        {statBlock('Ambiguous', analysis.ambiguousCount)}
        {statBlock('Contradictions', analysis.contradictionCount)}
        {statBlock('Extra hours', `${analysis.estimatedExtraHours}h`)}
        {statBlock('Baseline version', analysis.baselineVersionNumber)}
        {statBlock('Input type', analysis.inputType.replace(/_/g, ' '))}
      </div>
    </Card>
  );
};
