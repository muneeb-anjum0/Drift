import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Plus, CheckCheck } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { EmptyState } from '../../components/common/EmptyState';
import { RequirementBadges } from './RequirementBadges';
import { useCreateRequirement, useExtractRequirements } from '../../hooks/useRequirements';
import type { RequirementExtractionSuggestion } from './requirement.types';

interface RequirementExtractionPanelProps {
  projectId: string;
  workspaceId?: string;
  defaultSourceText?: string;
}

const suggestionKey = (suggestion: RequirementExtractionSuggestion) => `${suggestion.title}::${suggestion.sourceText}`;

export const RequirementExtractionPanel = ({ projectId, workspaceId, defaultSourceText = '' }: RequirementExtractionPanelProps) => {
  const [sourceText, setSourceText] = useState(defaultSourceText);
  const [suggestions, setSuggestions] = useState<RequirementExtractionSuggestion[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [savingKey, setSavingKey] = useState('');
  const [savingAll, setSavingAll] = useState(false);

  const extractMutation = useExtractRequirements();
  const createRequirementMutation = useCreateRequirement();

  useEffect(() => {
    setSourceText(defaultSourceText);
  }, [defaultSourceText]);

  const suggestionCount = suggestions.length;
  const canExtract = useMemo(() => sourceText.trim().length > 0, [sourceText]);

  const handleExtract = async () => {
    setError('');
    setMessage('');
    if (!sourceText.trim()) {
      setError('Paste source text before extracting requirements.');
      return;
    }

    try {
      const extracted = await extractMutation.mutateAsync({ projectId, sourceText, source: 'original_scope' });
      setSuggestions(extracted);
      setMessage(extracted.length ? `Found ${extracted.length} requirement suggestion${extracted.length === 1 ? '' : 's'}. Review before saving.` : 'No requirement-like statements were detected.');
    } catch (extractError) {
      setError(extractError instanceof Error ? extractError.message : 'Unable to extract requirements');
    }
  };

  const handleAddSuggestion = async (suggestion: RequirementExtractionSuggestion) => {
    setError('');
    setMessage('');
    const key = suggestionKey(suggestion);
    setSavingKey(key);

    try {
      await createRequirementMutation.mutateAsync({ projectId, workspaceId, ...suggestion });
      setSuggestions((current) => current.filter((item) => suggestionKey(item) !== key));
      setMessage(`Added ${suggestion.title}.`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to add requirement');
    } finally {
      setSavingKey('');
    }
  };

  const handleAddAll = async () => {
    if (!suggestions.length) return;
    setError('');
    setMessage('');
    setSavingAll(true);

    try {
      for (const suggestion of suggestions) {
        await createRequirementMutation.mutateAsync({ projectId, workspaceId, ...suggestion });
      }
      setSuggestions([]);
      setMessage('All extracted requirements were added.');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to add all requirements');
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <Card className="border-lime-400/20 bg-black/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-lime-400">Extraction</p>
          <h3 className="mt-1 text-base font-semibold text-white">Extract from scope text</h3>
          <p className="mt-1.5 text-xs leading-5 text-gray-400">Review extracted requirements before saving them.</p>
        </div>
        <div className="rounded-full border border-lime-400/20 bg-lime-400/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-lime-300">
          {suggestionCount} suggestions
        </div>
      </div>

      <label className="mt-4 block space-y-1.5">
        <span className="text-xs font-semibold text-gray-300">Source text</span>
        <textarea
          value={sourceText}
          onChange={(event) => setSourceText(event.target.value)}
          rows={5}
          className="w-full rounded-[1rem] border border-gray-700 bg-black px-3 py-2.5 text-sm leading-6 text-white shadow-sm outline-none transition placeholder:text-gray-500 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30"
          placeholder="Paste scope text, client notes, or a requirement brief here"
        />
      </label>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button type="button" className="min-w-0 whitespace-nowrap px-3 text-xs sm:text-sm" onClick={handleExtract} disabled={!canExtract || extractMutation.isPending}>
          {extractMutation.isPending ? <Spinner /> : <Sparkles className="mr-2 h-4 w-4" />}
          <span className="hidden min-[420px]:inline">Extract Requirements</span>
          <span className="min-[420px]:hidden">Extract</span>
        </Button>
        <Button type="button" variant="secondary" className="min-w-0 whitespace-nowrap px-3 text-xs sm:text-sm" onClick={() => setSourceText(defaultSourceText)} disabled={!defaultSourceText}>
          <span className="hidden min-[420px]:inline">Reset to project scope</span>
          <span className="min-[420px]:hidden">Reset scope</span>
        </Button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-lime-300">{message}</p> : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Review suggestions</p>
          <p className="mt-0.5 text-xs text-gray-400">Add one or save them all after checking the text.</p>
        </div>
        <Button type="button" variant="secondary" size="sm" className="shrink-0 whitespace-nowrap px-3" onClick={handleAddAll} disabled={!suggestions.length || savingAll}>
          {savingAll ? <Spinner /> : <Plus className="mr-2 h-4 w-4" />}
          Add all
        </Button>
      </div>

      <div className="mt-3 space-y-2">
        {!suggestions.length ? (
          <EmptyState
            title="No extracted requirements"
            description="Paste project scope text and extract suggestions to populate this list."
            icon={<CheckCheck className="h-5 w-5" />}
          />
        ) : (
          suggestions.map((suggestion) => {
            const key = suggestionKey(suggestion);
            return (
              <div key={key} className="rounded-[1rem] border border-gray-800 bg-black/40 p-3 transition hover:border-lime-400/30">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h4 className="text-base font-semibold text-white">{suggestion.title}</h4>
                      <RequirementBadges requirement={suggestion} />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-gray-400">{suggestion.description}</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-[0.9rem] border border-gray-800 bg-black/50 p-3 text-xs text-gray-400">
                        <p className="text-xs uppercase tracking-[0.12em] text-gray-500">Acceptance criteria</p>
                        <ul className="mt-2 space-y-1">
                          {suggestion.acceptanceCriteria.map((criterion) => (
                            <li key={criterion}>- {criterion}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-[0.9rem] border border-gray-800 bg-black/50 p-3 text-xs text-gray-400">
                        <p className="text-xs uppercase tracking-[0.12em] text-gray-500">Source text</p>
                        <p className="mt-2 leading-6 text-gray-300">{suggestion.sourceText}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2 lg:flex-col">
                    <Button type="button" size="sm" onClick={() => handleAddSuggestion(suggestion)} disabled={savingAll || savingKey === key}>
                      {savingKey === key ? <Spinner /> : 'Add'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};
