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
      <form className="space-y-5" onSubmit={handleSubmit}>
        <Input label="Workspace name" value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} placeholder="Acme Design Studio" required />
        <label className="block space-y-2">
          <span className="text-base font-semibold text-gray-300">Description</span>
          <textarea
            value={values.description}
            onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
            rows={4}
            className="w-full rounded-2xl border border-gray-700 bg-black px-4 py-3 text-base text-white shadow-sm outline-none transition placeholder:text-gray-500 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30"
            placeholder="A short description of this workspace"
          />
        </label>
        {error ? <p className="text-sm text-lime-300">{error}</p> : null}
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
