import { useEffect, useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import type { WorkspaceFormValues } from './workspace.types';

interface CreateWorkspaceModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: WorkspaceFormValues) => Promise<void>;
  initialValues?: WorkspaceFormValues;
  mode?: 'create' | 'edit';
  isSubmitting?: boolean;
}

const emptyValues: WorkspaceFormValues = {
  name: '',
  description: '',
};

export const CreateWorkspaceModal = ({
  open,
  onClose,
  onSubmit,
  initialValues = emptyValues,
  mode = 'create',
  isSubmitting = false,
}: CreateWorkspaceModalProps) => {
  const [values, setValues] = useState<WorkspaceFormValues>(initialValues);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setValues(initialValues);
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
      setError(submitError instanceof Error ? submitError.message : 'Unable to save workspace');
    }
  };

  return (
    <Modal
      open={open}
      title={mode === 'create' ? 'Create workspace' : 'Edit workspace'}
      description="Organize projects, clients, and activities in a dedicated workspace."
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input label="Workspace name" value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} placeholder="Acme Design Studio" required />
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Description</span>
          <textarea
            value={values.description}
            onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
            rows={4}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            placeholder="A short description of this workspace"
          />
        </label>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner /> : mode === 'create' ? 'Create workspace' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
