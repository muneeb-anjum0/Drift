import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { Spinner } from '../../components/common/Spinner';
import type { ChangeRequestDraft } from './changeRequest.types';
import type { DriftAnalysis } from '../drift/drift.types';
import { driftAnalysisTitle } from '../drift/driftDisplay';
import { useGenerateChangeRequest, useSaveChangeRequest } from '../../hooks/useChangeRequests';
import { ChangeRequestStatusBadge } from './ChangeRequestStatusBadge';
import { generatedByLabel } from './changeRequestDisplay';

const selectClass =
  'h-10 w-full rounded-[1rem] border border-gray-700 bg-black px-3 text-sm text-white shadow-sm outline-none transition focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30';

const defaultDraft: ChangeRequestDraft = {
  driftAnalysisId: '',
  title: '',
  clientName: '',
  summary: '',
  changesRequested: [],
  businessReason: '',
  timelineImpact: '',
  costImpact: '',
  recommendedAction: '',
  approvalNote: '',
  status: 'draft',
  generatedBy: 'rule_based',
};

export const ChangeRequestPreview = ({ driftAnalyses }: { projectId: string; driftAnalyses: DriftAnalysis[] }) => {
  const generateMutation = useGenerateChangeRequest();
  const saveMutation = useSaveChangeRequest();
  const [selectedDriftAnalysisId, setSelectedDriftAnalysisId] = useState('');
  const [draft, setDraft] = useState<ChangeRequestDraft>(defaultDraft);
  const [error, setError] = useState('');

  const latestDriftAnalysisId = useMemo(() => driftAnalyses[0]?._id ?? '', [driftAnalyses]);
  const selectedAnalysis = useMemo(
    () => driftAnalyses.find((analysis) => analysis._id === selectedDriftAnalysisId),
    [driftAnalyses, selectedDriftAnalysisId]
  );
  const hasMeaningfulDrift = Boolean(selectedAnalysis?.detectedChanges.length);

  useEffect(() => {
    if (!selectedDriftAnalysisId && latestDriftAnalysisId) {
      setSelectedDriftAnalysisId(latestDriftAnalysisId);
    }
  }, [latestDriftAnalysisId, selectedDriftAnalysisId]);

  if (!driftAnalyses.length) {
    return (
      <EmptyState
        title="Save a comparison before preparing a change request."
        description="The draft starts from a saved proposed analysis. Review the wording before submitting it for a decision."
        icon={<Sparkles className="h-5 w-5" />}
      />
    );
  }

  const handleGenerate = async () => {
    if (!selectedDriftAnalysisId) {
      setError('Select a saved drift analysis first.');
      return;
    }
    if (!hasMeaningfulDrift) {
      setError('No change request is needed for an unchanged or no-drift analysis.');
      return;
    }

    setError('');
    try {
      const changeRequest = await generateMutation.mutateAsync({ driftAnalysisId: selectedDriftAnalysisId });
      setDraft({ ...changeRequest, status: 'draft' });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to generate change request');
    }
  };

  const handleSave = async () => {
    if (!draft.driftAnalysisId) return;

    try {
      await saveMutation.mutateAsync({ ...draft, status: 'draft' });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save change request');
    }
  };
  const updateRequestedChange = (index: number, patch: Partial<ChangeRequestDraft['changesRequested'][number]>) => setDraft((current) => ({ ...current, changesRequested: current.changesRequested.map((change, currentIndex) => currentIndex === index ? { ...change, ...patch } : change) }));

  return (
    <Card className="border-lime-400/20 bg-black/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-lime-400">Prepare a decision</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Draft a change request</h3>
          <p className="mt-1.5 max-w-2xl text-xs leading-5 text-gray-400">Generated wording is a proposal. Edit it before saving; saving a draft does not approve the change.</p>
        </div>
        <ChangeRequestStatusBadge status={draft.status} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-gray-300">Drift analysis</span>
            <select value={selectedDriftAnalysisId} onChange={(event) => setSelectedDriftAnalysisId(event.target.value)} className={selectClass}>
              {driftAnalyses.map((analysis) => (
                <option key={analysis._id} value={analysis._id}>
                  {driftAnalysisTitle(analysis.inputText)}
                </option>
              ))}
            </select>
          </label>

          <Button type="button" variant="secondary" onClick={handleGenerate} disabled={generateMutation.isPending || !hasMeaningfulDrift}>
            {generateMutation.isPending ? <Spinner /> : 'Prepare draft'}
          </Button>

          {selectedAnalysis && !hasMeaningfulDrift ? (
            <p className="text-sm text-gray-400">This saved analysis has no detected changes, so no change request is needed.</p>
          ) : null}

          {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}

          {draft.driftAnalysisId ? (
            <div className="space-y-3 rounded-[1rem] border border-gray-800 bg-black/40 p-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-gray-300">Title</span>
                <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} className={selectClass} />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-gray-300">Client name</span>
                <input value={draft.clientName} onChange={(event) => setDraft((current) => ({ ...current, clientName: event.target.value }))} className={selectClass} />
              </label>

              <TextAreaField label="Summary" value={draft.summary} onChange={(value) => setDraft((current) => ({ ...current, summary: value }))} rows={4} />
              <div className="space-y-2"><p className="text-sm font-semibold">Changes described in this draft</p><p className="text-xs text-gray-400">Edit the wording below before saving. This does not confirm the model's interpretation.</p>{draft.changesRequested.map((change, index) => <details key={index} className="rounded-lg border border-[var(--v-border)] p-3"><summary className="cursor-pointer text-sm font-medium">{change.title || `Change ${index + 1}`}</summary><div className="mt-3 space-y-3"><label className="block text-xs font-medium">Change title<input className={selectClass} value={change.title} onChange={(event) => updateRequestedChange(index, { title: event.target.value })} /></label><TextAreaField label="Description" value={change.description} onChange={(value) => updateRequestedChange(index, { description: value })} rows={3} /><label className="block text-xs font-medium">Potential impact<select className={selectClass} value={change.impact} onChange={(event) => updateRequestedChange(index, { impact: event.target.value as typeof change.impact })}>{(['low', 'medium', 'high', 'critical'] as const).map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label className="block text-xs font-medium">Affected areas<input className={selectClass} value={(change.affectedModules ?? []).join(', ')} onChange={(event) => updateRequestedChange(index, { affectedModules: event.target.value.split(',').map((part) => part.trim()).filter(Boolean) })} /></label></div></details>)}</div>
              <TextAreaField label="Business reason" value={draft.businessReason} onChange={(value) => setDraft((current) => ({ ...current, businessReason: value }))} rows={3} />
              <TextAreaField label="Timeline impact" value={draft.timelineImpact} onChange={(value) => setDraft((current) => ({ ...current, timelineImpact: value }))} rows={3} />
              <TextAreaField label="Cost impact" value={draft.costImpact} onChange={(value) => setDraft((current) => ({ ...current, costImpact: value }))} rows={3} />
              <TextAreaField label="Recommended action" value={draft.recommendedAction} onChange={(value) => setDraft((current) => ({ ...current, recommendedAction: value }))} rows={3} />
              <TextAreaField label="Approval note" value={draft.approvalNote} onChange={(value) => setDraft((current) => ({ ...current, approvalNote: value }))} rows={3} />

              <Button type="button" onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Spinner /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Save draft
              </Button>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          {draft.driftAnalysisId ? (
            <Card className="border-gray-800 bg-black/50 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-lime-400">Preview</p>
              <div className="mt-4 space-y-4 text-sm leading-6 text-gray-300">
                <p><span className="font-semibold text-white">Title:</span> {draft.title}</p>
                <p><span className="font-semibold text-white">Summary:</span> {draft.summary}</p>
                <div>
                  <p className="font-semibold text-white">Changes requested</p>
                  <div className="mt-3 space-y-3">
                    {draft.changesRequested.map((change, index) => (
                      <div key={`${change.title}-${index}`} className="rounded-2xl border border-gray-800 bg-black/40 p-4">
                        <p className="font-semibold text-white">{change.title}</p>
                        <p className="mt-1 text-gray-400">{change.description}</p>
                        {change.affectedModules?.length ? (
                          <p className="mt-2 text-xs text-gray-500">Affected modules: {change.affectedModules.join(', ')}</p>
                        ) : null}
                        <p className="mt-2 text-xs uppercase tracking-[0.14em] text-gray-500">
                          {change.changeType} / {change.impact}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <p><span className="font-semibold text-white">Business reason:</span> {draft.businessReason}</p>
                <p><span className="font-semibold text-white">Timeline impact:</span> {draft.timelineImpact}</p>
                <p><span className="font-semibold text-white">Cost impact:</span> {draft.costImpact}</p>
                <p><span className="font-semibold text-white">Recommended action:</span> {draft.recommendedAction}</p>
                <p><span className="font-semibold text-white">Approval note:</span> {draft.approvalNote}</p>
                <p><span className="font-semibold text-white">Generated by:</span> {generatedByLabel(draft.generatedBy)}</p>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </Card>
  );
};

const TextAreaField = ({ label, value, onChange, rows }: { label: string; value: string; onChange: (value: string) => void; rows: number }) => (
  <label className="block space-y-1.5">
    <span className="text-xs font-semibold text-gray-300">{label}</span>
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={rows}
      className="w-full rounded-[1rem] border border-gray-700 bg-black px-3 py-2 text-sm text-white shadow-sm outline-none transition placeholder:text-gray-500 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30"
    />
  </label>
);
