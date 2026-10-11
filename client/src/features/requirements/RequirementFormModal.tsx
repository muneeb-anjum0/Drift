import { useEffect, useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { ThemedSelect } from '../../components/common/ThemedSelect';
import type { RequirementFormSubmitValues, RequirementFormValues, RequirementPriority, RequirementSource, RequirementStatus, RequirementType } from './requirement.types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: RequirementFormSubmitValues) => Promise<void>;
  initialValues?: Partial<RequirementFormValues>;
  mode?: 'create' | 'edit';
  isSubmitting?: boolean;
}

const defaults: RequirementFormValues = { title: '', description: '', type: 'functional', priority: 'medium', status: 'proposed', source: 'manual', sourceText: '', acceptanceCriteria: '', tags: '', estimatedEffort: '' };
const types: RequirementType[] = ['functional', 'non_functional', 'business', 'technical', 'ui_ux', 'security', 'performance', 'integration', 'other'];
const priorities: RequirementPriority[] = ['low', 'medium', 'high', 'critical'];
const statuses: RequirementStatus[] = ['proposed', 'approved', 'in_progress', 'completed', 'rejected', 'changed'];
const sources: RequirementSource[] = ['manual', 'original_scope', 'client_message', 'meeting_note', 'document', 'ai_extracted'];
const options = <T extends string,>(values: T[]) => values.map((value) => ({ value, label: value.replace(/_/g, ' ').replace(/^./, (letter: string) => letter.toUpperCase()) }));
const splitList = (value: string) => value.split(/\n|,/).map((part) => part.trim()).filter(Boolean);

export const RequirementFormModal = ({ open, onClose, onSubmit, initialValues, mode = 'create', isSubmitting = false }: Props) => {
  const [values, setValues] = useState<RequirementFormValues>({ ...defaults, ...initialValues });
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setValues({ ...defaults, ...initialValues }); setError(''); } }, [open, mode, initialValues?.title]);
  const update = <K extends keyof RequirementFormValues>(key: K, value: RequirementFormValues[K]) => setValues((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const estimatedEffort = values.estimatedEffort.trim() ? Number(values.estimatedEffort) : undefined;
    if (estimatedEffort !== undefined && (!Number.isFinite(estimatedEffort) || estimatedEffort < 0)) { setError('Estimated effort must be a non-negative number.'); return; }
    setError('');
    try {
      await onSubmit({ title: values.title.trim(), description: values.description.trim(), type: values.type, priority: values.priority, status: values.status, source: values.source, sourceText: values.sourceText.trim(), acceptanceCriteria: splitList(values.acceptanceCriteria), tags: splitList(values.tags), estimatedEffort });
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The scope item could not be saved.'); }
  };

  return <Modal open={open} title={mode === 'create' ? 'Add agreed scope' : 'Edit scope item'} description="Describe one thing the project is expected to deliver." onClose={onClose} size="lg" footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="scope-item-form" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : mode === 'create' ? 'Add scope item' : 'Save changes'}</Button></div>}>
    <form id="scope-item-form" onSubmit={submit} className="space-y-4">
      <Input label="Title" value={values.title} onChange={(event) => update('title', event.target.value)} placeholder="Monthly reports can be exported" required />
      <label className="block text-sm font-medium">Description<textarea className="mt-2 block min-h-24 w-full rounded-lg border border-[var(--v-border)] bg-white p-3 font-normal" value={values.description} onChange={(event) => update('description', event.target.value)} placeholder="Explain the agreed behavior in plain language" required /></label>
      <div className="grid gap-4 sm:grid-cols-2"><ThemedSelect label="Priority" value={values.priority} options={options(priorities)} onChange={(value) => update('priority', value)} /><ThemedSelect label="Type" value={values.type} options={options(types)} onChange={(value) => update('type', value)} /></div>
      <details className="rounded-lg border border-[var(--v-border)] p-4"><summary className="cursor-pointer font-semibold">More details</summary><div className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2"><ThemedSelect label="Status" value={values.status} options={options(statuses)} onChange={(value) => update('status', value)} /><ThemedSelect label="Source" value={values.source} options={options(sources)} onChange={(value) => update('source', value)} /></div>
        <label className="block text-sm font-medium">Acceptance criteria<textarea className="mt-2 block min-h-20 w-full rounded-lg border border-[var(--v-border)] bg-white p-3 font-normal" value={values.acceptanceCriteria} onChange={(event) => update('acceptanceCriteria', event.target.value)} placeholder="One condition per line" /></label>
        <label className="block text-sm font-medium">Source text<textarea className="mt-2 block min-h-20 w-full rounded-lg border border-[var(--v-border)] bg-white p-3 font-normal" value={values.sourceText} onChange={(event) => update('sourceText', event.target.value)} placeholder="Original wording, if useful" /></label>
        <div className="grid gap-4 sm:grid-cols-2"><Input label="Tags" value={values.tags} onChange={(event) => update('tags', event.target.value)} helperText="Separate tags with commas." /><Input label="Estimated effort" type="number" min="0" value={values.estimatedEffort} onChange={(event) => update('estimatedEffort', event.target.value)} helperText="Optional planning number; unit is not defined by the current API." /></div>
      </div></details>
      {error ? <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p> : null}
    </form>
  </Modal>;
};
