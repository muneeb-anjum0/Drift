import { useState } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import { formatDate } from '../../utils/formatDate';
import { cn } from '../../utils/cn';
import type { DriftAnalysis } from './drift.types';
import { driftAnalysisTitle } from './driftDisplay';
import { DriftScoreCard } from './DriftScoreCard';
import { DetectedChangesList } from './DetectedChangesList';

const HISTORY_PAGE_SIZE = 10;

export const DriftHistory = ({
  analyses,
  onDelete,
  isDeleting = false,
  canDelete = true,
}: {
  analyses: DriftAnalysis[];
  onDelete: (analysis: DriftAnalysis) => void;
  isDeleting?: boolean;
  canDelete?: boolean;
}) => {
  const [openAnalysisId, setOpenAnalysisId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(HISTORY_PAGE_SIZE);

  if (!analyses.length) {
    return (
      <EmptyState
        title="No saved comparisons yet"
        description="Compare a new request with a scope snapshot, then save the proposed result to build project history."
        icon={<span className="text-lime-400">HIST</span>}
      />
    );
  }

  const visibleAnalyses = analyses.slice(0, visibleCount);
  const hasMore = visibleCount < analyses.length;

  return (
    <div className="space-y-3">
      <div className="divide-y divide-[var(--color-border)] overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)]">
        {visibleAnalyses.map((analysis) => {
          const analysisId = analysis._id ?? `${analysis.createdAt}-${analysis.baselineVersionNumber}`;
          const isOpen = openAnalysisId === analysisId;

          return (
            <div key={analysisId} className="bg-[var(--color-surface)]">
              <button
                type="button"
                onClick={() => setOpenAnalysisId(isOpen ? null : analysisId)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-[var(--color-bg-soft)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-focus)]"
                aria-expanded={isOpen}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[var(--color-text)]">{driftAnalysisTitle(analysis.inputText)}</span>
                  <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
                    Scope snapshot #{analysis.baselineVersionNumber} · Saved {formatDate(analysis.createdAt)}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-[var(--color-text-muted)]">{analysis.detectedChanges.length} proposed changes</span>
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
                    <div className="space-y-3 bg-[var(--color-bg-soft)] px-4 pb-4">
                      <details className="pt-2 text-xs text-[var(--color-text-muted)]"><summary className="cursor-pointer">Technical estimate</summary><div className="mt-2"><DriftScoreCard analysis={analysis} /></div></details>
                      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs leading-5 text-[var(--color-text-muted)]">
                        <p className="font-semibold text-[var(--color-text)]">Summary</p>
                        <p className="mt-1.5">{analysis.summary}</p>
                      </div>
                      <DetectedChangesList changes={analysis.detectedChanges} />
                      {canDelete ? <div className="flex justify-end">
                        <Button type="button" variant="danger" size="sm" onClick={() => onDelete(analysis)} disabled={isDeleting}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div> : null}
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
          <Button type="button" variant="secondary" size="sm" onClick={() => setVisibleCount((count) => count + HISTORY_PAGE_SIZE)}>
            Show more
          </Button>
        </div>
      ) : null}
    </div>
  );
};
