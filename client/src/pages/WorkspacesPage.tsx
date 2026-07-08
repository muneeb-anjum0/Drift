import { BriefcaseBusiness, Plus, Settings2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { Spinner } from '../components/common/Spinner';
import { CreateWorkspaceModal } from '../features/workspaces/CreateWorkspaceModal';
import { useWorkspaces } from '../hooks/useWorkspaces';
import type { Workspace } from '../types';

export const WorkspacesPage = () => {
  const { workspaces, isLoading, createWorkspace, updateWorkspace, deleteWorkspace, isCreating, isUpdating } = useWorkspaces();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);

  const sortedWorkspaces = useMemo(() => [...workspaces].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [workspaces]);

  const handleDelete = async (workspaceId: string) => {
    if (!window.confirm('Delete this workspace? This will remove its memberships and activity history.')) return;
    await deleteWorkspace(workspaceId);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-4 rounded-[1.5rem] border border-lime-400/20 bg-black/75 p-5 shadow-[0_18px_70px_rgba(163,230,53,0.05)]">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-lime-400">Workspaces</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">Client operating rooms</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">Keep each client, team, and delivery stream separated before projects start drifting.</p>
        </div>
        <Button type="button" size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Workspace
        </Button>
      </section>

      {sortedWorkspaces.length === 0 ? (
        <EmptyState
          title="No workspaces yet"
          description="Create your first workspace to organize projects and future drift analysis."
          actionLabel="Create Workspace"
          onAction={() => setIsCreateOpen(true)}
          icon={<BriefcaseBusiness className="h-5 w-5" />}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sortedWorkspaces.map((workspace, index) => (
            <motion.div
              key={workspace._id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, type: 'spring', stiffness: 260, damping: 24 }}
              whileHover={{ y: -3, scale: 1.005 }}
              className="min-w-0"
            >
              <Card className="h-full rounded-[1.35rem] border-white/10 bg-black/65 p-4 hover:border-lime-400/35">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-lime-400/25 bg-lime-400/10">
                      <BriefcaseBusiness className="h-4 w-4 text-lime-300" />
                    </div>
                    <h3 className="mt-3 truncate text-lg font-semibold text-white">{workspace.name}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-5 text-gray-400">{workspace.description || 'No description provided.'}</p>
                    <div className="mt-3 inline-flex max-w-full rounded-full border border-lime-400/20 bg-lime-400/10 px-2.5 py-1">
                      <span className="text-xs font-semibold text-lime-300">{workspace.slug}</span>
                    </div>
                  </div>
                  <Settings2 className="h-4 w-4 shrink-0 text-lime-400" />
                </div>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setEditingWorkspace(workspace)}>
                    Edit
                  </Button>
                  <Button type="button" variant="danger" size="sm" onClick={() => void handleDelete(workspace._id)}>
                    Delete
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <CreateWorkspaceModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        mode="create"
        isSubmitting={isCreating}
        onSubmit={async (values) => {
          await createWorkspace(values);
        }}
      />

      <CreateWorkspaceModal
        open={Boolean(editingWorkspace)}
        onClose={() => setEditingWorkspace(null)}
        mode="edit"
        isSubmitting={isUpdating}
        initialValues={editingWorkspace ? { name: editingWorkspace.name, description: editingWorkspace.description } : undefined}
        onSubmit={async (values) => {
          if (!editingWorkspace) return;
          await updateWorkspace({ workspaceId: editingWorkspace._id, payload: values });
        }}
      />
    </motion.div>
  );
};
