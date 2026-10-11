import { useEffect, useState } from 'react';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { useAnalyzeDrift, useChangeReadiness, useSaveDriftAnalysis } from '../../hooks/useDrift';
import type { RequirementVersion } from '../requirements/requirement.types';
import type { DetectedChange, DriftAnalysisPreview, DriftInputType } from './drift.types';

const inputTypes: { label: string; value: DriftInputType }[] = [
  { label: 'Client message', value: 'client_message' }, { label: 'Meeting note', value: 'meeting_note' }, { label: 'Scope update', value: 'scope_update' }, { label: 'Document text', value: 'document_text' }, { label: 'Other', value: 'other' },
];
const labels: Record<DetectedChange['changeType'], string> = { added: 'New requirement', modified: 'Changed requirement', removed: 'Requirement removed', contradiction: 'Conflicts with agreement', ambiguous: 'Needs clarification', unchanged: 'No meaningful change' };

export const DriftAnalysisPanel = ({ projectId, versions, canAnalyze, onPrepareDecision }: {
  projectId: string;
  versions: RequirementVersion[];
  canAnalyze: boolean;
  onPrepareDecision: () => void;
}) => {
  const readiness = useChangeReadiness();
  const analyze = useAnalyzeDrift();
  const save = useSaveDriftAnalysis();
  const [baselineVersionId, setBaselineVersionId] = useState('');
  const [inputType, setInputType] = useState<DriftInputType>('client_message');
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<DriftAnalysisPreview | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (!baselineVersionId && versions[0]) setBaselineVersionId(versions[0]._id); }, [baselineVersionId, versions]);
  const selectedVersion = versions.find((version) => version._id === baselineVersionId) ?? versions[0];

  const compare = async () => {
    if (!baselineVersionId || !inputText.trim()) { setError('Choose a scope snapshot and paste the new request.'); return; }
    setError(''); setResult(null); setSaved(false);
    try { setResult(await analyze.mutateAsync({ projectId, baselineVersionId, inputType, inputText: inputText.trim() })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The change could not be compared.'); }
  };
  const saveReview = async () => {
    if (!result) return;
    setError('');
    try {
      await save.mutateAsync({ projectId, baselineVersionId: result.baselineVersionId, inputText: result.inputText, inputType: result.inputType, detectedChanges: result.detectedChanges, requirementResults: result.requirementResults, driftScore: result.driftScore, riskLevel: result.riskLevel, summary: result.summary, addedCount: result.addedCount, modifiedCount: result.modifiedCount, removedCount: result.removedCount, ambiguousCount: result.ambiguousCount, contradictionCount: result.contradictionCount, estimatedExtraHours: result.estimatedExtraHours, analysisEngine: result.analysisEngine, status: 'saved' });
      setSaved(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The proposed result could not be saved.'); }
  };

  return <div className="space-y-6">
    <section className="v-panel p-5 sm:p-7">
      <p className="v-kicker">New client input</p>
      <h2 className="v-section-title mt-1">Compare a new request</h2>
      <p className="v-muted mt-2 text-sm">Compare a message or note with the saved scope. The result is a proposal for your review, not an automatic decision.</p>
      {!versions.length ? <div className="mt-5 rounded-lg bg-[var(--v-accent-soft)] p-4 text-sm">Create a scope snapshot first so there is a fixed comparison point.</div> : <>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">Agreed scope snapshot<select className="mt-2 block h-11 w-full rounded-lg border border-[var(--v-border)] bg-white px-3 font-normal" value={baselineVersionId} onChange={(event) => setBaselineVersionId(event.target.value)}>{versions.map((version) => <option key={version._id} value={version._id}>Snapshot #{version.versionNumber} · {version.requirementsSnapshot.length} items</option>)}</select></label>
          <label className="block text-sm font-medium">New input type<select className="mt-2 block h-11 w-full rounded-lg border border-[var(--v-border)] bg-white px-3 font-normal" value={inputType} onChange={(event) => setInputType(event.target.value as DriftInputType)}>{inputTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        </div>
        {selectedVersion ? <p className="v-muted mt-2 text-xs">This snapshot is a fixed copy of the requirements, not formal approval.</p> : null}
        <label className="mt-5 block text-sm font-medium">What did the client say?<textarea className="mt-2 block min-h-36 w-full rounded-lg border border-[var(--v-border)] bg-white p-3 font-normal leading-6" value={inputText} onChange={(event) => setInputText(event.target.value)} placeholder="Paste the new client message, meeting note, or scope update here" /></label>
        {readiness.isPending ? <p className="v-muted mt-4 text-sm" role="status">Checking change analysis availability…</p> : readiness.isError ? <div className="mt-4 rounded-lg border border-[var(--color-warning)] p-4 text-sm" role="alert">Analysis availability couldn't be checked. Your scope is still safe. <button className="v-link ml-1" onClick={() => void readiness.refetch()}>Retry</button></div> : !readiness.data?.available ? <div className="mt-4 rounded-lg border border-[var(--color-warning)] p-4 text-sm" role="status"><strong>Change analysis isn't available right now.</strong><p className="mt-1">Your projects and scope remain available. Start the optional local model to compare changes; see About & runtime for local setup guidance.</p></div> : null}
        {canAnalyze ? <Button className="mt-5" disabled={!readiness.data?.available || analyze.isPending || !inputText.trim()} onClick={() => void compare()}>{analyze.isPending ? <><Spinner /> Comparing…</> : 'Compare with scope'}</Button> : <p className="v-muted mt-4 text-sm">You can view saved changes, but your workspace role cannot run a new comparison.</p>}
      </>}
    </section>

    {error ? <p role="alert" className="rounded-lg border border-[var(--color-danger)] p-4 text-sm text-[var(--color-danger)]">{error}</p> : null}
    {result ? <section className="v-panel p-5 sm:p-7" aria-live="polite">
      <p className="v-kicker">Proposed interpretation</p><h2 className="v-section-title mt-1">What may have changed</h2><p className="v-muted mt-2 text-sm">Review the proposed differences against the original wording before using them in a decision.</p>
      {result.detectedChanges.length ? <div className="mt-5 divide-y divide-[var(--v-border)] border-y border-[var(--v-border)]">{result.detectedChanges.map((change, index) => <article key={`${change.title}-${index}`} className="py-5"><span className="v-pill">{labels[change.changeType]}</span><h3 className="mt-3 font-semibold">{change.title}</h3>{change.baselineRequirementTitle ? <p className="v-muted mt-1 text-sm">Affects: {change.baselineRequirementTitle}</p> : null}<p className="mt-2 text-sm leading-6">{change.description}</p>{change.oldText ? <p className="v-muted mt-2 text-sm">Originally: {change.oldText}</p> : null}{change.newText ? <p className="v-muted mt-1 text-sm">New request: {change.newText}</p> : null}<p className="mt-3 text-sm"><strong>Potential impact:</strong> {change.impact}</p><details className="mt-3 text-sm"><summary className="v-link cursor-pointer">Why this was flagged / technical details</summary><div className="v-muted mt-2 space-y-1"><p>{change.recommendation}</p><p>Model confidence: {change.confidence}% · Heuristic effort: {change.estimatedEffort ?? 'not estimated'}</p></div></details></article>)}</div> : <p className="mt-5 rounded-lg bg-[var(--v-accent-soft)] p-4 text-sm">No meaningful change was proposed from this input. Review it yourself before treating scope as unchanged.</p>}
      <p className="v-muted mt-4 text-sm">Impact and effort are generated planning aids, not contractual facts. This version cannot record per-change confirmation or dismissal; a saved result remains an advisory analysis.</p>
      <details className="mt-4 text-sm"><summary className="v-link cursor-pointer">Analysis details</summary><div className="v-muted mt-2"><p>{result.summary}</p><p>Heuristic score {result.driftScore}/100 · Risk {result.riskLevel} · Estimated extra effort ~{result.estimatedExtraHours} hours</p></div></details>
      <div className="mt-6 flex flex-wrap items-center gap-3">{!saved && canAnalyze ? <Button onClick={() => void saveReview()} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save proposed analysis'}</Button> : null}{saved ? <><span role="status" className="text-sm font-medium text-[var(--v-accent)]">Analysis saved.</span>{result.detectedChanges.length ? <Button onClick={onPrepareDecision}>Prepare change request</Button> : null}</> : null}</div>
    </section> : null}
  </div>;
};
