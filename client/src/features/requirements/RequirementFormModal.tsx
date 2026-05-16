import { useEffect, useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
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

const selectClass =
  'h-11 w-full rounded-2xl border border-gray-700 bg-black px-4 text-sm text-white shadow-sm outline-none transition focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30';

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
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="Title"
          value={values.title}
          onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
          placeholder="User can reset password"
          required
        />

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-gray-300">Description</span>
          <textarea
            value={values.description}
            onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
            rows={4}
            className="w-full rounded-2xl border border-gray-700 bg-black px-4 py-3 text-sm text-white shadow-sm outline-none transition placeholder:text-gray-500 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30"
            placeholder="Describe the requirement in clear, plain language"
            required
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-gray-300">Type</span>
            <select value={values.type} onChange={(event) => setValues((current) => ({ ...current, type: event.target.value as RequirementType }))} className={selectClass}>
              <option value="functional">Functional</option>
              <option value="non_functional">Non functional</option>
              <option value="business">Business</option>
              <option value="technical">Technical</option>
              <option value="ui_ux">UI / UX</option>
              <option value="security">Security</option>
              <option value="performance">Performance</option>
              <option value="integration">Integration</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-gray-300">Priority</span>
            <select value={values.priority} onChange={(event) => setValues((current) => ({ ...current, priority: event.target.value as RequirementPriority }))} className={selectClass}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-gray-300">Status</span>
            <select value={values.status} onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as RequirementStatus }))} className={selectClass}>
              <option value="proposed">Proposed</option>
              <option value="approved">Approved</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="changed">Changed</option>
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-gray-300">Source</span>
            <select value={values.source} onChange={(event) => setValues((current) => ({ ...current, source: event.target.value as RequirementSource }))} className={selectClass}>
              <option value="manual">Manual</option>
              <option value="original_scope">Original scope</option>
              <option value="client_message">Client message</option>
              <option value="meeting_note">Meeting note</option>
              <option value="document">Document</option>
              <option value="ai_extracted">AI extracted</option>
            </select>
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-gray-300">Source text</span>
          <textarea
            value={values.sourceText}
            onChange={(event) => setValues((current) => ({ ...current, sourceText: event.target.value }))}
            rows={4}
            className="w-full rounded-2xl border border-gray-700 bg-black px-4 py-3 text-sm text-white shadow-sm outline-none transition placeholder:text-gray-500 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30"
            placeholder="Exact source text this requirement was derived from"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-gray-300">Acceptance criteria</span>
          <textarea
            value={values.acceptanceCriteria}
            onChange={(event) => setValues((current) => ({ ...current, acceptanceCriteria: event.target.value }))}
            rows={4}
            className="w-full rounded-2xl border border-gray-700 bg-black px-4 py-3 text-sm text-white shadow-sm outline-none transition placeholder:text-gray-500 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30"
            placeholder="One item per line"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-gray-300">Tags</span>
          <textarea
            value={values.tags}
            onChange={(event) => setValues((current) => ({ ...current, tags: event.target.value }))}
            rows={3}
            className="w-full rounded-2xl border border-gray-700 bg-black px-4 py-3 text-sm text-white shadow-sm outline-none transition placeholder:text-gray-500 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30"
            placeholder="Comma-separated tags"
          />
        </label>

        <Input
          label="Estimated effort"
          type="number"
          min="0"
          value={values.estimatedEffort}
          onChange={(event) => setValues((current) => ({ ...current, estimatedEffort: event.target.value }))}
          placeholder="4"
        />

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner /> : mode === 'create' ? 'Create requirement' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
