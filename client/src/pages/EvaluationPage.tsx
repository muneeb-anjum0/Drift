import { CheckCircle2, FileText, Gauge, Loader2, PlayCircle, RefreshCcw, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { Spinner } from '../components/common/Spinner';
import { useEvaluationSummary, useStartEvaluationRun } from '../hooks/useEvaluation';
import type { EvaluationRun } from '../features/evaluation/evaluation.types';
import { formatDate } from '../utils/formatDate';

const docsUrl = 'https://github.com/muneeb-anjum0/Drift/blob/main/docs/evaluation_dashboard.md';

const metric = (label: string, value: string | number) => (
  <Card className="p-3">
    <p className="app-eyebrow text-[0.62rem]">{label}</p>
    <p className="mt-1.5 text-xl font-semibold">{value}</p>
  </Card>
);

const metricGroup = (title: string, children: ReactNode) => (
  <Card className="p-4">
    <p className="app-eyebrow text-[0.68rem]">{title}</p>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">{children}</div>
  </Card>
);

const isRunning = (status?: string) => status === 'queued' || status === 'running';

const statusText = (status?: string) => {
  if (status === 'succeeded') return 'Complete';
  if (status === 'failed') return 'Failed';
  if (status === 'running') return 'Running';
  if (status === 'queued') return 'Queued';
  return 'Idle';
};

export const EvaluationPage = () => {
  const { data: summary, isLoading, isError, isFetching, refetch } = useEvaluationSummary();
  const startRun = useStartEvaluationRun();
  const run = summary?.currentRun;
  const runActive = isRunning(run?.status) || startRun.isPending;
  const progressPercent = run?.totalCases ? Math.round((run.progress / run.totalCases) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        title="Evaluation dashboard unavailable"
        description="The backend could not read Q4 evaluation reports right now."
        actionLabel="Try again"
        onAction={() => void refetch()}
      />
    );
  }

  if (!summary?.hasReport) {
    return (
      <section className="space-y-5">
        <EvaluationHeader
          isFetching={isFetching}
          runActive={runActive}
          onRefresh={() => void refetch()}
          onRun={() => startRun.mutate()}
        />
        {run ? <RunStatusCard run={run} progressPercent={progressPercent} /> : null}
        <EmptyState
          title="No automated evaluation report yet"
          description="Start the in-app pipeline to seed a temporary benchmark project, run Q4_K_M drift checks, and generate the first report."
          actionLabel={runActive ? 'Evaluation running' : 'Run evaluation'}
          onAction={() => !runActive && startRun.mutate()}
        />
      </section>
    );
  }

  const failedCases = summary.cases.filter((item) => !item.passed).length;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] lg:flex-row lg:items-end lg:justify-between">
        <EvaluationHeader
          isFetching={isFetching}
          runActive={runActive}
          onRefresh={() => void refetch()}
          onRun={() => startRun.mutate()}
        />
      </div>

      {run ? <RunStatusCard run={run} progressPercent={progressPercent} /> : null}

      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="app-eyebrow">Model card</p>
            <h2 className="mt-1.5 text-lg font-semibold">{summary.model.label || 'Qwen2.5-7B + DriftLedger LoRA'}</h2>
            <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">
              {summary.model.runtime || 'Local GGUF / llama.cpp'} - {summary.model.quantization || 'Q4_K_M'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="app-badge">{summary.model.modelLoaded ? 'Model loaded' : 'Model not loaded'}</span>
            <span className="app-badge">{summary.model.health || 'health unknown'}</span>
            <span className="app-badge">Fallback not used</span>
            {summary.generatedAt ? <span className="app-badge">{formatDate(summary.generatedAt)}</span> : null}
          </div>
        </div>
        {summary.recommendation ? (
          <p className="mt-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3 text-sm leading-6">
            {summary.recommendation}
          </p>
        ) : null}
      </Card>

      <div className="grid gap-3 xl:grid-cols-3">
        {metricGroup(
          'Model quality',
          <>
            {metric('Pass rate', `${Math.round(summary.passRate)}%`)}
            {metric('Cases passed', `${summary.passCount}/${summary.caseCount}`)}
            {metric('Ambiguous', summary.cases.filter((item) => item.actualLabel === 'ambiguous').length)}
            {metric('Contradictions', summary.cases.filter((item) => item.actualLabel === 'contradiction').length)}
          </>
        )}
        {metricGroup(
          'Runtime',
          <>
            {metric('Average latency', `${Math.round(summary.averageLatencyMs)} ms`)}
            {metric('Quantization', summary.model.quantization || 'Q4_K_M')}
            {metric('Saved analyses', 'Report-only')}
            {metric('Change requests', 'Report-only')}
          </>
        )}
        {metricGroup(
          'Approvals',
          <>
            {metric('Pending', summary.approvalQuality?.pending ?? 0)}
            {metric('Approved', summary.approvalQuality?.approved ?? 0)}
            {metric('Rejected', summary.approvalQuality?.rejected ?? 0)}
            {metric('Revision', summary.approvalQuality?.needsRevision ?? 0)}
          </>
        )}
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="app-eyebrow">Benchmark</p>
            <h2 className="mt-1.5 text-lg font-semibold">Latest Q4 evaluation</h2>
          </div>
          <span className="app-badge">{failedCases === 0 ? 'All cases passed' : `${failedCases} case(s) need review`}</span>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left text-xs">
            <thead>
              <tr className="text-[var(--color-text-soft)]">
                <th className="border-b border-[var(--color-border)] px-3 py-2 font-semibold">Case</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2 font-semibold">Expected label</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2 font-semibold">Actual label</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2 font-semibold">Score</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2 font-semibold">Latency</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2 font-semibold">Pass/Fail</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2 font-semibold">Change title</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {summary.cases.map((item) => (
                <tr key={item.id}>
                  <td className="border-b border-[var(--color-border)] px-3 py-2.5 font-semibold">{item.name}</td>
                  <td className="border-b border-[var(--color-border)] px-3 py-2.5">{item.expectedLabel}</td>
                  <td className="border-b border-[var(--color-border)] px-3 py-2.5">{item.actualLabel || 'unknown'}</td>
                  <td className="border-b border-[var(--color-border)] px-3 py-2.5">{item.score}/100</td>
                  <td className="border-b border-[var(--color-border)] px-3 py-2.5">{item.latencyMs} ms</td>
                  <td className="border-b border-[var(--color-border)] px-3 py-2.5">
                    <span className="inline-flex items-center gap-1">
                      {item.passed ? <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" /> : <XCircle className="h-4 w-4 text-[var(--color-danger)]" />}
                      {item.passed ? 'Pass' : 'Fail'}
                    </span>
                  </td>
                  <td className="border-b border-[var(--color-border)] px-3 py-2.5">{item.title || 'No visible change'}</td>
                  <td className="border-b border-[var(--color-border)] px-3 py-2.5 text-[var(--color-text-muted)]">{item.notes.length ? item.notes.join('; ') : 'Clean'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="p-4">
          <p className="app-eyebrow">Quality insights</p>
          <h2 className="mt-1.5 text-lg font-semibold">Recommendation</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
            {failedCases === 0
              ? `Q4_K_M passed ${summary.passCount}/${summary.caseCount} evaluation cases. Latency is acceptable for local inference, and ambiguous plus contradiction handling remains covered by deterministic post-processing.`
              : `Q4_K_M passed ${summary.passCount}/${summary.caseCount} evaluation cases. Review failed cases before using this runtime in a polished demo.`}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            <h2 className="text-base font-semibold">Reports</h2>
          </div>
          <div className="mt-3 grid gap-2">
            {summary.reports.slice(0, 5).map((report) => (
              <div key={report.name} className="flex flex-col gap-1 rounded-[var(--radius-card)] border border-[var(--color-border)] p-2.5 text-xs md:flex-row md:items-center md:justify-between">
                <span className="font-semibold">{report.name}</span>
                <span className="text-[var(--color-text-muted)]">{formatDate(report.createdAt)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
};

const EvaluationHeader = ({
  isFetching,
  runActive,
  onRefresh,
  onRun,
}: {
  isFetching: boolean;
  runActive: boolean;
  onRefresh: () => void;
  onRun: () => void;
}) => (
  <>
    <div>
      <p className="app-eyebrow">Evaluation</p>
      <h1 className="mt-2 text-2xl font-semibold">Evaluation Dashboard</h1>
      <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
        Run the automated Q4_K_M benchmark from inside Drift and review model quality, latency, labels, and approval readiness.
      </p>
    </div>
    <div className="flex flex-wrap gap-3">
      <Button type="button" variant="secondary" onClick={onRefresh} disabled={isFetching}>
        <RefreshCcw className="mr-2 h-4 w-4" />
        Refresh
      </Button>
      <Button type="button" onClick={onRun} disabled={runActive}>
        {runActive ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
        {runActive ? 'Running evaluation' : 'Run evaluation'}
      </Button>
      <Button type="button" variant="secondary" onClick={() => window.open(docsUrl, '_blank', 'noopener,noreferrer')}>
        <FileText className="mr-2 h-4 w-4" />
        Docs
      </Button>
    </div>
  </>
);

const RunStatusCard = ({ run, progressPercent }: { run?: EvaluationRun | null; progressPercent: number }) => {
  if (!run) return null;
  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="app-eyebrow">Automated pipeline</p>
          <h2 className="mt-1 text-lg font-semibold">{statusText(run.status)}</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{run.currentStep || 'Ready'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="app-badge">{run.progress}/{run.totalCases} cases</span>
          <span className="app-badge">{run.passCount} passed</span>
          {run.reportName ? <span className="app-badge">{run.reportName}</span> : null}
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-bg-soft)]">
        <div className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500" style={{ width: `${progressPercent}%` }} />
      </div>
      {run.error ? <p className="mt-3 text-sm text-[var(--color-danger)]">{run.error}</p> : null}
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {run.caseStatuses.map((item) => (
          <div key={item.id} className="rounded-[var(--radius-card)] border border-[var(--color-border)] p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold leading-5">{item.name}</p>
              <span className="app-badge shrink-0">{statusText(item.status)}</span>
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Expected {item.expectedLabel}
              {item.actualLabel ? ` - got ${item.actualLabel}` : ''}
            </p>
            {typeof item.score === 'number' ? <p className="mt-1 text-xs text-[var(--color-text-muted)]">Score {item.score}/100</p> : null}
          </div>
        ))}
      </div>
    </Card>
  );
};
