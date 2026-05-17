import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { Spinner } from '../../components/common/Spinner';
import { BaselineSelector } from './BaselineSelector';
import { DriftScoreCard } from './DriftScoreCard';
import { DetectedChangesList } from './DetectedChangesList';
import type { DriftAnalysisFormValues, DriftAnalysisPreview, DriftInputType } from './drift.types';
import type { RequirementVersion } from '../requirements/requirement.types';
import { useAnalyzeDrift, useSaveDriftAnalysis } from '../../hooks/useDrift';

const selectClass =
  'h-11 w-full rounded-2xl border border-gray-700 bg-black px-4 text-sm text-white shadow-sm outline-none transition focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30';

const defaultFormValues: DriftAnalysisFormValues = {
  baselineVersionId: '',
  inputType: 'client_message',
  inputText: '',
  useOllama: false,
  ollamaModel: 'llama3.1:8b',
};

const inputTypes: Array<{ label: string; value: DriftInputType }> = [
  { label: 'Client message', value: 'client_message' },
  { label: 'Meeting note', value: 'meeting_note' },
  { label: 'Scope update', value: 'scope_update' },
  { label: 'Document text', value: 'document_text' },
  { label: 'Other', value: 'other' },
];

export const DriftAnalysisPanel = ({
  projectId,
  versions,
  hasRequirements,
}: {
  projectId: string;
  versions: RequirementVersion[];
  hasRequirements: boolean;
}) => {
  const analyzeMutation = useAnalyzeDrift();
  const saveMutation = useSaveDriftAnalysis();
  const [values, setValues] = useState<DriftAnalysisFormValues>(defaultFormValues);
  const [result, setResult] = useState<DriftAnalysisPreview | null>(null);
  const [error, setError] = useState('');

  const latestBaselineId = useMemo(() => versions[0]?._id ?? '', [versions]);

  useEffect(() => {
    if (!values.baselineVersionId && latestBaselineId) {
      setValues((current) => ({ ...current, baselineVersionId: latestBaselineId }));
    }
  }, [latestBaselineId, values.baselineVersionId]);

  if (!hasRequirements) {
    return (
      <EmptyState
        title="Add requirements and create a baseline before analyzing drift."
        description="Phase 3 compares new client input against approved baseline requirements, so the project needs structured requirements first."
        icon={<AlertCircle className="h-5 w-5" />}
      />
    );
  }

  if (!versions.length) {
    return (
      <EmptyState
        title="Create a requirement baseline before running drift analysis."
        description="Save at least one baseline version so DriftLedger can compare future client input against approved scope."
        icon={<Sparkles className="h-5 w-5" />}
      />
    );
  }

  const handleAnalyze = async () => {
    if (!values.baselineVersionId || !values.inputText.trim()) {
      setError('Select a baseline and enter client input before running analysis.');
      return;
    }

    setError('');
    try {
      const analysis = await analyzeMutation.mutateAsync({
        projectId,
        baselineVersionId: values.baselineVersionId,
        inputText: values.inputText.trim(),
        inputType: values.inputType,
        useOllama: values.useOllama,
        ollamaModel: values.useOllama ? values.ollamaModel.trim() || undefined : undefined,
      });
      setResult(analysis);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to analyze drift');
    }
  };

  const handleSave = async () => {
    if (!result) return;

    try {
      const saved = await saveMutation.mutateAsync({
        projectId,
        baselineVersionId: result.baselineVersionId,
        inputText: result.inputText,
        inputType: result.inputType,
        detectedChanges: result.detectedChanges,
        driftScore: result.driftScore,
        riskLevel: result.riskLevel,
        summary: result.summary,
        addedCount: result.addedCount,
        modifiedCount: result.modifiedCount,
        removedCount: result.removedCount,
        ambiguousCount: result.ambiguousCount,
        contradictionCount: result.contradictionCount,
        estimatedExtraHours: result.estimatedExtraHours,
        analysisEngine: result.analysisEngine,
        ollamaUsed: result.ollamaUsed,
        ollamaModel: result.ollamaModel,
        status: 'saved',
      });

      setResult({
        ...result,
        baselineVersionId: saved.baselineVersion.toString(),
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save drift analysis');
    }
  };

  return (
    <Card className="border-lime-400/20 bg-black/60 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-lime-400">Requirement drift analysis</p>
          <h3 className="mt-1 text-xl font-semibold text-white">Compare new client input against the approved baseline</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
            Ollama is optional. If it is disabled or unavailable, DriftLedger uses the local rule-based engine.
          </p>
        </div>
        <div className="rounded-full border border-lime-400/20 bg-lime-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-lime-300">
          Local fallback enabled
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_0.85fr]">
        <div className="space-y-4">
          <BaselineSelector versions={versions} value={values.baselineVersionId} onChange={(baselineVersionId) => setValues((current) => ({ ...current, baselineVersionId }))} />

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-gray-300">Input type</span>
            <select value={values.inputType} onChange={(event) => setValues((current) => ({ ...current, inputType: event.target.value as DriftInputType }))} className={selectClass}>
              {inputTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-gray-300">New client message</span>
            <textarea
              value={values.inputText}
              onChange={(event) => setValues((current) => ({ ...current, inputText: event.target.value }))}
              rows={8}
              className="w-full rounded-2xl border border-gray-700 bg-black px-4 py-3 text-sm text-white shadow-sm outline-none transition placeholder:text-gray-500 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30"
              placeholder="Paste the latest client message, meeting note, or scope update here"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-start">
            <label className="flex items-center gap-3 rounded-2xl border border-gray-700 bg-black/50 px-4 py-3 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={values.useOllama}
                onChange={(event) => setValues((current) => ({ ...current, useOllama: event.target.checked }))}
                className="h-4 w-4 rounded border-gray-600 bg-black text-lime-400 focus:ring-lime-400/30"
              />
              Use Ollama
            </label>

            <InputOrModel value={values.ollamaModel} useOllama={values.useOllama} onChange={(ollamaModel) => setValues((current) => ({ ...current, ollamaModel }))} />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={handleAnalyze} disabled={analyzeMutation.isPending || saveMutation.isPending}>
              {analyzeMutation.isPending ? <Spinner /> : 'Run Drift Analysis'}
            </Button>
            {result ? (
              <Button type="button" variant="secondary" onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Spinner /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Save Analysis
              </Button>
            ) : null}
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </div>

        <div className="space-y-4">
          {result ? (
            <>
              <DriftScoreCard analysis={result} />
              <Card className="border-gray-800 bg-black/50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-lime-400">Detected changes</p>
                <div className="mt-4">
                  <DetectedChangesList changes={result.detectedChanges} />
                </div>
              </Card>
            </>
          ) : (
            <EmptyState
              title="Run a drift analysis to see results."
              description="The preview will show score, risk, detected changes, and a save option after analysis completes."
              icon={<Sparkles className="h-5 w-5" />}
            />
          )}
        </div>
      </div>
    </Card>
  );
};

const InputOrModel = ({ value, useOllama, onChange }: { value: string; useOllama: boolean; onChange: (value: string) => void }) => {
  return (
    <label className="block space-y-2 md:pt-0">
      <span className="text-sm font-semibold text-gray-300">Ollama model</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={!useOllama}
        placeholder="llama3.1:8b"
        className="h-11 w-full rounded-2xl border border-gray-700 bg-black px-4 text-sm text-white shadow-sm outline-none transition placeholder:text-gray-500 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30 disabled:cursor-not-allowed disabled:opacity-60"
      />
      <p className="text-xs text-gray-500">Optional local enhancement. The app still works when Ollama is disabled or unavailable.</p>
    </label>
  );
};
