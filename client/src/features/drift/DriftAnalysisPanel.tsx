import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { Spinner } from '../../components/common/Spinner';
import { BaselineSelector } from './BaselineSelector';
import { DriftScoreCard } from './DriftScoreCard';
import { DetectedChangesList } from './DetectedChangesList';
import type { ChangeType, DetectedChange, DriftAnalysisFormValues, DriftAnalysisPreview, DriftInputType, ModelPrediction, RiskLevel } from './drift.types';
import type { RequirementSnapshot, RequirementVersion } from '../requirements/requirement.types';
import { useAnalyzeDirectDrift, useSaveDriftAnalysis } from '../../hooks/useDrift';

const selectClass =
  'h-11 w-full rounded-2xl border border-gray-700 bg-black px-4 text-sm text-white shadow-sm outline-none transition focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30';

const defaultFormValues: DriftAnalysisFormValues = {
  baselineVersionId: '',
  inputType: 'client_message',
  inputText: '',
};

const modelDisplayName = 'Qwen2.5-7B + DriftLedger LoRA (GGUF Q3_K_M)';

const labelScores: Record<ChangeType, number> = {
  added: 35,
  modified: 45,
  removed: 55,
  ambiguous: 25,
  contradiction: 75,
  unchanged: 0,
};

const labelEffort: Record<ChangeType, number> = {
  added: 2,
  modified: 4,
  removed: 3,
  ambiguous: 1,
  contradiction: 8,
  unchanged: 0,
};

const labelImpact: Record<ChangeType, DetectedChange['impact']> = {
  added: 'low',
  modified: 'medium',
  removed: 'medium',
  ambiguous: 'medium',
  contradiction: 'high',
  unchanged: 'low',
};

const labelTitle: Record<ChangeType, string> = {
  added: 'Added requirement',
  modified: 'Modified requirement',
  removed: 'Removed requirement',
  ambiguous: 'Ambiguous request',
  contradiction: 'Contradictory request',
  unchanged: 'No scope change',
};

type RequirementModelResult = {
  requirementId: string;
  title: string;
  text: string;
  prediction: ModelPrediction;
  relevanceScore: number;
  selected: boolean;
};

const recommendationForLabel = (label: ChangeType) => {
  if (label === 'added') return 'Confirm whether this should be added to the approved baseline and update the estimate.';
  if (label === 'modified') return 'Review whether the approved baseline needs an update before implementation.';
  if (label === 'removed') return 'Confirm removal before changing the implementation scope.';
  if (label === 'contradiction') return 'Resolve this contradiction before work continues.';
  if (label === 'ambiguous') return 'Clarify this request before adding it to scope.';
  return 'No baseline change is needed for this input.';
};

const riskForScore = (score: number): RiskLevel => {
  if (score >= 70) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
};

const confidencePercent = (confidence: number) => {
  const normalized = confidence > 1 ? confidence : confidence * 100;
  return Math.max(0, Math.min(100, Math.round(normalized)));
};

const cleanChangedElement = (element: string, label: ChangeType) => {
  const withoutStatus = element.replace(/\s*\((added|modified|removed|contradiction|ambiguous|unchanged)\)\s*$/i, '').trim();
  return withoutStatus || labelTitle[label];
};

const requirementText = (requirement: RequirementSnapshot) => (requirement.description || requirement.title || '').trim();

const tokenStopWords = new Set([
  'the',
  'system',
  'shall',
  'should',
  'allow',
  'also',
  'same',
  'from',
  'with',
  'that',
  'this',
  'they',
  'their',
  'there',
  'existing',
  'page',
  'users',
  'user',
  'admins',
  'admin',
  'can',
  'let',
]);

const normalizeToken = (token: string) => {
  if (token.endsWith('ies') && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith('s') && token.length > 4) return token.slice(0, -1);
  return token;
};

const meaningfulTokens = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .map(normalizeToken)
      .filter((token) => token.length > 2 && !tokenStopWords.has(token))
  );

const relevanceScore = (requirement: string, message: string) => {
  const requirementTokens = meaningfulTokens(requirement);
  const messageTokens = meaningfulTokens(message);
  if (!requirementTokens.size || !messageTokens.size) return 0;

  let overlap = 0;
  messageTokens.forEach((token) => {
    if (requirementTokens.has(token)) overlap += 1;
  });

  return overlap / Math.min(requirementTokens.size, messageTokens.size);
};

