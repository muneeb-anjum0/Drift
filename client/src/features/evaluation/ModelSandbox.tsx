import { useState } from 'react';
import { Button } from '../../components/common/Button';
import { useAnalyzeDirectDrift, useChangeReadiness } from '../../hooks/useDrift';
import type { ModelPrediction } from '../drift/drift.types';

export const ModelSandbox = () => {
  const readiness = useChangeReadiness();
  const analyze = useAnalyzeDirectDrift();
  const [baseline, setBaseline] = useState('');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<ModelPrediction | null>(null);
  const [error, setError] = useState('');
  const run = async () => {
    setError(''); setResult(null);
    try { setResult(await analyze.mutateAsync({ baseline_requirement: baseline.trim(), new_client_message: message.trim() })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Direct comparison failed.'); }
  };
  return <details className="v-panel p-5"><summary className="cursor-pointer font-semibold">Direct model sandbox</summary><div className="mt-4 space-y-4 text-sm"><p className="v-muted">Advanced diagnostic only. This does not create a project analysis, save a result, or approve a change.</p>
    <label className="block font-medium">One existing requirement<textarea className="mt-2 block min-h-24 w-full rounded-lg border border-[var(--v-border)] bg-white p-3 font-normal" value={baseline} onChange={(event) => setBaseline(event.target.value)} /></label>
    <label className="block font-medium">New client message<textarea className="mt-2 block min-h-24 w-full rounded-lg border border-[var(--v-border)] bg-white p-3 font-normal" value={message} onChange={(event) => setMessage(event.target.value)} /></label>
    {readiness.isError ? <p role="alert">Model availability could not be checked.</p> : readiness.data && !readiness.data.available ? <p role="status">The local model is unavailable.</p> : null}
    <Button disabled={!readiness.data?.available || !baseline.trim() || !message.trim() || analyze.isPending} onClick={() => void run()}>{analyze.isPending ? 'Checking…' : 'Run direct comparison'}</Button>
    {error ? <p role="alert" className="text-[var(--color-danger)]">{error}</p> : null}
    {result ? <div className="rounded-lg bg-[var(--v-accent-soft)] p-4"><p className="font-semibold capitalize">{result.label}</p><p className="mt-2">{result.reasoning}</p><p className="v-muted mt-2">Confidence: {Math.round(result.confidence * 100)}% · Changed elements: {result.changed_elements.join(', ') || 'none returned'}</p></div> : null}
  </div></details>;
};
