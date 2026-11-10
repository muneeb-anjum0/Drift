import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { Spinner } from '../components/common/Spinner';
import { ThemedSelect } from '../components/common/ThemedSelect';
import { WorkspaceSwitcher } from '../features/workspaces/WorkspaceSwitcher';
import { ProjectForm } from '../features/projects/ProjectForm';
import { ProjectList } from '../features/projects/ProjectList';
import { useWorkspaces } from '../hooks/useWorkspaces';
import { useProjects } from '../hooks/useProjects';
import { canWrite, roleForProject } from '../utils/permissions';
import type { Project } from '../types';

const normalizeDeadline = (value: unknown) => value ? new Date(String(value)).toISOString().slice(0, 10) : '';

export const ProjectsPage = () => {
  const [searchParams] = useSearchParams();
  const workspacesQuery = useWorkspaces();
  const projectsQuery = useProjects();
  const [status, setStatus] = useState('all');
  const [workspaceId, setWorkspaceId] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Project | null>(null);
  const [creating, setCreating] = useState(searchParams.get('new') === '1');
  const writableWorkspaces = workspacesQuery.workspaces.filter((workspace) => canWrite(workspace.role));
  const projects = useMemo(() => projectsQuery.projects.filter((project) => {
    const projectWorkspace = typeof project.workspace === 'string' ? project.workspace : project.workspace._id;
    return (status === 'all' || project.status === status) && (!workspaceId || projectWorkspace === workspaceId) && `${project.name} ${project.clientName}`.toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [projectsQuery.projects, status, workspaceId, search]);

  if (workspacesQuery.isError || projectsQuery.isError) return <section role="alert" className="v-panel p-6"><h1 className="v-section-title">Projects couldn't be loaded</h1><p className="v-muted mt-2">This is a connection problem, not an empty project list.</p><Button className="mt-4" onClick={() => { void workspacesQuery.refetch(); void projectsQuery.refetch(); }}>Retry</Button></section>;
  if (workspacesQuery.isPending || projectsQuery.isPending) return <div className="flex items-center gap-3" role="status"><Spinner /> Loading projects…</div>;

  const handleDelete = async (project: Project) => {
    if (window.confirm(`Delete ${project.name} and its project data?`)) await projectsQuery.deleteProject(project._id);
  };

  return <div className="space-y-7">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="v-kicker">Projects</p><h1 className="v-page-title mt-1">Your client work</h1><p className="v-muted mt-2">Keep the agreement and later changes together in each project.</p></div>{writableWorkspaces.length ? <Button onClick={() => setCreating(true)}>Create project</Button> : null}</header>
    {projectsQuery.projects.length ? <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_180px]">
      <label className="block text-sm font-medium">Search projects<input className="mt-1 block h-11 w-full rounded-lg border border-[var(--v-border)] bg-white px-3 font-normal" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Project or client name" /></label>
      <WorkspaceSwitcher workspaces={workspacesQuery.workspaces} selectedWorkspaceId={workspaceId} onChange={setWorkspaceId} />
      <ThemedSelect label="Status" value={status} onChange={setStatus} options={['all', 'planning', 'active', 'paused', 'completed', 'archived'].map((value) => ({ value, label: value === 'all' ? 'All statuses' : value[0].toUpperCase() + value.slice(1) }))} />
    </div> : null}
    {!workspacesQuery.workspaces.length ? <EmptyState title="No workspace yet" description="Create a workspace before starting a client project." /> : !projectsQuery.projects.length ? <div className="v-panel p-8"><h2 className="v-section-title">No projects yet</h2><p className="v-muted mt-2">A project holds the agreed scope and the changes that follow.</p>{writableWorkspaces.length ? <Button className="mt-4" onClick={() => setCreating(true)}>Create project</Button> : null}</div> : !projects.length ? <div className="v-panel p-6"><h2 className="v-section-title">No matching projects</h2><p className="v-muted mt-2">Try a different search or filter.</p><Button variant="secondary" className="mt-4" onClick={() => { setStatus('all'); setWorkspaceId(''); setSearch(''); }}>Clear filters</Button></div> : <ProjectList projects={projects} canEdit={(project) => canWrite(roleForProject(project, workspacesQuery.workspaces))} onEdit={setEditing} onDelete={(project) => void handleDelete(project)} />}
    <ProjectForm open={creating} onClose={() => setCreating(false)} workspaces={writableWorkspaces} mode="create" isSubmitting={projectsQuery.isCreating} initialValues={{ workspaceId: writableWorkspaces[0]?._id }} onSubmit={async (values) => { await projectsQuery.createProject(values); }} />
    <ProjectForm open={Boolean(editing)} onClose={() => setEditing(null)} workspaces={writableWorkspaces} mode="edit" isSubmitting={projectsQuery.isUpdating} initialValues={editing ? { workspaceId: typeof editing.workspace === 'string' ? editing.workspace : editing.workspace._id, name: editing.name, clientName: editing.clientName, description: editing.description, status: editing.status, priority: editing.priority, originalScope: editing.originalScope, deadline: normalizeDeadline(editing.deadline) } : undefined} onSubmit={async (values) => { if (!editing) return; const { workspaceId: _workspaceId, ...payload } = values; await projectsQuery.updateProject({ projectId: editing._id, payload }); }} />
  </div>;
};
