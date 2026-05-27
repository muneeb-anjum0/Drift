import { useEffect, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { cn } from '../../utils/cn';
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

type SelectOption<T extends string> = {
  label: string;
  value: T;
};

const statusOptions: Array<SelectOption<ProjectFormValues['status']>> = [
  { label: 'Planning', value: 'planning' },
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' },
  { label: 'Completed', value: 'completed' },
  { label: 'Archived', value: 'archived' },
];

const priorityOptions: Array<SelectOption<ProjectFormValues['priority']>> = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Urgent', value: 'urgent' },
];

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
  const [openSelect, setOpenSelect] = useState<'workspace' | 'status' | 'priority' | null>(null);

  useEffect(() => {
    if (open) {
      setValues({ ...defaultValues, ...initialValues });
      setError('');
    }
  }, [initialValues, open]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!values.workspaceId) {
      setError('Select a workspace before saving the project.');
      return;
    }
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
          <ThemedSelect
            className="md:col-span-2"
            label="Workspace"
            placeholder="Select workspace"
            value={values.workspaceId}
            disabled={mode === 'edit'}
            isOpen={openSelect === 'workspace'}
            onToggle={() => setOpenSelect((current) => (current === 'workspace' ? null : 'workspace'))}
            onClose={() => setOpenSelect(null)}
            onChange={(workspaceId) => setValues((current) => ({ ...current, workspaceId }))}
            options={workspaces.map((workspace) => ({ label: workspace.name, value: workspace._id }))}
          />
          <Input label="Project name" labelClassName="text-sm" className="h-10 text-sm" value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} required />
          <Input label="Client name" labelClassName="text-sm" className="h-10 text-sm" value={values.clientName} onChange={(event) => setValues((current) => ({ ...current, clientName: event.target.value }))} required />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <ThemedSelect
            label="Status"
            value={values.status}
            isOpen={openSelect === 'status'}
            onToggle={() => setOpenSelect((current) => (current === 'status' ? null : 'status'))}
            onClose={() => setOpenSelect(null)}
            onChange={(status) => setValues((current) => ({ ...current, status }))}
            options={statusOptions}
          />
          <ThemedSelect
            label="Priority"
            value={values.priority}
            isOpen={openSelect === 'priority'}
            onToggle={() => setOpenSelect((current) => (current === 'priority' ? null : 'priority'))}
            onClose={() => setOpenSelect(null)}
            onChange={(priority) => setValues((current) => ({ ...current, priority }))}
            options={priorityOptions}
          />
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

const ThemedSelect = <T extends string>({
  label,
  value,
  options,
  onChange,
  isOpen,
  onToggle,
  onClose,
  placeholder = 'Select option',
  disabled = false,
  className,
}: {
  label: string;
  value: T | '';
  options: Array<SelectOption<T>>;
  onChange: (value: T) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) => {
  const selected = options.find((option) => option.value === value);

  return (
    <div className={cn('relative space-y-1.5', className)}>
      <span className="text-sm font-semibold text-gray-300">{label}</span>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-full border border-gray-700 bg-black px-4 text-left text-sm text-white shadow-sm outline-none transition focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30',
          !selected && 'text-gray-500',
          disabled && 'cursor-not-allowed opacity-60',
          isOpen && 'border-lime-400/50 ring-2 ring-lime-400/20'
        )}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-lime-300 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && !disabled ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[120] overflow-hidden rounded-2xl border border-lime-400/25 bg-zinc-950 shadow-[0_18px_60px_rgba(0,0,0,0.75),0_0_0_1px_rgba(163,230,53,0.08)]">
          <div className="max-h-48 overflow-y-auto p-1">
            {options.map((option) => {
              const active = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    onClose();
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition',
                    active ? 'bg-lime-400 text-black' : 'text-gray-200 hover:bg-lime-400/10 hover:text-lime-200'
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {active ? <Check className="h-4 w-4 shrink-0" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};
