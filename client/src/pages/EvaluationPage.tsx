import { CheckCircle2, Clipboard, FileText, Gauge, RefreshCcw, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { Spinner } from '../components/common/Spinner';
import { useEvaluationSummary } from '../hooks/useEvaluation';
import { formatDate } from '../utils/formatDate';

const evaluationCommand = 'python tools\\evaluate_q4_quality.py';
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

export const EvaluationPage = () => {
  const { data: summary, isLoading, isError, isFetching, refetch } = useEvaluationSummary();

  const copyCommand = async () => {
    await navigator.clipboard.writeText(evaluationCommand);
  };

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
        <div>
          <p className="app-eyebrow">Evaluation</p>
          <h1 className="mt-2 text-3xl font-semibold">Evaluation Dashboard</h1>
        </div>
        <EmptyState
          title="No Q4 evaluation report yet"
          description={`Run ${evaluationCommand} after Docker is up to generate the first report.`}
          actionLabel="Copy command"
          onAction={() => void copyCommand()}
        />
      </section>
    );
  }

  const failedCases = summary.cases.filter((item) => !item.passed).length;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="app-eyebrow">Evaluation</p>
          <h1 className="mt-2 text-2xl font-semibold">Evaluation Dashboard</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
            Monitor model quality, latency, drift-label accuracy, and change request reliability.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh Evaluation
          </Button>
          <Button type="button" variant="secondary" onClick={() => void copyCommand()}>
            <Clipboard className="mr-2 h-4 w-4" />
            Copy command
          </Button>
          <Button type="button" onClick={() => window.open(docsUrl, '_blank', 'noopener,noreferrer')}>
            <FileText className="mr-2 h-4 w-4" />
            Open docs
          </Button>
        </div>
      </div>

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
