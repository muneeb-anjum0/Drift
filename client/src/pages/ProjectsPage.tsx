import { FolderKanban, Plus, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { Spinner } from '../components/common/Spinner';
import { ThemedSelect } from '../components/common/ThemedSelect';
import { WorkspaceSwitcher } from '../features/workspaces/WorkspaceSwitcher';
import { ProjectForm } from '../features/projects/ProjectForm';
import { ProjectList } from '../features/projects/ProjectList';
import { useWorkspaces } from '../hooks/useWorkspaces';
import { useProjects } from '../hooks/useProjects';
import type { Project } from '../types';

const statusOptions: Array<'all' | Project['status']> = ['all', 'planning', 'active', 'paused', 'completed', 'archived'];

const normalizeDeadlineInput = (deadline: unknown) => {
  if (!deadline) return '';
  if (typeof deadline === 'string') return deadline.slice(0, 10);
  if (deadline instanceof Date) return deadline.toISOString().slice(0, 10);

  if (typeof deadline === 'object' && deadline !== null) {
    if ('toDate' in deadline && typeof (deadline as { toDate?: () => Date }).toDate === 'function') {
      return (deadline as { toDate: () => Date }).toDate().toISOString().slice(0, 10);
    }

    const parsed = new Date(String(deadline));
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }

  const fallback = new Date(String(deadline));
  return Number.isNaN(fallback.getTime()) ? '' : fallback.toISOString().slice(0, 10);
};

export const ProjectsPage = () => {
  const navigate = useNavigate();
  const { workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const { projects, createProject, updateProject, deleteProject, isCreating, isUpdating } = useProjects();
  const [statusFilter, setStatusFilter] = useState<typeof statusOptions[number]>('all');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const visibleProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      const matchesWorkspace = !selectedWorkspaceId || (typeof project.workspace !== 'string' && project.workspace._id === selectedWorkspaceId);
      return matchesStatus && matchesWorkspace;
    });
  }, [projects, selectedWorkspaceId, statusFilter]);

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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-7">
      <section className="flex flex-wrap items-end justify-between gap-5 rounded-[2.25rem] border border-lime-400/20 bg-black/75 p-6 shadow-[0_24px_90px_rgba(163,230,53,0.06)] sm:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-lime-400">Projects</p>
          <h2 className="mt-3 text-4xl font-semibold text-white">Scope-controlled delivery</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">Create client projects, preserve original scope, and move into requirements and AI drift analysis.</p>
        </div>
        <Button type="button" onClick={() => setIsCreateOpen(true)} disabled={workspaces.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </section>

      <Card className="relative z-30 rounded-[2rem] border-white/10 bg-black/65 p-5">
        <div className="mb-4 flex items-center gap-2 text-lime-400">
          <SlidersHorizontal className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em]">Filters</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]">
          <WorkspaceSwitcher workspaces={workspaces} selectedWorkspaceId={selectedWorkspaceId} onChange={setSelectedWorkspaceId} />
          <ThemedSelect
            label="Status"
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as typeof statusFilter)}
            options={statusOptions.map((status) => ({
              label: status === 'all' ? 'All statuses' : status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
              value: status,
            }))}
            placeholder="All statuses"
          />
          <div className="flex items-end">
            <Button type="button" variant="secondary" onClick={() => setStatusFilter('all')} className="w-full xl:w-auto">
              Reset
            </Button>
          </div>
        </div>
      </Card>

      {workspaces.length === 0 ? (
        <EmptyState
          title="Create a workspace first"
          description="Projects need a workspace so you can keep client work separated and organized."
          actionLabel="Go to Workspaces"
          onAction={() => navigate('/workspaces')}
          icon={<FolderKanban className="h-5 w-5" />}
        />
      ) : visibleProjects.length === 0 ? (
        <EmptyState
          title="No projects found"
          description="Create a new project or change the filters to see existing work."
          actionLabel="Create Project"
          onAction={() => setIsCreateOpen(true)}
          icon={<FolderKanban className="h-5 w-5" />}
        />
      ) : (
        <ProjectList
          projects={visibleProjects}
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
                deadline: normalizeDeadlineInput(editingProject.deadline),
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
