import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Clock3, FolderKanban, Layers3, Sparkles, User2 } from 'lucide-react';
import { projectApi } from '../api/project.api';
import { Card } from '../components/common/Card';
import { Spinner } from '../components/common/Spinner';
import { Button } from '../components/common/Button';
import { formatDate } from '../utils/formatDate';

const detailItems = [
  { label: 'Client name', valueKey: 'clientName' as const, icon: User2 },
  { label: 'Workspace', valueKey: 'workspace' as const, icon: FolderKanban },
  { label: 'Status', valueKey: 'status' as const, icon: Sparkles },
  { label: 'Priority', valueKey: 'priority' as const, icon: Clock3 },
  { label: 'Deadline', valueKey: 'deadline' as const, icon: CalendarDays },
  { label: 'Created by', valueKey: 'createdBy' as const, icon: User2 },
];

export const ProjectDetailsPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const query = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.getById(projectId ?? ''),
    enabled: Boolean(projectId),
  });

  if (query.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Card className="p-8">
        <p className="text-lg font-semibold text-slate-900">Project not found</p>
        <p className="mt-2 text-sm text-slate-500">The project may have been deleted or you may not have access.</p>
        <Link to="/projects" className="mt-5 inline-block">
          <Button type="button" variant="secondary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to projects
          </Button>
        </Link>
      </Card>
    );
  }

  const project = query.data;
  const workspaceName = typeof project.workspace === 'string' ? 'Workspace' : project.workspace.name;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Project details</p>
          <h2 className="mt-1 text-3xl font-semibold text-slate-950">{project.name}</h2>
        </div>
        <Link to="/projects">
          <Button type="button" variant="secondary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {detailItems.map(({ label, valueKey, icon: Icon }) => {
              const value =
                valueKey === 'workspace'
                  ? workspaceName
                  : valueKey === 'deadline'
                    ? formatDate(project.deadline)
                    : valueKey === 'createdBy'
                      ? typeof project.createdBy === 'string'
                        ? 'Team member'
                        : project.createdBy.name
                      : project[valueKey];

              return (
                <div key={label} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                    <Icon className="h-4 w-4" />
                    {label}
                  </div>
                  <p className="mt-2 text-base font-semibold text-slate-900">{String(value)}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-6 space-y-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Original scope</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">
                {project.originalScope || 'No original scope has been recorded for this project yet.'}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Description</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">
                {project.description || 'No description provided.'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Requirement Drift Analysis</p>
          <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
                <Layers3 className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">AI-powered drift detection</h3>
                <p className="text-sm text-slate-500">Phase 2 placeholder</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              AI-powered drift detection will be added in Phase 2.
            </p>
          </div>
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Updated at</p>
            <p className="mt-1">{formatDate(project.updatedAt)}</p>
          </div>
        </Card>
      </div>
    </div>
  );
};
