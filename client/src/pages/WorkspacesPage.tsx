import { Plus, BriefcaseBusiness } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { Spinner } from '../components/common/Spinner';
import { CreateWorkspaceModal } from '../features/workspaces/CreateWorkspaceModal';
import { useWorkspaces } from '../hooks/useWorkspaces';
import type { Workspace } from '../types';

export const WorkspacesPage = () => {
  const navigate = useNavigate();
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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-lime-400">Workspaces</p>
          <h2 className="mt-2 text-4xl font-bold text-white">Manage Workspaces</h2>
          <p className="mt-1 text-gray-400">Organize your clients and team projects</p>
        </div>
        <Button type="button" onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Workspace
        </Button>
      </motion.div>

      {sortedWorkspaces.length === 0 ? (
        <EmptyState
          title="No workspaces yet"
          description="Create your first workspace to organize projects and future drift analysis."
          actionLabel="Create Workspace"
          onAction={() => setIsCreateOpen(true)}
          icon={<BriefcaseBusiness className="h-5 w-5" />}
        />
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, staggerChildren: 0.05 }}
          className="grid gap-5 xl:grid-cols-2"
        >
          {sortedWorkspaces.map((workspace, i) => (
            <motion.div
              key={workspace._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="p-6 border-lime-400/20 hover:border-lime-400/50 hover:shadow-lg hover:shadow-lime-400/20">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white">{workspace.name}</h3>
                    <p className="mt-2 text-gray-400">{workspace.description || 'No description provided.'}</p>
                    <div className="mt-4 inline-block rounded-lg bg-lime-400/10 border border-lime-400/30 px-3 py-1">
                      <span className="text-xs font-semibold text-lime-400">{workspace.slug}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
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
        </motion.div>
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
