import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  CalendarDays,
  Clock3,
  FileText,
  FolderKanban,
  GitCompareArrows,
  Layers3,
  ListChecks,
  Plus,
  Sparkles,
  User2,
} from 'lucide-react';
import { projectApi } from '../api/project.api';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { Spinner } from '../components/common/Spinner';
import { formatDate } from '../utils/formatDate';
import { cn } from '../utils/cn';
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

type ActiveSection = 'requirements' | 'drift' | 'changes';

const navItems: Array<{ id: ActiveSection; label: string; description: string; icon: typeof ListChecks }> = [
  { id: 'requirements', label: 'Requirements', description: 'Scope, extraction, baselines', icon: ListChecks },
  { id: 'drift', label: 'Drift Analysis', description: 'Compare new client input', icon: GitCompareArrows },
  { id: 'changes', label: 'Change Requests', description: 'Client-ready approvals', icon: FileText },
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

const formatValue = (value: string) => value.replace(/_/g, ' ');

const PanelHeader = ({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="flex flex-wrap items-start justify-between gap-4">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-lime-400">{eyebrow}</p>
      <h3 className="mt-1 text-xl font-semibold text-white">{title}</h3>
      {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">{description}</p> : null}
    </div>
    {action}
  </div>
);

const MetricTile = ({ label, value, icon: Icon }: { label: string; value: ReactNode; icon: typeof ListChecks }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{label}</p>
      <Icon className="h-4 w-4 text-lime-400" />
    </div>
    <div className="mt-3 text-lg font-semibold text-white">{value}</div>
  </div>
);

const ScopeBlock = ({ title, value }: { title: string; value: string }) => (
  <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-400">{title}</p>
    <p className="mt-3 max-h-36 overflow-y-auto whitespace-pre-line pr-2 text-sm leading-6 text-gray-300">
      {value || `No ${title.toLowerCase()} recorded.`}
    </p>
  </div>
);

export const ProjectDetailsPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [isRequirementModalOpen, setIsRequirementModalOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<Requirement | null>(null);
  const [activeSection, setActiveSection] = useState<ActiveSection>('requirements');

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
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-lime-400">Project workspace</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal text-white">{project.name}</h2>
        </div>
        <Link to="/projects">
          <Button type="button" variant="secondary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>

      <section className="overflow-hidden rounded-3xl border border-lime-400/20 bg-black/70 shadow-[0_18px_80px_rgba(163,230,53,0.06)]">
        <div className="grid gap-0 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="border-b border-white/10 p-6 xl:border-b-0 xl:border-r">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-lime-400/20 bg-lime-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-lime-300">
                {formatValue(project.status)}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
                {formatValue(project.priority)} priority
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
                {workspaceName}
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricTile label="Requirements" value={requirements.length} icon={ListChecks} />
              <MetricTile label="Baselines" value={versions.length} icon={Layers3} />
              <MetricTile label="Drift runs" value={driftAnalyses.length} icon={GitCompareArrows} />
              <MetricTile label="Change requests" value={changeRequests.length} icon={FileText} />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricTile label="Client" value={project.clientName} icon={User2} />
              <MetricTile label="Deadline" value={formatDate(project.deadline)} icon={CalendarDays} />
              <MetricTile label="Updated" value={<span className="text-base">{formatDate(project.updatedAt)}</span>} icon={Clock3} />
              <MetricTile label="AI engine" value="Ollama" icon={Bot} />
            </div>
          </div>

          <div className="space-y-3 bg-white/[0.02] p-6">
            <ScopeBlock title="Original scope" value={project.originalScope} />
            <ScopeBlock title="Description" value={project.description} />
          </div>
        </div>
      </section>

      <nav className="grid gap-3 rounded-3xl border border-white/10 bg-black/70 p-3 md:grid-cols-3">
        {navItems.map(({ id, label, description, icon: Icon }) => {
          const isActive = activeSection === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveSection(id)}
              className={cn(
                'flex min-h-20 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition',
                isActive
                  ? 'border-lime-400/40 bg-lime-400/15 text-white shadow-[0_0_30px_rgba(163,230,53,0.08)]'
                  : 'border-transparent bg-white/[0.02] text-gray-400 hover:border-lime-400/20 hover:bg-lime-400/5 hover:text-white'
              )}
            >
              <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full border', isActive ? 'border-lime-400/40 bg-black text-lime-300' : 'border-white/10 bg-black/60 text-gray-400')}>
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{label}</span>
                <span className="mt-1 block text-xs leading-5 text-gray-500">{description}</span>
              </span>
            </button>
          );
        })}
      </nav>

      {activeSection === 'requirements' ? (
        <section className="space-y-5">
          <PanelHeader
            eyebrow="Requirements"
            title="Define scope and create a baseline"
            description="Build the structured project scope first. Baselines are snapshots used by the AI drift engine."
            action={
              <Button type="button" onClick={handleOpenCreateModal}>
                <Plus className="mr-2 h-4 w-4" />
                Add Requirement
              </Button>
            }
          />

          <BaselineButton requirementCount={requirements.length} isLoading={createBaselineMutation.isPending} onCreateBaseline={handleCreateBaseline} />

          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
            <Card className="min-w-0 border-white/10 bg-black/60 p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-400">Requirement list</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">Structured requirements</h3>
                </div>
                <span className="rounded-full border border-lime-400/20 bg-lime-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-lime-300">
                  {requirements.length} total
                </span>
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

            <aside className="space-y-5">
              <RequirementVersionHistory versions={versionsQuery.isLoading ? [] : versions} />
              <RequirementExtractionPanel projectId={project._id} workspaceId={workspaceId} defaultSourceText={project.originalScope} />
            </aside>
          </div>
        </section>
      ) : null}

      {activeSection === 'drift' ? (
        <section className="space-y-5">
          <PanelHeader
            eyebrow="Drift analysis"
            title="Analyze new client input with Ollama"
            description="Compare incoming scope changes against the selected baseline and save reviewed analyses for change requests."
          />

          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_430px]">
            <div className="min-w-0">
              {requirements.length === 0 ? (
                <EmptyState
                  title="Add requirements and create a baseline before analyzing drift."
                  description="Drift analysis needs approved requirements so it can compare future client input against the original scope."
                  icon={<GitCompareArrows className="h-5 w-5" />}
                />
              ) : versions.length === 0 ? (
                <EmptyState
                  title="Create a requirement baseline before running drift analysis."
                  description="Baseline versions are required so the drift engine has approved scope to compare against."
                  actionLabel="Create Baseline"
                  onAction={() => {
                    void handleCreateBaseline();
                  }}
                  icon={<Layers3 className="h-5 w-5" />}
                />
              ) : (
                <DriftAnalysisPanel projectId={project._id} versions={versions} hasRequirements={requirements.length > 0} />
              )}
            </div>

            <Card className="border-white/10 bg-black/60 p-5">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-400">History</p>
                <h3 className="mt-1 text-lg font-semibold text-white">Saved analyses</h3>
              </div>
              <DriftHistory
                analyses={driftAnalysesQuery.isLoading ? [] : driftAnalyses}
                onDelete={handleDeleteDriftAnalysis}
                isDeleting={deleteDriftAnalysisMutation.isPending}
              />
            </Card>
          </div>
        </section>
      ) : null}

      {activeSection === 'changes' ? (
        <section className="space-y-5">
          <PanelHeader
            eyebrow="Change requests"
            title="Generate client-ready approval drafts"
            description="Turn saved drift analyses into a structured change request with impact, cost, timeline, and approval language."
          />

          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_460px]">
            <div className="min-w-0">
              <ChangeRequestPreview projectId={project._id} driftAnalyses={driftAnalyses} />
            </div>

            <Card className="border-white/10 bg-black/60 p-5">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-400">History</p>
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
        </section>
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
