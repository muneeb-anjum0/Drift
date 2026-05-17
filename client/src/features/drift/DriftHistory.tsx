import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import { formatDate } from '../../utils/formatDate';
import type { DriftAnalysis } from './drift.types';
import { DriftScoreCard } from './DriftScoreCard';
import { DetectedChangesList } from './DetectedChangesList';

export const DriftHistory = ({
  analyses,
  onDelete,
  isDeleting = false,
}: {
  analyses: DriftAnalysis[];
  onDelete: (analysis: DriftAnalysis) => void;
  isDeleting?: boolean;
}) => {
  const [openAnalysisId, setOpenAnalysisId] = useState<string | null>(analyses[0]?._id ?? null);

  if (!analyses.length) {
    return (
      <EmptyState
        title="No saved drift analyses yet"
        description="Run a drift analysis and save it to build the project history."
        icon={<span className="text-lime-400">HIST</span>}
      />
    );
  }

  return (
    <div className="space-y-4">
      {analyses.map((analysis) => {
        const analysisId = analysis._id ?? `${analysis.createdAt}-${analysis.baselineVersionNumber}`;
        const isOpen = openAnalysisId === analysisId;

        return (
          <Card key={analysisId} className="border-gray-800 bg-black/60 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-lime-400">Saved analysis</p>
                <h4 className="mt-1 text-lg font-semibold text-white">Baseline version {analysis.baselineVersionNumber}</h4>
                <p className="mt-1 text-sm text-gray-400">Created {formatDate(analysis.createdAt)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-gray-700 bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
                  {analysis.driftScore}/100
                </span>
                <span className="rounded-full border border-gray-700 bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
                  {analysis.estimatedExtraHours}h
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpenAnalysisId(isOpen ? null : analysisId)}>
                  {isOpen ? 'Hide details' : 'View details'}
                </Button>
                <Button type="button" variant="danger" size="sm" onClick={() => onDelete(analysis)} disabled={isDeleting}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>

            <div className="mt-4">
              <DriftScoreCard analysis={analysis} />
            </div>

            {isOpen ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-gray-800 bg-black/40 p-4 text-sm leading-6 text-gray-300">
                  <p className="font-semibold text-white">Summary</p>
                  <p className="mt-2">{analysis.summary}</p>
                </div>
                <DetectedChangesList changes={analysis.detectedChanges} />
              </div>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
};
