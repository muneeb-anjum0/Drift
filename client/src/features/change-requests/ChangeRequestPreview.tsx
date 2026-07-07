import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { Spinner } from '../../components/common/Spinner';
import type { ChangeRequest, ChangeRequestDraft } from './changeRequest.types';
import type { DriftAnalysis } from '../drift/drift.types';
import { driftAnalysisTitle } from '../drift/driftDisplay';
import { useGenerateChangeRequest, useSaveChangeRequest } from '../../hooks/useChangeRequests';
import { ChangeRequestStatusBadge } from './ChangeRequestStatusBadge';

const selectClass =
  'h-11 w-full rounded-2xl border border-gray-700 bg-black px-4 text-sm text-white shadow-sm outline-none transition focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30';

const statusOptions: Array<ChangeRequest['status']> = ['draft', 'sent', 'approved', 'rejected', 'archived'];

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

export const ChangeRequestPreview = ({ projectId, driftAnalyses }: { projectId: string; driftAnalyses: DriftAnalysis[] }) => {
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
        title="Save a drift analysis before generating a change request."
        description="Change requests are generated from reviewed drift analyses so the client-facing draft matches the approved analysis."
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
      setDraft(changeRequest);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to generate change request');
    }
  };

  const handleSave = async () => {
    if (!draft.driftAnalysisId) return;

    try {
      await saveMutation.mutateAsync(draft);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save change request');
    }
  };

  return (
    <Card className="border-lime-400/20 bg-black/60 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-lime-400">Change request preview</p>
          <h3 className="mt-1 text-xl font-semibold text-white">Generate a client-friendly change request from drift analysis</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">Review and edit the draft before saving it as an official change request.</p>
        </div>
        <ChangeRequestStatusBadge status={draft.status} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-gray-300">Drift analysis</span>
            <select value={selectedDriftAnalysisId} onChange={(event) => setSelectedDriftAnalysisId(event.target.value)} className={selectClass}>
              {driftAnalyses.map((analysis) => (
                <option key={analysis._id} value={analysis._id}>
                  {driftAnalysisTitle(analysis.inputText)} - {analysis.driftScore}/100
                </option>
              ))}
            </select>
          </label>

          <Button type="button" onClick={handleGenerate} disabled={generateMutation.isPending || !hasMeaningfulDrift}>
            {generateMutation.isPending ? <Spinner /> : 'Generate Change Request'}
          </Button>

          {selectedAnalysis && !hasMeaningfulDrift ? (
            <p className="text-sm text-gray-400">This saved analysis has no detected changes, so no change request is needed.</p>
          ) : null}

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          {draft.driftAnalysisId ? (
            <div className="space-y-4 rounded-3xl border border-gray-800 bg-black/40 p-5">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-gray-300">Title</span>
                <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} className={selectClass} />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-gray-300">Client name</span>
                <input value={draft.clientName} onChange={(event) => setDraft((current) => ({ ...current, clientName: event.target.value }))} className={selectClass} />
              </label>

              <TextAreaField label="Summary" value={draft.summary} onChange={(value) => setDraft((current) => ({ ...current, summary: value }))} rows={4} />
              <TextAreaField label="Business reason" value={draft.businessReason} onChange={(value) => setDraft((current) => ({ ...current, businessReason: value }))} rows={3} />
              <TextAreaField label="Timeline impact" value={draft.timelineImpact} onChange={(value) => setDraft((current) => ({ ...current, timelineImpact: value }))} rows={3} />
              <TextAreaField label="Cost impact" value={draft.costImpact} onChange={(value) => setDraft((current) => ({ ...current, costImpact: value }))} rows={3} />
              <TextAreaField label="Recommended action" value={draft.recommendedAction} onChange={(value) => setDraft((current) => ({ ...current, recommendedAction: value }))} rows={3} />
              <TextAreaField label="Approval note" value={draft.approvalNote} onChange={(value) => setDraft((current) => ({ ...current, approvalNote: value }))} rows={3} />

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-gray-300">Status</span>
                <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as ChangeRequest['status'] }))} className={selectClass}>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <Button type="button" variant="secondary" onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Spinner /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Save Change Request
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
                          {change.changeType} / {change.impact} / {change.estimatedEffort ?? 0}h
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
                <p><span className="font-semibold text-white">Generated by:</span> {draft.generatedBy}</p>
              </div>
            </Card>
          ) : (
            <EmptyState
              title="Generate a preview to review the change request."
              description="The draft can be edited before you save it as an official client-facing request."
              icon={<Sparkles className="h-5 w-5" />}
            />
          )}
        </div>
      </div>
    </Card>
  );
};

const TextAreaField = ({ label, value, onChange, rows }: { label: string; value: string; onChange: (value: string) => void; rows: number }) => (
  <label className="block space-y-2">
    <span className="text-sm font-semibold text-gray-300">{label}</span>
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={rows}
      className="w-full rounded-2xl border border-gray-700 bg-black px-4 py-3 text-sm text-white shadow-sm outline-none transition placeholder:text-gray-500 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30"
    />
  </label>
);
