import { useEffect, useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { ThemedSelect } from '../../components/common/ThemedSelect';
import type { ProjectFormValues } from './project.types';
import type { Workspace } from '../../types';

const empty: ProjectFormValues = { workspaceId: '', name: '', clientName: '', description: '', status: 'planning', priority: 'medium', originalScope: '', deadline: '' };
type Props = { open: boolean; onClose: () => void; onSubmit: (values: ProjectFormValues) => Promise<void>; workspaces: Workspace[]; initialValues?: Partial<ProjectFormValues>; mode?: 'create' | 'edit'; isSubmitting?: boolean };

export const ProjectForm = ({ open, onClose, onSubmit, workspaces, initialValues, mode = 'create', isSubmitting = false }: Props) => {
  const [values, setValues] = useState<ProjectFormValues>({ ...empty, ...initialValues });
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setValues({ ...empty, ...initialValues }); setError(''); } }, [open, mode, initialValues?.workspaceId, initialValues?.name]);
  const update = <K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) => setValues((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!values.workspaceId) { setError('Choose a workspace first.'); return; }
    setError('');
    try { await onSubmit(values); onClose(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Project could not be saved.'); }
  };

  return <Modal open={open} title={mode === 'create' ? 'Create a project' : 'Edit project'} description="Start with the client and the original agreement. Add detailed scope items next." onClose={onClose} size="lg" footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="project-form" disabled={isSubmitting || !workspaces.length}>{isSubmitting ? 'Saving…' : mode === 'create' ? 'Create project' : 'Save changes'}</Button></div>}>
    <form id="project-form" onSubmit={submit} className="space-y-4">
      <ThemedSelect label="Workspace" value={values.workspaceId} disabled={mode === 'edit'} placeholder="Choose a workspace" options={workspaces.map((workspace) => ({ value: workspace._id, label: workspace.name }))} onChange={(value) => update('workspaceId', value)} />
      <div className="grid gap-4 sm:grid-cols-2"><Input label="Project name" value={values.name} onChange={(event) => update('name', event.target.value)} required /><Input label="Client name" value={values.clientName} onChange={(event) => update('clientName', event.target.value)} required /></div>
      <label className="block text-sm font-medium">Original agreement<textarea className="mt-2 block min-h-28 w-full rounded-lg border border-[var(--v-border)] bg-white p-3 font-normal" value={values.originalScope} onChange={(event) => update('originalScope', event.target.value)} placeholder="In plain language, what was originally agreed?" /></label>
      <details className="rounded-lg border border-[var(--v-border)] p-4"><summary className="cursor-pointer font-semibold">More project details</summary><div className="mt-4 space-y-4">
        <label className="block text-sm font-medium">Description<textarea className="mt-2 block min-h-20 w-full rounded-lg border border-[var(--v-border)] bg-white p-3 font-normal" value={values.description} onChange={(event) => update('description', event.target.value)} /></label>
        <div className="grid gap-4 sm:grid-cols-2"><ThemedSelect label="Status" value={values.status} options={(['planning', 'active', 'paused', 'completed', 'archived'] as const).map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} onChange={(value) => update('status', value)} /><ThemedSelect label="Priority" value={values.priority} options={(['low', 'medium', 'high', 'urgent'] as const).map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} onChange={(value) => update('priority', value)} /></div>
        <Input label="Deadline" type="date" value={values.deadline} onChange={(event) => update('deadline', event.target.value)} />
      </div></details>
      {error ? <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p> : null}
    </form>
  </Modal>;
};
