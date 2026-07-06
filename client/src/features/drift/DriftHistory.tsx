import { useState } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import { formatDate } from '../../utils/formatDate';
import { cn } from '../../utils/cn';
import type { DriftAnalysis } from './drift.types';
import { DriftScoreCard } from './DriftScoreCard';
import { DetectedChangesList } from './DetectedChangesList';

const analysisTitle = (inputText: string) => {
  const words = inputText.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'Saved client input';
  return `${words.slice(0, 8).join(' ')}${words.length > 8 ? '...' : ''}`;
};

export const DriftHistory = ({
  analyses,
  onDelete,
  isDeleting = false,
}: {
  analyses: DriftAnalysis[];
  onDelete: (analysis: DriftAnalysis) => void;
  isDeleting?: boolean;
}) => {
  const [openAnalysisId, setOpenAnalysisId] = useState<string | null>(null);

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
    <div className="divide-y divide-[var(--color-border)] overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)]">
      {analyses.map((analysis) => {
        const analysisId = analysis._id ?? `${analysis.createdAt}-${analysis.baselineVersionNumber}`;
        const isOpen = openAnalysisId === analysisId;

        return (
          <div key={analysisId} className="bg-[var(--color-surface)]">
            <button
              type="button"
              onClick={() => setOpenAnalysisId(isOpen ? null : analysisId)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-[var(--color-bg-soft)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-focus)]"
              aria-expanded={isOpen}
            >
              <span className="min-w-0">
                <span className="block truncate text-base font-semibold text-[var(--color-text)]">{analysisTitle(analysis.inputText)}</span>
                <span className="mt-1 block text-sm text-[var(--color-text-muted)]">
                  Baseline version {analysis.baselineVersionNumber} · Created {formatDate(analysis.createdAt)}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-text)]">
                  {analysis.driftScore}/100
                </span>
                <span className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-text)]">
                  {analysis.estimatedExtraHours}h
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
                  <div className="space-y-4 bg-[var(--color-bg-soft)] px-5 pb-5">
                    <div className="pt-1">
                      <DriftScoreCard analysis={analysis} />
                    </div>
                    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm leading-6 text-[var(--color-text-muted)]">
                      <p className="font-semibold text-[var(--color-text)]">Summary</p>
                      <p className="mt-2">{analysis.summary}</p>
                    </div>
                    <DetectedChangesList changes={analysis.detectedChanges} />
                    <div className="flex justify-end">
                      <Button type="button" variant="danger" size="sm" onClick={() => onDelete(analysis)} disabled={isDeleting}>
                        <Trash2 className="mr-2 h-4 w-4" />
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
  );
};
