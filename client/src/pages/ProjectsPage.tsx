import { Plus, FolderKanban } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { Spinner } from '../components/common/Spinner';
import { WorkspaceSwitcher } from '../features/workspaces/WorkspaceSwitcher';
import { ProjectForm } from '../features/projects/ProjectForm';
import { ProjectList } from '../features/projects/ProjectList';
import { useWorkspaces } from '../hooks/useWorkspaces';
import { useProjects } from '../hooks/useProjects';
import type { Project } from '../types';

const statusOptions: Array<'all' | Project['status']> = ['all', 'planning', 'active', 'paused', 'completed', 'archived'];

export const ProjectsPage = () => {
  const navigate = useNavigate();
  const { workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const { projects, createProject, updateProject, deleteProject, isCreating, isUpdating } = useProjects();
  const [statusFilter, setStatusFilter] = useState<typeof statusOptions[number]>('all');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      return matchesStatus;
    });
  }, [projects, statusFilter]);

  const handleDelete = async (project: Project) => {
    if (!window.confirm(`Delete ${project.name}?`)) return;
    await deleteProject(project._id);
  };

  if (workspacesLoading) {
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
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-lime-400">Projects</p>
          <h2 className="mt-2 text-4xl font-bold text-white">Track Projects</h2>
          <p className="mt-1 text-gray-400">Monitor delivery scope per client project</p>
        </div>
        <Button type="button" onClick={() => setIsCreateOpen(true)} disabled={workspaces.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Create Project
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="p-6 border-lime-400/20">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <WorkspaceSwitcher workspaces={workspaces} selectedWorkspaceId={selectedWorkspaceId} onChange={setSelectedWorkspaceId} />
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-gray-300">Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                className="h-11 w-full rounded-2xl border border-gray-700 bg-black px-4 text-sm text-white shadow-sm outline-none focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30"
              >
                <option value="all">All statuses</option>
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <div className="flex items-end">
              <Button type="button" variant="secondary" onClick={() => setStatusFilter('all')} className="w-full">
                Reset Filters
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {workspaces.length === 0 ? (
        <EmptyState
          title="Create a workspace first"
          description="Projects need a workspace so you can keep client work separated and organized."
          actionLabel="Go to Workspaces"
          onAction={() => navigate('/workspaces')}
          icon={<FolderKanban className="h-5 w-5" />}
        />
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          title="No projects found"
          description="Create a new project or change the filters to see existing work."
          actionLabel="Create Project"
          onAction={() => setIsCreateOpen(true)}
          icon={<FolderKanban className="h-5 w-5" />}
        />
      ) : (
        <ProjectList
          projects={filteredProjects.filter((project) => {
            if (!selectedWorkspaceId) return true;
            return typeof project.workspace !== 'string' && project.workspace._id === selectedWorkspaceId;
          })}
          onEdit={(project) => setEditingProject(project)}
          onDelete={handleDelete}
          onOpen={(project) => navigate(`/projects/${project._id}`)}
        />
      )}

      <ProjectForm
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        workspaces={workspaces}
        mode="create"
        isSubmitting={isCreating}
        initialValues={{ workspaceId: selectedWorkspaceId }}
        onSubmit={async (values) => {
          await createProject(values);
        }}
      />

      <ProjectForm
        open={Boolean(editingProject)}
        onClose={() => setEditingProject(null)}
        workspaces={workspaces}
        mode="edit"
        isSubmitting={isUpdating}
        initialValues={
          editingProject
            ? {
                workspaceId: typeof editingProject.workspace === 'string' ? editingProject.workspace : editingProject.workspace._id,
                name: editingProject.name,
                clientName: editingProject.clientName,
                description: editingProject.description,
                status: editingProject.status,
                priority: editingProject.priority,
                originalScope: editingProject.originalScope,
                deadline: editingProject.deadline ? editingProject.deadline.slice(0, 10) : '',
              }
            : undefined
        }
        onSubmit={async (values) => {
          if (!editingProject) return;
          const { workspaceId, ...payload } = values;
          await updateProject({ projectId: editingProject._id, payload });
        }}
      />
    </motion.div>
  );
};
