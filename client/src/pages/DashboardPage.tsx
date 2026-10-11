import { useMemo } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { requirementApi } from '../api/requirement.api';
import { driftApi } from '../api/drift.api';
import { changeRequestApi } from '../api/changeRequest.api';
import { useWorkspaces } from '../hooks/useWorkspaces';
import { useProjects } from '../hooks/useProjects';
import { useActivities } from '../hooks/useActivities';
import { useAuth } from '../hooks/useAuth';
import { canApprove, canWrite, roleForProject } from '../utils/permissions';
import { nextProjectAction, type ProjectSummary } from '../features/dashboard/attention';
import { formatDate } from '../utils/formatDate';

const activityText = (action: string) => {
  const labels: Record<string, string> = {
    REQUIREMENT_BASELINE_CREATED: 'Scope snapshot created',
    DRIFT_ANALYSIS_CREATED: 'Client change compared',
    CHANGE_REQUEST_CREATED: 'Change request drafted',
    CHANGE_REQUEST_APPROVAL_UPDATED: 'Decision updated',
    PROJECT_CREATED: 'Project created',
  };
  return labels[action] ?? action.toLowerCase().replace(/_/g, ' ');
};

export const DashboardPage = () => {
  const { user } = useAuth();
  const workspacesQuery = useWorkspaces();
  const projectsQuery = useProjects();
  const activitiesQuery = useActivities();
  const queryClient = useQueryClient();
  const visibleProjects = useMemo(() => [...projectsQuery.projects]
    .filter((project) => project.status !== 'archived')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6), [projectsQuery.projects]);
  const requirementQueries = useQueries({ queries: visibleProjects.map((project) => ({ queryKey: ['project-requirements', project._id], queryFn: () => requirementApi.getProjectRequirements(project._id) })) });
  const versionQueries = useQueries({ queries: visibleProjects.map((project) => ({ queryKey: ['requirement-versions', project._id], queryFn: () => requirementApi.getRequirementVersions(project._id) })) });
  const analysisQueries = useQueries({ queries: visibleProjects.map((project) => ({ queryKey: ['project-drift-analyses', project._id], queryFn: () => driftApi.getProjectDriftAnalyses(project._id) })) });
  const requestQueries = useQueries({ queries: visibleProjects.map((project) => ({ queryKey: ['project-change-requests', project._id], queryFn: () => changeRequestApi.getProjectChangeRequests(project._id) })) });
  const summaries = visibleProjects.map((project, index) => {
    const queries = [requirementQueries[index], versionQueries[index], analysisQueries[index], requestQueries[index]];
    if (queries.some((query) => query.isError)) return { project, state: 'error' as const };
    if (queries.some((query) => query.isPending)) return { project, state: 'loading' as const };
    return {
      project,
      state: 'ready' as const,
      data: {
        project,
        requirements: requirementQueries[index].data ?? [],
        versions: versionQueries[index].data ?? [],
        analyses: analysisQueries[index].data ?? [],
        requests: requestQueries[index].data ?? [],
      } satisfies ProjectSummary,
    };
  });
  const firstReady = summaries[0];
  const currentRole = firstReady ? roleForProject(firstReady.project, workspacesQuery.workspaces) : undefined;
  const next = firstReady?.state === 'ready' ? nextProjectAction(firstReady.data, canWrite(currentRole), canApprove(currentRole)) : null;
  const retry = () => void queryClient.invalidateQueries();

  if (workspacesQuery.isError || projectsQuery.isError) {
    return <section className="v-panel p-6" role="alert"><h1 className="v-section-title">Your work couldn't be loaded</h1><p className="v-muted mt-2">Check that the local API and database are running, then try again.</p><Button className="mt-4" onClick={retry}>Retry</Button></section>;
  }

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="v-kicker">Home</p>
        <h1 className="v-page-title">Good to see you{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.</h1>
        <p className="v-muted">Pick up where your project's scope or decision needs attention.</p>
      </header>

      {projectsQuery.isPending || workspacesQuery.isPending ? (
        <div className="v-hero p-8" role="status"><Spinner /> <span className="ml-2">Finding your next step…</span></div>
      ) : projectsQuery.projects.length === 0 ? (
        <section className="v-hero p-6 sm:p-9">
          <p className="v-kicker">Your next step</p>
          <h2 className="v-section-title mt-3">Create your first project</h2>
          <p className="v-muted mt-2 max-w-xl">Start with the client and what was agreed. You can add the detailed scope next.</p>
          <Link to="/projects?new=1" className="mt-5 inline-block"><Button>Create a project</Button></Link>
        </section>
      ) : firstReady?.state === 'error' ? (
        <section className="v-panel p-6" role="alert"><h2 className="v-section-title">Project details couldn't be loaded</h2><p className="v-muted mt-2">No next step is shown until the data is available.</p><Button className="mt-4" onClick={retry}>Retry</Button></section>
      ) : firstReady?.state === 'loading' ? (
        <div className="v-hero p-8" role="status"><Spinner /> <span className="ml-2">Checking the latest project state…</span></div>
      ) : next ? (
        <section className="v-hero p-6 sm:p-9">
          <p className="v-kicker">Your next step · {firstReady?.project.name}</p>
          <h2 className="v-section-title mt-3">{next.title}</h2>
          <p className="v-muted mt-2 max-w-2xl">{next.detail}</p>
          <Link to={next.to} className="mt-5 inline-block"><Button>{next.label}</Button></Link>
        </section>
      ) : null}

      <section aria-labelledby="active-projects-title">
        <div className="mb-4 flex items-end justify-between gap-3"><div><h2 id="active-projects-title" className="v-section-title">Active projects</h2><p className="v-muted mt-1 text-sm">The agreement, latest change and decision state at a glance.</p></div><Link className="v-link text-sm" to="/projects">All projects</Link></div>
        {summaries.length === 0 ? <p className="v-muted">Projects will appear here after you create one.</p> : (
          <div className="v-panel divide-y divide-[var(--v-border)]">
            {summaries.map(({ project, state, ...entry }) => {
              const data = 'data' in entry ? entry.data : undefined;
              if (state !== 'ready' || !data) return <div key={project._id} className="p-5"><Link className="font-semibold" to={`/projects/${project._id}`}>{project.name}</Link><p className="v-muted mt-1 text-sm">{state === 'error' ? 'State unavailable — retry to load it.' : 'Loading project state…'}</p></div>;
              const role = roleForProject(project, workspacesQuery.workspaces);
              const action = nextProjectAction(data, canWrite(role), canApprove(role));
              const pending = data.requests.some((request) => request.approvalStatus === 'pending_approval');
              const latest = data.analyses[0];
              return <div key={project._id} className="grid gap-3 p-5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center">
                <div><Link className="font-semibold hover:underline" to={`/projects/${project._id}`}>{project.name}</Link><p className="v-muted mt-1 text-sm">{project.clientName} · {data.versions[0] ? `Scope snapshot #${data.versions[0].versionNumber}` : 'No scope snapshot yet'}</p></div>
                <div><p className="text-sm">{pending ? 'Decision pending' : latest?.detectedChanges.length ? 'Proposed change to review' : 'No open change shown'}</p><p className="v-muted mt-1 text-xs">Updated {formatDate(project.updatedAt)}</p></div>
                <Link className="v-link text-sm" to={action.to}>{action.label}</Link>
              </div>;
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="activity-title" className="max-w-3xl">
        <h2 id="activity-title" className="v-section-title">Recent activity</h2>
        {activitiesQuery.isError ? <p role="alert" className="v-muted mt-3">Activity couldn't be loaded. Your projects are still available.</p> : activitiesQuery.isPending ? <p className="v-muted mt-3">Loading activity…</p> : activitiesQuery.activities.length === 0 ? <p className="v-muted mt-3">Meaningful updates will appear here as work progresses.</p> : (
          <ul className="mt-3 divide-y divide-[var(--v-border)] border-t border-[var(--v-border)]">
            {activitiesQuery.activities.slice(0, 4).map((activity) => <li key={activity._id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{activityText(activity.action)}</span><time className="v-muted" dateTime={activity.createdAt}>{formatDate(activity.createdAt)}</time></li>)}
          </ul>
        )}
      </section>
    </div>
  );
};
