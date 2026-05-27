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
    <Modal
      open={open}
      title={mode === 'create' ? 'Create project' : 'Edit project'}
      description="Capture the original scope and delivery expectations for a client project."
      onClose={onClose}
      size="lg"
      density="compact"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block space-y-1.5 md:col-span-2">
            <span className="text-sm font-semibold text-gray-300">Workspace</span>
            <select
              value={values.workspaceId}
              onChange={(event) => setValues((current) => ({ ...current, workspaceId: event.target.value }))}
              className="h-10 w-full rounded-full border border-gray-700 bg-black px-4 text-sm text-white shadow-sm outline-none transition focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30"
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
          <Input label="Project name" labelClassName="text-sm" className="h-10 text-sm" value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} required />
          <Input label="Client name" labelClassName="text-sm" className="h-10 text-sm" value={values.clientName} onChange={(event) => setValues((current) => ({ ...current, clientName: event.target.value }))} required />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-gray-300">Status</span>
            <select
              value={values.status}
              onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as ProjectFormValues['status'] }))}
              className="h-10 w-full rounded-full border border-gray-700 bg-black px-4 text-sm text-white shadow-sm outline-none transition focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30"
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-gray-300">Priority</span>
            <select
              value={values.priority}
              onChange={(event) => setValues((current) => ({ ...current, priority: event.target.value as ProjectFormValues['priority'] }))}
              className="h-10 w-full rounded-full border border-gray-700 bg-black px-4 text-sm text-white shadow-sm outline-none transition focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-gray-300">Description</span>
            <textarea
              value={values.description}
              onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
              rows={3}
              className="w-full rounded-2xl border border-gray-700 bg-black px-4 py-2.5 text-sm text-white shadow-sm outline-none transition placeholder:text-gray-500 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30"
              placeholder="Describe the project in plain language"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-gray-300">Original scope</span>
            <textarea
              value={values.originalScope}
              onChange={(event) => setValues((current) => ({ ...current, originalScope: event.target.value }))}
              rows={3}
              className="w-full rounded-2xl border border-gray-700 bg-black px-4 py-2.5 text-sm text-white shadow-sm outline-none transition placeholder:text-gray-500 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30"
              placeholder="Summarize what was originally promised"
            />
          </label>
        </div>
        <Input label="Deadline" type="date" labelClassName="text-sm" className="h-10 text-sm" value={values.deadline} onChange={(event) => setValues((current) => ({ ...current, deadline: event.target.value }))} />
        {error ? <p className="text-sm text-lime-300">{error}</p> : null}
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
