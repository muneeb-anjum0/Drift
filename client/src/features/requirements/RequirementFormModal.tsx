import { useEffect, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { cn } from '../../utils/cn';
import type {
  RequirementFormSubmitValues,
  RequirementFormValues,
  RequirementPriority,
  RequirementSource,
  RequirementStatus,
  RequirementType,
} from './requirement.types';

interface RequirementFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: RequirementFormSubmitValues) => Promise<void>;
  initialValues?: Partial<RequirementFormValues>;
  mode?: 'create' | 'edit';
  isSubmitting?: boolean;
}

const defaultValues: RequirementFormValues = {
  title: '',
  description: '',
  type: 'functional',
  priority: 'medium',
  status: 'proposed',
  source: 'manual',
  sourceText: '',
  acceptanceCriteria: '',
  tags: '',
  estimatedEffort: '',
};

type SelectOption<T extends string> = {
  label: string;
  value: T;
};

const typeOptions: Array<SelectOption<RequirementType>> = [
  { label: 'Functional', value: 'functional' },
  { label: 'Non functional', value: 'non_functional' },
  { label: 'Business', value: 'business' },
  { label: 'Technical', value: 'technical' },
  { label: 'UI / UX', value: 'ui_ux' },
  { label: 'Security', value: 'security' },
  { label: 'Performance', value: 'performance' },
  { label: 'Integration', value: 'integration' },
  { label: 'Other', value: 'other' },
];

const priorityOptions: Array<SelectOption<RequirementPriority>> = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Critical', value: 'critical' },
];

const statusOptions: Array<SelectOption<RequirementStatus>> = [
  { label: 'Proposed', value: 'proposed' },
  { label: 'Approved', value: 'approved' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Changed', value: 'changed' },
];

const sourceOptions: Array<SelectOption<RequirementSource>> = [
  { label: 'Manual', value: 'manual' },
  { label: 'Original scope', value: 'original_scope' },
  { label: 'Client message', value: 'client_message' },
  { label: 'Meeting note', value: 'meeting_note' },
  { label: 'Document', value: 'document' },
  { label: 'AI extracted', value: 'ai_extracted' },
];

const splitList = (value: string) =>
  value
    .split(/\n|,/) 
    .map((entry) => entry.trim())
    .filter(Boolean);

export const RequirementFormModal = ({
  open,
  onClose,
  onSubmit,
  initialValues = defaultValues,
  mode = 'create',
  isSubmitting = false,
}: RequirementFormModalProps) => {
  const [values, setValues] = useState<RequirementFormValues>({ ...defaultValues, ...initialValues });
  const [error, setError] = useState('');
  const [openSelect, setOpenSelect] = useState<'type' | 'priority' | 'status' | 'source' | null>(null);

  useEffect(() => {
    if (open) {
      setValues({ ...defaultValues, ...initialValues });
      setError('');
    }
  }, [initialValues, open]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const estimatedEffort = values.estimatedEffort.trim() ? Number(values.estimatedEffort) : undefined;
    if (estimatedEffort !== undefined && Number.isNaN(estimatedEffort)) {
      setError('Estimated effort must be a number');
      return;
    }

    try {
      await onSubmit({
        title: values.title.trim(),
        description: values.description.trim(),
        type: values.type as RequirementType,
        priority: values.priority as RequirementPriority,
        status: values.status as RequirementStatus,
        source: values.source as RequirementSource,
        sourceText: values.sourceText.trim(),
        acceptanceCriteria: splitList(values.acceptanceCriteria),
        tags: splitList(values.tags),
        estimatedEffort,
      });
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save requirement');
    }
  };

  return (
    <Modal
      open={open}
      title={mode === 'create' ? 'Create requirement' : 'Edit requirement'}
      description="Capture the structured requirement before you create a baseline."
      onClose={onClose}
      size="lg"
      density="compact"
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="requirement-form" disabled={isSubmitting}>
            {isSubmitting ? <Spinner /> : mode === 'create' ? 'Create requirement' : 'Save changes'}
          </Button>
        </div>
      }
    >
      <form id="requirement-form" className="space-y-3" onSubmit={handleSubmit}>
        <Input
          label="Title"
          labelClassName="text-sm"
          className="h-10 text-sm"
          value={values.title}
          onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
          placeholder="User can reset password"
          required
        />

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-gray-300">Description</span>
          <textarea
            value={values.description}
            onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
            rows={2}
            className="w-full rounded-[1rem] border border-gray-700 bg-black px-3 py-2 text-sm text-white shadow-sm outline-none transition placeholder:text-gray-500 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30"
            placeholder="Describe the requirement in clear, plain language"
            required
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <ThemedSelect
            label="Type"
            value={values.type}
            isOpen={openSelect === 'type'}
            onToggle={() => setOpenSelect((current) => (current === 'type' ? null : 'type'))}
            onClose={() => setOpenSelect(null)}
            onChange={(type) => setValues((current) => ({ ...current, type }))}
            options={typeOptions}
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
            label="Source"
            value={values.source}
            isOpen={openSelect === 'source'}
            onToggle={() => setOpenSelect((current) => (current === 'source' ? null : 'source'))}
            onClose={() => setOpenSelect(null)}
            onChange={(source) => setValues((current) => ({ ...current, source }))}
            options={sourceOptions}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-gray-300">Source text</span>
            <textarea
              value={values.sourceText}
              onChange={(event) => setValues((current) => ({ ...current, sourceText: event.target.value }))}
              rows={2}
              className="w-full rounded-[1rem] border border-gray-700 bg-black px-3 py-2 text-sm text-white shadow-sm outline-none transition placeholder:text-gray-500 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30"
              placeholder="Exact source text this requirement was derived from"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-gray-300">Acceptance criteria</span>
            <textarea
              value={values.acceptanceCriteria}
              onChange={(event) => setValues((current) => ({ ...current, acceptanceCriteria: event.target.value }))}
              rows={2}
              className="w-full rounded-[1rem] border border-gray-700 bg-black px-3 py-2 text-sm text-white shadow-sm outline-none transition placeholder:text-gray-500 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30"
              placeholder="One item per line"
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-gray-300">Tags</span>
            <textarea
              value={values.tags}
              onChange={(event) => setValues((current) => ({ ...current, tags: event.target.value }))}
              rows={2}
              className="w-full rounded-[1rem] border border-gray-700 bg-black px-3 py-2 text-sm text-white shadow-sm outline-none transition placeholder:text-gray-500 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30"
              placeholder="Comma-separated tags"
            />
          </label>

          <Input
            label="Estimated effort"
            labelClassName="text-sm"
            className="h-10 text-sm"
            type="number"
            min="0"
            value={values.estimatedEffort}
            onChange={(event) => setValues((current) => ({ ...current, estimatedEffort: event.target.value }))}
            placeholder="4"
          />
        </div>

        {error ? <p className="text-sm text-lime-300">{error}</p> : null}
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
}: {
  label: string;
  value: T;
  options: Array<SelectOption<T>>;
  onChange: (value: T) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}) => {
  const selected = options.find((option) => option.value === value);

  return (
    <div className="relative space-y-1.5">
      <span className="text-sm font-semibold text-gray-300">{label}</span>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-full border border-gray-700 bg-black px-4 text-left text-sm text-white shadow-sm outline-none transition focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30',
          isOpen && 'border-lime-400/50 ring-2 ring-lime-400/20'
        )}
      >
        <span className="truncate">{selected?.label ?? 'Select option'}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-lime-300 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen ? (
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
