import { useEffect, useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import type { Project } from '../../types';
import type { ProjectFormValues } from './project.types';
import type { Workspace } from '../../types';

interface ProjectFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: ProjectFormValues) => Promise<void>;
  workspaces: Workspace[];
  initialValues?: Partial<ProjectFormValues>;
  mode?: 'create' | 'edit';
  isSubmitting?: boolean;
}

const defaultValues: ProjectFormValues = {
  workspaceId: '',
  name: '',
  clientName: '',
  description: '',
  status: 'planning',
  priority: 'medium',
  originalScope: '',
  deadline: '',
};

export const ProjectForm = ({
  open,
  onClose,
  onSubmit,
  workspaces,
  initialValues = defaultValues,
  mode = 'create',
  isSubmitting = false,
}: ProjectFormProps) => {
  const [values, setValues] = useState<ProjectFormValues>({ ...defaultValues, ...initialValues });
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setValues({ ...defaultValues, ...initialValues });
      setError('');
    }
  }, [initialValues, open]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    try {
      await onSubmit(values);
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save project');
    }
  };

  return (
    <Modal open={open} title={mode === 'create' ? 'Create project' : 'Edit project'} description="Capture the original scope and delivery expectations for a client project." onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Workspace</span>
            <select
              value={values.workspaceId}
              onChange={(event) => setValues((current) => ({ ...current, workspaceId: event.target.value }))}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              disabled={mode === 'edit'}
              required
            >
              <option value="">Select workspace</option>
              {workspaces.map((workspace) => (
                <option key={workspace._id} value={workspace._id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </label>
          <Input label="Project name" value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} required />
          <Input label="Client name" value={values.clientName} onChange={(event) => setValues((current) => ({ ...current, clientName: event.target.value }))} required />
        </div>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Description</span>
          <textarea
            value={values.description}
            onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
            rows={4}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            placeholder="Describe the project in plain language"
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Status</span>
            <select
              value={values.status}
              onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as ProjectFormValues['status'] }))}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Priority</span>
            <select
              value={values.priority}
              onChange={(event) => setValues((current) => ({ ...current, priority: event.target.value as ProjectFormValues['priority'] }))}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
        </div>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Original scope</span>
          <textarea
            value={values.originalScope}
            onChange={(event) => setValues((current) => ({ ...current, originalScope: event.target.value }))}
            rows={4}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            placeholder="Summarize what was originally promised"
          />
        </label>
        <Input label="Deadline" type="date" value={values.deadline} onChange={(event) => setValues((current) => ({ ...current, deadline: event.target.value }))} />
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || workspaces.length === 0}>
            {isSubmitting ? <Spinner /> : mode === 'create' ? 'Create project' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
