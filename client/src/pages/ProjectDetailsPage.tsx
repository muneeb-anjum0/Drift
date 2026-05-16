import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, FolderKanban, Layers3, Plus, Sparkles, User2 } from 'lucide-react';
import { projectApi } from '../api/project.api';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Spinner } from '../components/common/Spinner';
import { formatDate } from '../utils/formatDate';
import { BaselineButton } from '../features/requirements/BaselineButton';
import { RequirementExtractionPanel } from '../features/requirements/RequirementExtractionPanel';
import { RequirementFormModal } from '../features/requirements/RequirementFormModal';
import { RequirementTable } from '../features/requirements/RequirementTable';
import { RequirementVersionHistory } from '../features/requirements/RequirementVersionHistory';
import type { Requirement, RequirementFormSubmitValues, RequirementFormValues } from '../features/requirements/requirement.types';
import {
  useCreateBaseline,
  useCreateRequirement,
  useDeleteRequirement,
  useProjectRequirements,
  useRequirementVersions,
  useUpdateRequirement,
} from '../hooks/useRequirements';

const detailItems = [
  { label: 'Client name', valueKey: 'clientName' as const, icon: User2 },
  { label: 'Workspace', valueKey: 'workspace' as const, icon: FolderKanban },
  { label: 'Status', valueKey: 'status' as const, icon: Sparkles },
  { label: 'Priority', valueKey: 'priority' as const, icon: Clock3 },
  { label: 'Deadline', valueKey: 'deadline' as const, icon: CalendarDays },
  { label: 'Created by', valueKey: 'createdBy' as const, icon: User2 },
];

const toRequirementFormValues = (requirement: Requirement): Partial<RequirementFormValues> => ({
  title: requirement.title,
  description: requirement.description,
  type: requirement.type,
  priority: requirement.priority,
  status: requirement.status,
  source: requirement.source,
  sourceText: requirement.sourceText ?? '',
  acceptanceCriteria: requirement.acceptanceCriteria.join('\n'),
  tags: requirement.tags.join(', '),
  estimatedEffort: requirement.estimatedEffort?.toString() ?? '',
});

