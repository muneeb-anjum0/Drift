import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { Spinner } from '../../components/common/Spinner';
import { BaselineSelector } from './BaselineSelector';
import { DriftScoreCard } from './DriftScoreCard';
import { DetectedChangesList } from './DetectedChangesList';
import type { DriftAnalysisFormValues, DriftAnalysisPreview, DriftInputType, ModelPrediction, RequirementAnalysisResult } from './drift.types';
import type { RequirementVersion } from '../requirements/requirement.types';
import { useAnalyzeDirectDrift, useAnalyzeDrift, useSaveDriftAnalysis } from '../../hooks/useDrift';

const selectClass =
  'h-11 w-full rounded-2xl border border-gray-700 bg-black px-4 text-sm text-white shadow-sm outline-none transition focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30';

const defaultFormValues: DriftAnalysisFormValues = {
  baselineVersionId: '',
  inputType: 'client_message',
  inputText: '',
};

const modelDisplayName = import.meta.env.VITE_DRIFT_MODEL_LABEL || 'Qwen2.5-7B + DriftLedger LoRA (GGUF Q4_K_M)';

const confidencePercent = (confidence: number) => {
  const normalized = confidence > 1 ? confidence : confidence * 100;
  return Math.max(0, Math.min(100, Math.round(normalized)));
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
  const directAnalyzeMutation = useAnalyzeDirectDrift();
  const saveMutation = useSaveDriftAnalysis();
  const [values, setValues] = useState<DriftAnalysisFormValues>(defaultFormValues);
  const [result, setResult] = useState<DriftAnalysisPreview | null>(null);
  const [directBaseline, setDirectBaseline] = useState('The system shall allow admins to export monthly reports as CSV.');
  const [directMessage, setDirectMessage] = useState('Can we also let admins download the same monthly report from the existing reports page?');
  const [directResult, setDirectResult] = useState<ModelPrediction | null>(null);
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
      });
      setResult(analysis);
      console.info(
        '[DriftLedger] Requirement-level drift analysis',
        (analysis.requirementResults ?? []).map((item) => ({
          title: item.title,
          status: item.status,
          label: item.label,
          confidence: item.confidence,
          relevanceScore: Number(item.relevance.score.toFixed(2)),
          selected: item.selected,
        }))
      );
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
        requirementResults: result.requirementResults,
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

  const handleDirectAnalyze = async () => {
    if (!directBaseline.trim() || !directMessage.trim()) {
      setError('Enter both a baseline requirement and new client message.');
      return;
    }

    setError('');
    try {
      const prediction = await directAnalyzeMutation.mutateAsync({
        baseline_requirement: directBaseline.trim(),
        new_client_message: directMessage.trim(),
      });
      setDirectResult(prediction);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to analyze model input');
    }
  };

  return (
    <Card className="border-white/10 bg-black/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-lime-400">AI drift analysis</p>
          <h3 className="mt-1 text-xl font-semibold text-white">Compare new client input against the approved baseline</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
            DriftLedger runs this analysis through the same local Qwen GGUF model route used by the sandbox.
          </p>
        </div>
        <div className="rounded-full border border-lime-400/20 bg-lime-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-lime-300">
          Local Q4_K_M
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <div className="grid gap-4 xl:grid-cols-2">
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
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-gray-300">New client message</span>
          <textarea
            value={values.inputText}
            onChange={(event) => setValues((current) => ({ ...current, inputText: event.target.value }))}
            rows={7}
            className="w-full rounded-2xl border border-gray-700 bg-black px-4 py-3 text-sm text-white shadow-sm outline-none transition placeholder:text-gray-500 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30"
            placeholder="Paste the latest client message, meeting note, or scope update here"
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-lime-400/20 bg-lime-400/10 px-4 py-3">
          <p className="text-sm text-lime-100">
            Model used: <span className="font-semibold text-lime-300">{modelDisplayName}</span>
          </p>

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
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        {result ? (
          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="min-w-0">
                <DriftScoreCard analysis={result} />
              </div>
              <Card className="min-w-0 border-gray-800 bg-black/50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-400">Detected changes</p>
                <div className="mt-4">
                  <DetectedChangesList changes={result.detectedChanges} />
                </div>
              </Card>
            </div>

            {result.requirementResults?.length ? (
              <Card className="border-gray-800 bg-black/50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-400">Requirements analyzed</p>
                    <h4 className="mt-1 text-base font-semibold text-white">
                      {(result.requirementResults ?? []).filter((item) => item.status === 'analyzed').length} relevant requirement
                      {(result.requirementResults ?? []).filter((item) => item.status === 'analyzed').length === 1 ? '' : 's'} checked by the model
                    </h4>
                  </div>
                  <span className="rounded-full border border-lime-400/20 bg-lime-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-lime-300">
                    Relevance filtered
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {(result.requirementResults ?? [])
                    .filter((item) => item.status === 'analyzed')
                    .map((item) => (
                      <RequirementResultCard key={item.requirementId} item={item} />
                    ))}
                </div>

                {(result.requirementResults ?? []).some((item) => item.status === 'ignored') ? (
                  <details className="mt-4 rounded-2xl border border-gray-800 bg-black/30 p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-gray-300">Ignored unrelated requirements</summary>
                    <div className="mt-3 space-y-3">
                      {(result.requirementResults ?? [])
                        .filter((item) => item.status === 'ignored')
                        .map((item) => (
                          <div key={item.requirementId} className="rounded-2xl border border-gray-800 bg-black/40 p-4 opacity-75">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-gray-200">{item.title || 'Untitled requirement'}</p>
                                <p className="mt-2 text-sm leading-6 text-gray-500">{item.text}</p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-gray-700 bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">Ignored</span>
                                <span className="rounded-full border border-gray-700 bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                                  {Math.round(item.relevance.score * 100)}% relevance
                                </span>
                              </div>
                            </div>
                            <p className="mt-3 text-sm text-gray-500">{item.relevance.reason}</p>
                          </div>
                        ))}
                    </div>
                  </details>
                ) : null}
              </Card>
            ) : null}
          </div>
        ) : (
          <EmptyState
            title="Run a drift analysis to see results."
            description="The preview will show score, risk, detected changes, and a save option after analysis completes."
            icon={<Sparkles className="h-5 w-5" />}
          />
        )}

        <Card className="border-gray-800 bg-black/50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-400">Model sandbox</p>
              <h4 className="mt-1 text-base font-semibold text-white">Test a single baseline against one client message</h4>
              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-400">
                Developer test area. Compare one baseline requirement against one client message; project analysis still runs requirement-by-requirement.
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={handleDirectAnalyze} disabled={directAnalyzeMutation.isPending}>
              {directAnalyzeMutation.isPending ? <Spinner /> : 'Analyze'}
            </Button>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-gray-300">Baseline requirement</span>
              <textarea
                value={directBaseline}
                onChange={(event) => setDirectBaseline(event.target.value)}
                rows={5}
                className="w-full rounded-2xl border border-gray-700 bg-black px-4 py-3 text-sm text-white shadow-sm outline-none transition placeholder:text-gray-500 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-gray-300">New client message</span>
              <textarea
                value={directMessage}
                onChange={(event) => setDirectMessage(event.target.value)}
                rows={5}
                className="w-full rounded-2xl border border-gray-700 bg-black px-4 py-3 text-sm text-white shadow-sm outline-none transition placeholder:text-gray-500 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30"
              />
            </label>
          </div>

          {directResult ? (
            <div className="mt-4 rounded-2xl border border-lime-400/20 bg-lime-400/10 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-lime-400/30 px-3 py-1 text-sm font-semibold capitalize text-lime-200">{directResult.label}</span>
                <span className="text-sm text-lime-100">Confidence {(directResult.confidence * 100).toFixed(0)}%</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-200">{directResult.reasoning}</p>
              {directResult.changed_elements.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {directResult.changed_elements.map((item) => (
                    <span key={item} className="rounded-full bg-white/10 px-3 py-1 text-xs text-gray-200">
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>
      </div>
    </Card>
  );
};

const RequirementResultCard = ({ item }: { item: RequirementAnalysisResult }) => (
  <div className="rounded-2xl border border-gray-800 bg-black/40 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-white">{item.title || 'Untitled requirement'}</p>
          {item.selected ? (
            <span className="rounded-full border border-lime-400/25 bg-lime-400/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-lime-300">
              selected
            </span>
          ) : null}
          <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-300">
            Relevant
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-gray-400">{item.text}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-gray-700 bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-200">
          {item.label ?? 'not classified'}
        </span>
        <span className="rounded-full border border-gray-700 bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
          {confidencePercent(item.confidence ?? 0)}%
        </span>
        <span className="rounded-full border border-gray-700 bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
          {Math.round(item.relevance.score * 100)}% relevance
        </span>
      </div>
    </div>
    <p className="mt-3 text-sm leading-6 text-gray-300">{item.reasoning || item.relevance.reason}</p>
  </div>
);
