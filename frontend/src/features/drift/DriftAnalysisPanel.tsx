import { useEffect, useState } from 'react';
import { Button } from '../../components/common/Button';
import { Link } from 'react-router-dom';
import { Spinner } from '../../components/common/Spinner';
import { useStartScopeJob, useCancelScopeJob, useScopeJob, useChangeReadiness, useSaveDriftAnalysis } from '../../hooks/useDrift';
import type { RequirementVersion } from '../requirements/requirement.types';
import type { DetectedChange, DriftAnalysisPreview, DriftInputType } from './drift.types';

const inputTypes: { label: string; value: DriftInputType }[] = [
  { label: 'Client message', value: 'client_message' }, { label: 'Meeting note', value: 'meeting_note' }, { label: 'Scope update', value: 'scope_update' }, { label: 'Document text', value: 'document_text' }, { label: 'Other', value: 'other' },
];
const labels: Record<DetectedChange['changeType'], string> = { added: 'New requirement', modified: 'Changed requirement', removed: 'Requirement removed', contradiction: 'Conflicts with agreement', ambiguous: 'Needs clarification', unchanged: 'No meaningful change' };

export const DriftAnalysisPanel = ({ projectId, workspaceId, versions, currentVersionId, canAnalyze, onPrepareDecision }: {
  projectId: string;
  workspaceId: string;
  versions: RequirementVersion[];
  currentVersionId?: string;
  canAnalyze: boolean;
  onPrepareDecision: () => void;
}) => {
  const readiness = useChangeReadiness(workspaceId);
  const analyze = useStartScopeJob();
  const cancelJob = useCancelScopeJob();
  const [jobId, setJobId] = useState('');
  const job = useScopeJob(jobId);
  const save = useSaveDriftAnalysis();
  const [baselineVersionId, setBaselineVersionId] = useState('');
  const [inputType, setInputType] = useState<DriftInputType>('client_message');
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<DriftAnalysisPreview | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (job.data?.status === 'complete' && job.data.result) { setResult(job.data.result); setJobId(''); }
    if (job.data?.status === 'failed') { setError(job.data.error || 'The comparison could not be completed.'); setJobId(''); }
    if (job.data?.status === 'canceled') { setJobId(''); }
  }, [job.data]);
  useEffect(() => { if (currentVersionId && baselineVersionId !== currentVersionId) { setBaselineVersionId(currentVersionId); setResult(null); setSaved(false); } }, [baselineVersionId, currentVersionId]);
  const selectedVersion = versions.find((version) => version._id === baselineVersionId) ?? versions[0];

  const compare = async () => {
    if (!baselineVersionId || !inputText.trim()) { setError('Choose a scope snapshot and paste the new request.'); return; }
    setError(''); setResult(null); setSaved(false); setJobId('');
    try { const queued = await analyze.mutateAsync({ projectId, baselineVersionId, inputType, inputText: inputText.trim() }); setJobId(queued.id); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The change could not be compared.'); }
  };
  const saveReview = async () => {
    if (!result) return;
    setError('');
    try {
      await save.mutateAsync({ previewId: result.previewId });
      setSaved(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The proposed result could not be saved.'); }
  };
  const cancelComparison = async () => {
    if (!jobId) return;
    try { await cancelJob.mutateAsync(jobId); setJobId(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not cancel the comparison.'); }
  };

  return <div className="space-y-6">
    <section className="v-panel p-5 sm:p-7">
      <p className="v-kicker">New client input</p>
      <h2 className="v-section-title mt-1">Compare a new request</h2>
      <p className="v-muted mt-2 text-sm">Compare one new request at a time with every item in the current scope. The result is a proposal for your review, not an automatic decision.</p>
      {readiness.data?.available ? <p className="v-muted mt-2 text-sm">Analysis provider: {readiness.data.providerType === 'openai_compatible' ? `Online · ${readiness.data.model ?? 'selected model'} (configured; connection checked when you compare)` : 'Local model'}</p> : null}
      {!versions.length ? <div className="mt-5 rounded-lg bg-[var(--v-accent-soft)] p-4 text-sm">Create a scope snapshot first so there is a fixed comparison point.</div> : <>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="block text-sm font-medium">Current agreed scope<div className="mt-2 flex h-11 items-center rounded-lg border border-[var(--v-border)] bg-white px-3 font-normal">{selectedVersion ? `Snapshot #${selectedVersion.versionNumber} · ${selectedVersion.requirementsSnapshot.length} items` : 'No scope yet'}</div></div>
          <label className="block text-sm font-medium">New input type<select className="mt-2 block h-11 w-full rounded-lg border border-[var(--v-border)] bg-white px-3 font-normal" value={inputType} disabled={Boolean(jobId)} onChange={(event) => { setInputType(event.target.value as DriftInputType); setResult(null); setSaved(false); }}>{inputTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        </div>
        {selectedVersion ? <p className="v-muted mt-2 text-xs">This snapshot is a fixed copy of the requirements, not formal approval.</p> : null}
        <label className="mt-5 block text-sm font-medium">What did the client say?<textarea className="mt-2 block min-h-36 w-full rounded-lg border border-[var(--v-border)] bg-white p-3 font-normal leading-6" value={inputText} disabled={Boolean(jobId)} onChange={(event) => { setInputText(event.target.value); setResult(null); setSaved(false); }} placeholder="Paste one new requirement or requested change here" /></label>
        {readiness.isPending ? <p className="v-muted mt-4 text-sm" role="status">Checking change analysis availability…</p> : readiness.isError ? <div className="mt-4 rounded-lg border border-[var(--color-warning)] p-4 text-sm" role="alert">Analysis availability couldn't be checked. Your scope is still safe. <button className="v-link ml-1" onClick={() => void readiness.refetch()}>Retry</button></div> : !readiness.data?.available ? <div className="mt-4 rounded-lg border border-[var(--color-warning)] p-4 text-sm" role="status"><strong>Analysis provider isn't available right now.</strong><p className="mt-1">Your projects and scope remain available. {readiness.data?.providerType === 'openai_compatible' ? 'Ask a workspace owner or admin to check the online provider settings.' : 'Choose an online provider in Settings, or install the optional local model.'}</p>{canAnalyze ? <Link className="v-link mt-2 inline-block" to={`/settings?workspace=${encodeURIComponent(workspaceId)}#analysis-provider`}>Open provider settings</Link> : null}</div> : null}
        {canAnalyze ? <Button className="mt-5" disabled={!readiness.data?.available || analyze.isPending || Boolean(jobId) || !inputText.trim()} onClick={() => void compare()}>{analyze.isPending || jobId ? <><Spinner /> Comparing…</> : 'Compare with scope'}</Button> : <p className="v-muted mt-4 text-sm">You can view saved changes, but your workspace role cannot run a new comparison.</p>}
        {jobId ? <div className="mt-2 flex items-center gap-3"><p role="status" className="v-muted text-sm">{job.data?.status === 'queued' ? 'Waiting for analysis…' : `Checked ${job.data?.processed ?? 0} of ${job.data?.total ?? selectedVersion?.requirementsSnapshot.length ?? 0} scope items.`}</p><button type="button" className="v-link text-sm" disabled={cancelJob.isPending} onClick={() => void cancelComparison()}>Cancel comparison</button></div> : null}
        {selectedVersion && !jobId ? <p className="v-muted mt-2 text-xs">This comparison makes about {Math.ceil(selectedVersion.requirementsSnapshot.length / 6) + 1} model calls. Online provider usage may incur charges.</p> : null}
      </>}
    </section>

    {error ? <p role="alert" className="rounded-lg border border-[var(--color-danger)] p-4 text-sm text-[var(--color-danger)]">{error}</p> : null}
    {result ? <section className="v-panel p-5 sm:p-7" aria-live="polite">
      <p className="v-kicker">Proposed interpretation</p><h2 className="v-section-title mt-1">What may have changed</h2><p className="v-muted mt-2 text-sm">Checked all {selectedVersion?.requirementsSnapshot.length ?? 0} requirements in the selected snapshot for each request. Review the proposed differences against the original wording before using them in a decision.</p>
      {result.needsReview || result.detectedChanges.some((change) => change.reviewRequired) ? <div className="mt-4 rounded-lg border border-[var(--color-warning)] p-4 text-sm"><strong>Check the saved scope before deciding.</strong><p className="mt-1">{result.reviewReason || 'The model could not resolve this request against the agreed scope.'} This result can be saved as a review note, but cannot prepare a change request.</p><Link className="v-link mt-2 inline-block" to={`/projects/${projectId}?section=scope`}>Review agreed scope →</Link></div> : null}
      {result.detectedChanges.length ? <div className="mt-5 divide-y divide-[var(--v-border)] border-y border-[var(--v-border)]">{result.detectedChanges.map((change, index) => <article key={`${change.title}-${index}`} className="py-5"><span className="v-pill">{change.reviewRequired ? 'Needs scope review' : labels[change.changeType]}</span><h3 className="mt-3 font-semibold">{change.title}</h3>{change.baselineRequirementTitle ? <p className="v-muted mt-1 text-sm">Affects: {change.baselineRequirementTitle}</p> : null}<p className="mt-2 text-sm leading-6">{change.description}</p>{change.oldText ? <p className="v-muted mt-2 text-sm">Originally: {change.oldText}</p> : null}{change.newText ? <p className="v-muted mt-1 text-sm">New request: {change.newText}</p> : null}{change.proposedText && ["added", "modified"].includes(change.changeType) ? <p className="v-muted mt-1 text-sm">Proposed scope wording: {change.proposedText}</p> : null}{!change.reviewRequired ? <p className="mt-3 text-sm"><strong>Potential impact:</strong> {change.impact}</p> : null}<details className="mt-3 text-sm"><summary className="v-link cursor-pointer">{change.reviewRequired ? 'What to check' : 'Planning details'}</summary><div className="v-muted mt-2 space-y-1"><p>{change.recommendation}</p>{!change.reviewRequired ? <p>{change.confidence != null ? `Model-reported confidence: ${change.confidence}% · ` : ''}Per-change effort: {change.estimatedEffort == null ? 'not estimated separately' : `${change.estimatedEffort}h`}</p> : null}</div></details></article>)}</div> : <p className="mt-5 rounded-lg bg-[var(--v-accent-soft)] p-4 text-sm">No meaningful change was proposed from this input. Review it yourself before treating scope as unchanged.</p>}
      <p className="v-muted mt-4 text-sm">The model's impact, score, and effort are planning estimates. They are not contractual facts; review the evidence before approving a change.</p>
      <details className="mt-4 text-sm"><summary className="v-link cursor-pointer">Analysis details and full scope check</summary><div className="v-muted mt-2 space-y-2"><p>{result.summary}</p><p>AI assessed change from current scope: {result.driftScore}/100 · Cumulative change from original scope: {result.cumulativeDriftScore ?? 'unavailable'}/100 · Risk: {result.riskLevel}</p><p>{result.effort?.status === 'estimated' ? `AI effort range: ${result.effort.minimumHours}–${result.effort.maximumHours} hours. ${result.effort.assumptions.join('; ')}` : `Effort cannot be estimated yet. ${result.effort?.questions.join('; ') ?? ''}`}</p><p>{result.scopePairs?.length ?? 0} scope items assessed individually:</p><ol className="max-h-96 space-y-2 overflow-y-auto pr-2">{result.scopePairs?.map((pair) => { const item = selectedVersion?.requirementsSnapshot.find((entry) => entry.requirementId === pair.requirementId); return <li key={pair.requirementId} className="rounded-lg border border-[var(--v-border)] p-3"><strong>{item?.title ?? pair.requirementId}</strong> · {pair.relation}<p className="mt-1">{pair.explanation}</p>{pair.oldQuote || pair.newQuote ? <p className="mt-1 text-xs">{pair.oldQuote ? `Scope: “${pair.oldQuote}”` : ''}{pair.oldQuote && pair.newQuote ? ' · ' : ''}{pair.newQuote ? `Request: “${pair.newQuote}”` : ''}</p> : null}</li>; })}</ol></div></details>
      <div className="mt-6 flex flex-wrap items-center gap-3">{!saved && canAnalyze ? <Button onClick={() => void saveReview()} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save proposed analysis'}</Button> : null}{saved ? <><span role="status" className="text-sm font-medium text-[var(--v-accent)]">Analysis saved.</span>{result.detectedChanges.length && !result.needsReview && !result.detectedChanges.some((change) => change.reviewRequired) ? <Button onClick={onPrepareDecision}>Prepare change request</Button> : null}</> : null}</div>
    </section> : null}
  </div>;
};