export const ProjectDetailsPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [isRequirementModalOpen, setIsRequirementModalOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<Requirement | null>(null);

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.getById(projectId ?? ''),
    enabled: Boolean(projectId),
  });

  const requirementsQuery = useProjectRequirements(projectId);
  const versionsQuery = useRequirementVersions(projectId);
  const createRequirementMutation = useCreateRequirement();
  const updateRequirementMutation = useUpdateRequirement();
  const deleteRequirementMutation = useDeleteRequirement();
  const createBaselineMutation = useCreateBaseline();

  if (projectQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <Card className="border-lime-400/20 bg-black/60 p-8">
        <p className="text-lg font-semibold text-white">Project not found</p>
        <p className="mt-2 text-sm text-gray-400">The project may have been deleted or you may not have access.</p>
        <Link to="/projects" className="mt-5 inline-block">
          <Button type="button" variant="secondary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to projects
          </Button>
        </Link>
      </Card>
    );
  }

  const project = projectQuery.data;
  const workspaceName = typeof project.workspace === 'string' ? 'Workspace' : project.workspace.name;
  const workspaceId = typeof project.workspace === 'string' ? project.workspace : project.workspace._id;
  const requirements = requirementsQuery.data ?? [];
  const versions = versionsQuery.data ?? [];
  const approvedCount = requirements.filter((requirement) => requirement.status === 'approved').length;
  const highPriorityCount = requirements.filter(
    (requirement) => requirement.priority === 'high' || requirement.priority === 'critical'
  ).length;

  const stats = [
    { label: 'Total Requirements', value: requirements.length, icon: FolderKanban },
    { label: 'Approved', value: approvedCount, icon: CheckCircle2 },
    { label: 'High / Critical Priority', value: highPriorityCount, icon: Clock3 },
    { label: 'Baseline Versions', value: versions.length, icon: Layers3 },
  ];

  const handleOpenCreateModal = () => {
    setEditingRequirement(null);
    setIsRequirementModalOpen(true);
  };

  const handleCreateRequirement = async (values: RequirementFormSubmitValues) => {
    if (!projectId) return;
    await createRequirementMutation.mutateAsync({ projectId, workspaceId, ...values });
  };

  const handleUpdateRequirement = async (values: RequirementFormSubmitValues) => {
    if (!projectId || !editingRequirement) return;
    await updateRequirementMutation.mutateAsync({
      requirementId: editingRequirement._id,
      projectId,
      payload: values,
    });
  };

  const handleDeleteRequirement = async (requirement: Requirement) => {
    const confirmed = window.confirm(`Delete ${requirement.title}?`);
    if (!confirmed || !projectId) return;
    await deleteRequirementMutation.mutateAsync({ requirementId: requirement._id, projectId });
  };

  const handleCreateBaseline = async () => {
    if (!projectId) return;
    await createBaselineMutation.mutateAsync({ projectId });
  };

  return (
    <div className="space-y-6 text-white">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-lime-400">Project details</p>
          <h2 className="mt-1 text-3xl font-semibold text-white">{project.name}</h2>
        </div>
        <Link to="/projects">
          <Button type="button" variant="secondary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-lime-400/20 bg-black/60 p-6">
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
                <div key={label} className="rounded-2xl border border-gray-800 bg-black/40 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-400">
                    <Icon className="h-4 w-4" />
                    {label}
                  </div>
                  <p className="mt-2 text-base font-semibold text-white">{String(value)}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-6 space-y-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-lime-400">Original scope</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-7 text-gray-400">
                {project.originalScope || 'No original scope has been recorded for this project yet.'}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-lime-400">Description</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-7 text-gray-400">
                {project.description || 'No description provided.'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="border-lime-400/20 bg-black/60 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-lime-400">Requirement Drift Analysis</p>
          <div className="mt-4 rounded-3xl border border-dashed border-gray-800 bg-black/40 p-6">
            <div className="flex items-center gap-3 text-white">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-lime-400/20 bg-black shadow-sm">
                <Layers3 className="h-5 w-5 text-lime-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Future roadmap</h3>
                <p className="text-sm text-gray-400">Scope drift detection will be added in Phase 3 after baseline requirements are created.</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-gray-400">
              Phase 2 is focused on structured requirement capture, local extraction, and baseline snapshots.
            </p>
          </div>
          <div className="mt-6 rounded-2xl border border-gray-800 bg-black/40 p-4 text-sm text-gray-400">
            <p className="font-semibold text-white">Updated at</p>
            <p className="mt-1">{formatDate(project.updatedAt)}</p>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-lime-400">Requirements</p>
            <h3 className="mt-1 text-2xl font-semibold text-white">Requirement Intelligence Layer</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
              Capture structured requirements now so Phase 3 can compare them against future client messages and scope changes.
            </p>
          </div>
          <Button type="button" onClick={handleOpenCreateModal}>
            <Plus className="mr-2 h-4 w-4" />
            Add Requirement
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="border-lime-400/20 bg-black/60 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">{stat.label}</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{stat.value}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-lime-400/20 bg-black">
                    <Icon className="h-5 w-5 text-lime-400" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <BaselineButton requirementCount={requirements.length} isLoading={createBaselineMutation.isPending} onCreateBaseline={handleCreateBaseline} />

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-lime-400/20 bg-black/60 p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-lime-400">Requirement list</p>
                <h3 className="mt-1 text-lg font-semibold text-white">Structured requirements</h3>
              </div>
              <div className="rounded-full border border-lime-400/20 bg-lime-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-lime-300">
                {requirements.length} total
              </div>
            </div>
            {requirementsQuery.isLoading ? (
              <div className="flex min-h-[240px] items-center justify-center">
                <Spinner />
              </div>
            ) : (
              <RequirementTable
                requirements={requirements}
                onEdit={(requirement) => {
                  setEditingRequirement(requirement);
                  setIsRequirementModalOpen(true);
                }}
                onDelete={handleDeleteRequirement}
              />
            )}
          </Card>

          <div className="space-y-6">
            <RequirementExtractionPanel projectId={project._id} workspaceId={workspaceId} defaultSourceText={project.originalScope} />
            <RequirementVersionHistory versions={versionsQuery.isLoading ? [] : versions} />
          </div>
        </div>
      </div>

      <RequirementFormModal
        open={isRequirementModalOpen}
        onClose={() => {
          setIsRequirementModalOpen(false);
          setEditingRequirement(null);
        }}
        onSubmit={editingRequirement ? handleUpdateRequirement : handleCreateRequirement}
        initialValues={editingRequirement ? toRequirementFormValues(editingRequirement) : undefined}
        mode={editingRequirement ? 'edit' : 'create'}
        isSubmitting={createRequirementMutation.isPending || updateRequirementMutation.isPending}
      />
    </div>
  );
};