const previewFromRequirementResults = ({
  projectId,
  version,
  values,
  results,
}: {
  projectId: string;
  version: RequirementVersion;
  values: DriftAnalysisFormValues;
  results: RequirementModelResult[];
}): DriftAnalysisPreview => {
  const sortedResults = [...results].sort((a, b) => {
    const scoreA = a.relevanceScore * 100 + confidencePercent(a.prediction.confidence) + labelScores[a.prediction.label];
    const scoreB = b.relevanceScore * 100 + confidencePercent(b.prediction.confidence) + labelScores[b.prediction.label];
    return scoreB - scoreA;
  });
  const relevantResults = sortedResults.filter((result) => result.relevanceScore >= 0.15);
  const selectedResults = relevantResults.length ? relevantResults : sortedResults.slice(0, 1);
  const impactfulResults = selectedResults.filter((result) => result.prediction.label !== 'unchanged' && confidencePercent(result.prediction.confidence) >= 35);
  const topResult = selectedResults[0] ?? sortedResults[0];

  results.forEach((result) => {
    result.selected = selectedResults.some((selected) => selected.requirementId === result.requirementId);
  });

  const detectedChanges: DetectedChange[] = impactfulResults.map((result) => {
    const { prediction } = result;
    const firstChangedElement = prediction.changed_elements.find((element) => element.trim().length > 0);
    const titleText = firstChangedElement ? cleanChangedElement(firstChangedElement, prediction.label) : result.title || labelTitle[prediction.label];

    return {
      changeType: prediction.label,
      title: titleText,
      description: prediction.reasoning || 'The model detected requirement drift.',
      baselineRequirementId: result.requirementId,
      baselineRequirementTitle: result.title,
      oldText: result.text,
      newText: values.inputText.trim(),
      impact: labelImpact[prediction.label],
      estimatedEffort: labelEffort[prediction.label],
      confidence: confidencePercent(prediction.confidence),
      recommendation: recommendationForLabel(prediction.label),
    };
  });
  const score = detectedChanges.reduce((maxScore, change) => Math.max(maxScore, labelScores[change.changeType]), 0);
  const summary =
    detectedChanges.length > 0
      ? detectedChanges.map((change) => change.description).join(' ')
      : topResult?.prediction.reasoning || 'No material drift detected against the relevant baseline requirement.';

  return {
    projectId,
    baselineVersionId: version._id,
    baselineVersionNumber: version.versionNumber,
    inputType: values.inputType,
    inputText: values.inputText.trim(),
    driftScore: score,
    riskLevel: riskForScore(score),
    summary,
    detectedChanges,
    addedCount: detectedChanges.filter((change) => change.changeType === 'added').length,
    modifiedCount: detectedChanges.filter((change) => change.changeType === 'modified').length,
    removedCount: detectedChanges.filter((change) => change.changeType === 'removed').length,
    ambiguousCount: detectedChanges.filter((change) => change.changeType === 'ambiguous').length,
    contradictionCount: detectedChanges.filter((change) => change.changeType === 'contradiction').length,
    estimatedExtraHours: detectedChanges.reduce((total, change) => total + (change.estimatedEffort ?? 0), 0),
    analysisEngine: 'qwen_lora',
    ollamaUsed: false,
    ollamaModel: null,
  };
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
  const analyzeMutation = useAnalyzeDirectDrift();
  const directAnalyzeMutation = useAnalyzeDirectDrift();
  const saveMutation = useSaveDriftAnalysis();
  const [values, setValues] = useState<DriftAnalysisFormValues>(defaultFormValues);
  const [result, setResult] = useState<DriftAnalysisPreview | null>(null);
  const [directBaseline, setDirectBaseline] = useState('The system shall allow admins to export monthly reports as CSV.');
  const [directMessage, setDirectMessage] = useState('Can we also let admins download the same monthly report from the existing reports page?');
  const [directResult, setDirectResult] = useState<ModelPrediction | null>(null);
  const [requirementResults, setRequirementResults] = useState<RequirementModelResult[]>([]);
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

    const selectedVersion = versions.find((version) => version._id === values.baselineVersionId);
    const baselineRequirements =
      selectedVersion?.requirementsSnapshot
        .map((requirement) => ({
          requirement,
          text: requirementText(requirement),
        }))
        .filter(({ text }) => Boolean(text)) ?? [];

    if (!selectedVersion || !baselineRequirements.length) {
      setError('The selected baseline does not contain requirement text.');
      return;
    }

    setError('');
    setRequirementResults([]);
    try {
      const nextRequirementResults: RequirementModelResult[] = [];
      for (const { requirement, text } of baselineRequirements) {
        const prediction = await analyzeMutation.mutateAsync({
          baseline_requirement: text,
          new_client_message: values.inputText.trim(),
        });
        nextRequirementResults.push({
          requirementId: requirement.requirementId,
          title: requirement.title,
          text,
          prediction,
          relevanceScore: relevanceScore(text, values.inputText),
          selected: false,
        });
      }

      const analysis = previewFromRequirementResults({
        projectId,
        version: selectedVersion,
        values,
        results: nextRequirementResults,
      });
      setRequirementResults([...nextRequirementResults]);
      setResult(analysis);
      console.info(
        '[DriftLedger] Requirement-level drift analysis',
        nextRequirementResults.map((item) => ({
          title: item.title,
          label: item.prediction.label,
          confidence: item.prediction.confidence,
          relevanceScore: Number(item.relevanceScore.toFixed(2)),
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
          Local Q3_K_M
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

            {requirementResults.length ? (
              <Card className="border-gray-800 bg-black/50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-400">Requirements analyzed</p>
                    <h4 className="mt-1 text-base font-semibold text-white">{requirementResults.length} baseline requirement{requirementResults.length === 1 ? '' : 's'} checked one at a time</h4>
                  </div>
                  <span className="rounded-full border border-lime-400/20 bg-lime-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-lime-300">
                    Single-requirement mode
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {requirementResults.map((item) => (
                    <div key={item.requirementId} className="rounded-2xl border border-gray-800 bg-black/40 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-white">{item.title || 'Untitled requirement'}</p>
                            {item.selected ? (
                              <span className="rounded-full border border-lime-400/25 bg-lime-400/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-lime-300">
                                selected
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-gray-400">{item.text}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-gray-700 bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-200">
                            {item.prediction.label}
                          </span>
                          <span className="rounded-full border border-gray-700 bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
                            {confidencePercent(item.prediction.confidence)}%
                          </span>
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-gray-300">{item.prediction.reasoning}</p>
                    </div>
                  ))}
                </div>
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
