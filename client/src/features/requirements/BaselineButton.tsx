import { useState } from 'react';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import type { Requirement, RequirementVersion } from './requirement.types';

export const BaselineButton = ({ requirements, isLoading = false, canCreate, onCreateBaseline, onCompare }: {
  requirements: Requirement[];
  isLoading?: boolean;
  canCreate: boolean;
  onCreateBaseline: () => Promise<RequirementVersion>;
  onCompare: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<number | null>(null);
  const [error, setError] = useState('');
  const uncertain = requirements.filter((item) => item.status === 'proposed' || item.status === 'rejected');
  const create = async () => {
    setError('');
    try {
      const version = await onCreateBaseline();
      setCreated(version.versionNumber);
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The snapshot could not be created.');
    }
  };

  return <section className="v-panel p-5" aria-labelledby="scope-snapshot-title">
    <p className="v-kicker">Comparison point</p>
    <h3 id="scope-snapshot-title" className="v-section-title mt-1">Scope snapshot</h3>
    <p className="v-muted mt-2 text-sm leading-6">Save the current requirements as a fixed point for comparing future client requests. This does not approve or change any requirement's status.</p>
    <p className="mt-3 text-sm font-medium">{requirements.length} {requirements.length === 1 ? 'requirement' : 'requirements'} will be included.</p>
    {canCreate ? <Button type="button" className="mt-4" disabled={!requirements.length || isLoading} onClick={() => setOpen(true)}>Create scope snapshot</Button> : <p className="v-muted mt-3 text-sm">Only a workspace owner or admin can create a snapshot.</p>}
    {created !== null ? <div role="status" className="mt-4 rounded-lg bg-[var(--v-accent-soft)] p-4 text-sm"><strong>Scope snapshot #{created} created.</strong> The next step is to compare a new client change. <button className="v-link ml-1" onClick={onCompare}>Compare a change</button></div> : null}
    <Modal open={open} title="Create scope snapshot?" description="This saves an immutable copy of every current requirement. Later edits will not change this snapshot." onClose={() => setOpen(false)} size="md" footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={isLoading} onClick={() => void create()}>{isLoading ? 'Creating…' : 'Create scope snapshot'}</Button></div>}>
      <p className="text-sm"><strong>{requirements.length}</strong> requirements will be captured at the time you create it.</p>
      {uncertain.length ? <p className="mt-3 rounded-lg border border-[var(--color-warning)] p-3 text-sm text-[var(--color-warning)]" role="note">{uncertain.length} {uncertain.length === 1 ? 'requirement is' : 'requirements are'} marked proposed or rejected. The snapshot includes them anyway; it is not a formal approval.</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm text-[var(--color-danger)]">{error}</p> : null}
    </Modal>
  </section>;
};
