import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Clock3, FolderKanban, Plus, Sparkles, User2 } from 'lucide-react';
import { projectApi } from '../api/project.api';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { Spinner } from '../components/common/Spinner';
import { formatDate } from '../utils/formatDate';
import { BaselineButton } from '../features/requirements/BaselineButton';
import { RequirementExtractionPanel } from '../features/requirements/RequirementExtractionPanel';
import { RequirementFormModal } from '../features/requirements/RequirementFormModal';
import { RequirementTable } from '../features/requirements/RequirementTable';
import { RequirementVersionHistory } from '../features/requirements/RequirementVersionHistory';
import type { Requirement, RequirementFormSubmitValues, RequirementFormValues } from '../features/requirements/requirement.types';
import { DriftAnalysisPanel } from '../features/drift/DriftAnalysisPanel';
import { DriftHistory } from '../features/drift/DriftHistory';
import { ChangeRequestPreview } from '../features/change-requests/ChangeRequestPreview';
import { ChangeRequestHistory } from '../features/change-requests/ChangeRequestHistory';
import type { ChangeRequest } from '../features/change-requests/changeRequest.types';
import type { DriftAnalysis } from '../features/drift/drift.types';
import {
  useCreateBaseline,
  useCreateRequirement,
  useDeleteRequirement,
  useProjectRequirements,
  useRequirementVersions,
  useUpdateRequirement,
} from '../hooks/useRequirements';
import { useDeleteDriftAnalysis, useProjectDriftAnalyses } from '../hooks/useDrift';
import { useDeleteChangeRequest, useProjectChangeRequests, useUpdateChangeRequest } from '../hooks/useChangeRequests';

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
  const [activeSection, setActiveSection] = useState<'requirements' | 'drift' | 'changes'>('requirements');

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.getById(projectId ?? ''),
    enabled: Boolean(projectId),
  });

  const requirementsQuery = useProjectRequirements(projectId);
  const versionsQuery = useRequirementVersions(projectId);
  const driftAnalysesQuery = useProjectDriftAnalyses(projectId);
  const changeRequestsQuery = useProjectChangeRequests(projectId);
  const createRequirementMutation = useCreateRequirement();
  const updateRequirementMutation = useUpdateRequirement();
  const deleteRequirementMutation = useDeleteRequirement();
  const createBaselineMutation = useCreateBaseline();
  const deleteDriftAnalysisMutation = useDeleteDriftAnalysis();
  const deleteChangeRequestMutation = useDeleteChangeRequest();
  const updateChangeRequestMutation = useUpdateChangeRequest();

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
  const driftAnalyses = driftAnalysesQuery.data ?? [];
  const changeRequests = changeRequestsQuery.data ?? [];

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

  const handleDeleteDriftAnalysis = async (analysis: DriftAnalysis) => {
    if (!projectId || !analysis._id) return;
    const confirmed = window.confirm('Delete this saved drift analysis?');
    if (!confirmed) return;
    await deleteDriftAnalysisMutation.mutateAsync({ driftAnalysisId: analysis._id, projectId });
  };

  const handleDeleteChangeRequest = async (changeRequest: ChangeRequest) => {
    if (!projectId || !changeRequest._id) return;
    const confirmed = window.confirm('Delete this change request?');
    if (!confirmed) return;
    await deleteChangeRequestMutation.mutateAsync({ changeRequestId: changeRequest._id, projectId });
  };

  const handleUpdateChangeRequestStatus = async (changeRequest: ChangeRequest, status: ChangeRequest['status']) => {
    if (!projectId || !changeRequest._id) return;
    await updateChangeRequestMutation.mutateAsync({
      changeRequestId: changeRequest._id,
      projectId,
      payload: { status },
    });
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

      <Card className="border-lime-400/20 bg-black/60 p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-800 bg-black/40 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Requirements</p>
            <p className="mt-1 text-lg font-semibold text-white">{requirements.length}</p>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-black/40 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Baselines</p>
            <p className="mt-1 text-lg font-semibold text-white">{versions.length}</p>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-black/40 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Updated</p>
            <p className="mt-1 text-sm font-semibold text-white">{formatDate(project.updatedAt)}</p>
          </div>
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

      <Card className="border-lime-400/20 bg-black/60 p-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <Button
            type="button"
            variant={activeSection === 'requirements' ? 'primary' : 'secondary'}
            onClick={() => setActiveSection('requirements')}
            className="w-full"
          >
            Requirements
          </Button>
          <Button
            type="button"
            variant={activeSection === 'drift' ? 'primary' : 'secondary'}
            onClick={() => setActiveSection('drift')}
            className="w-full"
          >
            Drift Analysis
          </Button>
          <Button
            type="button"
            variant={activeSection === 'changes' ? 'primary' : 'secondary'}
            onClick={() => setActiveSection('changes')}
            className="w-full"
          >
            Change Requests
          </Button>
        </div>
      </Card>

      {activeSection === 'requirements' ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-lime-400">Requirements</p>
              <h3 className="mt-1 text-2xl font-semibold text-white">Define and baseline scope</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                Add requirements first, then freeze a baseline for drift tracking.
              </p>
            </div>
            <Button type="button" onClick={handleOpenCreateModal}>
              <Plus className="mr-2 h-4 w-4" />
              Add Requirement
            </Button>
          </div>

          <BaselineButton requirementCount={requirements.length} isLoading={createBaselineMutation.isPending} onCreateBaseline={handleCreateBaseline} />

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
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
              <RequirementVersionHistory versions={versionsQuery.isLoading ? [] : versions} />
              <RequirementExtractionPanel projectId={project._id} workspaceId={workspaceId} defaultSourceText={project.originalScope} />
            </div>
          </div>
        </div>
      ) : null}

      {activeSection === 'drift' ? (
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-lime-400">Requirement Drift Analysis</p>
            <h3 className="mt-1 text-2xl font-semibold text-white">Analyze new client input</h3>
          </div>

          {requirements.length === 0 ? (
            <EmptyState
              title="Add requirements and create a baseline before analyzing drift."
              description="Drift analysis needs approved requirements so it can compare future client input against the original scope."
              icon={<span className="text-lime-400">DRIFT</span>}
            />
          ) : versions.length === 0 ? (
            <EmptyState
              title="Create a requirement baseline before running drift analysis."
              description="Baseline versions are required so the drift engine has an approved scope to compare against."
              actionLabel="Create Baseline"
              onAction={() => {
                void handleCreateBaseline();
              }}
              icon={<span className="text-lime-400">BASE</span>}
            />
          ) : (
            <DriftAnalysisPanel projectId={project._id} versions={versions} hasRequirements={requirements.length > 0} />
          )}

          <Card className="border-lime-400/20 bg-black/60 p-6">
            <div className="mb-4">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-lime-400">Drift history</p>
              <h3 className="mt-1 text-lg font-semibold text-white">Saved analyses</h3>
            </div>
            <DriftHistory
              analyses={driftAnalysesQuery.isLoading ? [] : driftAnalyses}
              onDelete={handleDeleteDriftAnalysis}
              isDeleting={deleteDriftAnalysisMutation.isPending}
            />
          </Card>
        </div>
      ) : null}

      {activeSection === 'changes' ? (
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-lime-400">Change Requests</p>
            <h3 className="mt-1 text-2xl font-semibold text-white">Generate and track approvals</h3>
          </div>

          <ChangeRequestPreview projectId={project._id} driftAnalyses={driftAnalyses} />

          <Card className="border-lime-400/20 bg-black/60 p-6">
            <div className="mb-4">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-lime-400">Change request history</p>
              <h3 className="mt-1 text-lg font-semibold text-white">Saved requests</h3>
            </div>
            <ChangeRequestHistory
              changeRequests={changeRequestsQuery.isLoading ? [] : changeRequests}
              onUpdate={handleUpdateChangeRequestStatus}
              onDelete={handleDeleteChangeRequest}
              isUpdating={updateChangeRequestMutation.isPending}
              isDeleting={deleteChangeRequestMutation.isPending}
            />
          </Card>
        </div>
      ) : null}

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
