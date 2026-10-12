import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { projectApi } from '../api/project.api';
import { useWorkspaces } from '../hooks/useWorkspaces';
import { useProjectRequirements, useRequirementVersions, useCreateRequirement, useUpdateRequirement, useDeleteRequirement, useCreateBaseline } from '../hooks/useRequirements';
import { useProjectDriftAnalyses, useDeleteDriftAnalysis } from '../hooks/useDrift';
import { useProjectChangeRequests, useDeleteChangeRequest, useUpdateChangeRequest, useApprovalDecision } from '../hooks/useChangeRequests';
import { useProjectFiles, useUploadFile, useDeleteFile, useFileCapabilities } from '../hooks/useFiles';
import { roleForProject, canWrite, canApprove } from '../utils/permissions';
import { nextProjectAction } from '../features/dashboard/attention';
import { formatDate } from '../utils/formatDate';
import { RequirementFormModal } from '../features/requirements/RequirementFormModal';
import { RequirementTable } from '../features/requirements/RequirementTable';
import { RequirementVersionHistory } from '../features/requirements/RequirementVersionHistory';
import { RequirementExtractionPanel } from '../features/requirements/RequirementExtractionPanel';
import { BaselineButton } from '../features/requirements/BaselineButton';
import { DriftAnalysisPanel } from '../features/drift/DriftAnalysisPanel';
import { DriftHistory } from '../features/drift/DriftHistory';
import { ChangeRequestPreview } from '../features/change-requests/ChangeRequestPreview';
import { ChangeRequestHistory } from '../features/change-requests/ChangeRequestHistory';
import { FileUploadPanel } from '../features/files/FileUploadPanel';
import { requirementToFormValues } from '../features/projects/projectDetailsUi';
import type { Requirement, RequirementFormSubmitValues } from '../features/requirements/requirement.types';
import type { DriftAnalysis } from '../features/drift/drift.types';
import type { ChangeRequest } from '../features/change-requests/changeRequest.types';
import type { ProjectFile } from '../features/files/file.types';

type Section = 'overview' | 'scope' | 'compare' | 'decisions' | 'more';
const legacySection: Record<string, Section> = { requirements: 'scope', drift: 'compare', changes: 'decisions', history: 'more', documents: 'more' };
const tabs: { id: Section; label: string }[] = [{ id: 'overview', label: 'Overview' }, { id: 'scope', label: 'Agreed scope' }, { id: 'compare', label: 'Changes' }, { id: 'decisions', label: 'Decisions' }, { id: 'more', label: 'More' }];

const LocalState = ({ loading, error, retry, children }: { loading: boolean; error: boolean; retry: () => void; children: React.ReactNode }) => error
  ? <div role="alert" className="v-panel p-5"><h2 className="v-section-title">This section couldn't be loaded</h2><p className="v-muted mt-2 text-sm">We won't show an empty state until the data loads successfully.</p><Button className="mt-4" onClick={retry}>Retry</Button></div>
  : loading ? <div className="v-panel flex items-center gap-3 p-5" role="status"><Spinner /> Loading this section…</div> : children;

export const ProjectDetailsPage = () => {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const [params, setParams] = useSearchParams();
  const rawSection = params.get('section') ?? 'overview';
  const section: Section = legacySection[rawSection] ?? (tabs.some((tab) => tab.id === rawSection) ? rawSection as Section : 'overview');
  const setSection = (next: Section) => setParams((current) => { const updated = new URLSearchParams(current); updated.set('section', next); return updated; });
  const [editing, setEditing] = useState<Requirement | null>(null);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const projectQuery = useQuery({ queryKey: ['project', projectId], queryFn: () => projectApi.getById(projectId), enabled: Boolean(projectId) });
  const workspacesQuery = useWorkspaces();
  const requirementsQuery = useProjectRequirements(projectId);
  const versionsQuery = useRequirementVersions(projectId);
  const analysesQuery = useProjectDriftAnalyses(projectId);
  const requestsQuery = useProjectChangeRequests(projectId);
  const filesQuery = useProjectFiles(projectId);
  const fileCapabilitiesQuery = useFileCapabilities();
  const createRequirement = useCreateRequirement();
  const updateRequirement = useUpdateRequirement();
  const deleteRequirement = useDeleteRequirement();
  const createBaseline = useCreateBaseline();
  const deleteAnalysis = useDeleteDriftAnalysis();
  const deleteRequest = useDeleteChangeRequest();
  const updateRequest = useUpdateChangeRequest();
  const approvalDecision = useApprovalDecision();
  const uploadFile = useUploadFile();
  const deleteFile = useDeleteFile();

  if (projectQuery.isPending) return <div role="status" className="flex items-center gap-3"><Spinner /> Loading project…</div>;
  if (projectQuery.isError || !projectQuery.data) return <div role="alert" className="v-panel p-6"><h1 className="v-section-title">Project unavailable</h1><p className="v-muted mt-2">It may have been deleted, or you may not have access.</p><Link to="/projects" className="v-link mt-4 inline-block">Back to projects</Link></div>;

  const project = projectQuery.data;
  const role = roleForProject(project, workspacesQuery.workspaces);
  const writable = canWrite(role);
  const approver = canApprove(role);
  const workspaceId = typeof project.workspace === 'string' ? project.workspace : project.workspace._id;
  const requirements = requirementsQuery.data ?? [];
  const versions = versionsQuery.data ?? [];
  const analyses = analysesQuery.data ?? [];
  const requests = requestsQuery.data ?? [];
  const files = filesQuery.data ?? [];
  const scopeItems = requirements.filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(search.toLowerCase()));
  const coreLoading = requirementsQuery.isPending || versionsQuery.isPending || analysesQuery.isPending || requestsQuery.isPending || workspacesQuery.isPending;
  const coreError = requirementsQuery.isError || versionsQuery.isError || analysesQuery.isError || requestsQuery.isError || workspacesQuery.isError;
  const retryCore = () => { void requirementsQuery.refetch(); void versionsQuery.refetch(); void analysesQuery.refetch(); void requestsQuery.refetch(); void workspacesQuery.refetch(); };
  const next = !coreLoading && !coreError ? nextProjectAction({ project, requirements, versions, analyses, requests }, writable, approver) : null;
  const pendingRequest = requests.find((item) => item.approvalStatus === 'pending_approval');

  const saveRequirement = async (values: RequirementFormSubmitValues) => {
    if (editing) await updateRequirement.mutateAsync({ requirementId: editing._id, projectId, payload: values });
    else await createRequirement.mutateAsync({ projectId, workspaceId, ...values });
  };
  const removeRequirement = async (item: Requirement) => { if (window.confirm(`Delete ${item.title}?`)) await deleteRequirement.mutateAsync({ requirementId: item._id, projectId }); };
  const removeAnalysis = async (item: DriftAnalysis) => { if (item._id && window.confirm('Delete this saved analysis?')) await deleteAnalysis.mutateAsync({ driftAnalysisId: item._id, projectId }); };
  const removeRequest = async (item: ChangeRequest) => { if (item._id && window.confirm('Delete this change request?')) await deleteRequest.mutateAsync({ changeRequestId: item._id, projectId }); };
  const removeFile = async (item: ProjectFile) => { if (window.confirm(`Delete ${item.originalName}?`)) await deleteFile.mutateAsync({ fileId: item._id, projectId }); };

  return <div className="space-y-7">
    <header><Link to="/projects" className="v-link text-sm">← Projects</Link><div className="mt-4 flex flex-wrap items-end justify-between gap-3"><div><p className="v-kicker">{project.clientName}</p><h1 className="v-page-title mt-1">{project.name}</h1></div><span className="v-pill capitalize">{project.status}</span></div></header>
    <nav aria-label="Project sections" className="flex flex-wrap gap-1 border-b border-[var(--v-border)]">{tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setSection(tab.id)} aria-current={section === tab.id ? 'page' : undefined} className={`min-h-11 border-b-2 px-3 py-2 text-sm font-semibold ${section === tab.id ? 'border-[var(--v-accent)] text-[var(--v-accent)]' : 'border-transparent text-[var(--v-muted)] hover:text-[var(--v-text)]'}`}>{tab.label}</button>)}</nav>

    {section === 'overview' ? <LocalState loading={coreLoading} error={coreError} retry={retryCore}>
      <div className="space-y-6"><section className="v-hero p-6 sm:p-8"><p className="v-kicker">What needs attention</p><h2 className="v-section-title mt-2">{next?.title}</h2><p className="v-muted mt-2 text-sm">{next?.detail}</p>{next ? <button className="v-link mt-4 text-sm" onClick={() => setSection(next.to.includes('scope') ? 'scope' : next.to.includes('decisions') || next.to.includes('approvals') ? 'decisions' : 'compare')}>{next.label} →</button> : null}</section>
        <div className="grid gap-4 lg:grid-cols-3"><section className="v-panel p-5"><p className="v-kicker">Current comparison point</p><h3 className="mt-2 font-semibold">{versions[0] ? `Scope snapshot #${versions[0].versionNumber}` : 'No snapshot yet'}</h3><p className="v-muted mt-2 text-sm">{versions[0] ? `${versions[0].requirementsSnapshot.length} items · Saved ${formatDate(versions[0].createdAt)}` : `${requirements.length} current scope items`}</p><button className="v-link mt-4 text-sm" onClick={() => setSection('scope')}>View agreed scope</button></section>
          <section className="v-panel p-5"><p className="v-kicker">Latest change</p><h3 className="mt-2 font-semibold">{analyses[0] ? analyses[0].detectedChanges.length ? `${analyses[0].detectedChanges.length} proposed difference${analyses[0].detectedChanges.length === 1 ? '' : 's'}` : 'No difference proposed' : 'No changes compared yet'}</h3><p className="v-muted mt-2 line-clamp-2 text-sm">{analyses[0]?.inputText || 'Compare the next client request when it arrives.'}</p><button className="v-link mt-4 text-sm" onClick={() => setSection('compare')}>View changes</button></section>
          <section className="v-panel p-5"><p className="v-kicker">Decision</p><h3 className="mt-2 font-semibold">{pendingRequest ? 'Waiting for approval' : requests[0] ? 'Latest request recorded' : 'No decision pending'}</h3><p className="v-muted mt-2 line-clamp-2 text-sm">{pendingRequest?.title || requests[0]?.title || 'A change request can be prepared after an analysis is saved.'}</p><button className="v-link mt-4 text-sm" onClick={() => setSection('decisions')}>View decisions</button></section></div>
        {project.originalScope ? <section className="max-w-3xl"><h2 className="v-section-title">Original project description</h2><p className="v-muted mt-2 whitespace-pre-line text-sm leading-6">{project.originalScope}</p></section> : null}
      </div>
    </LocalState> : null}

    {section === 'scope' ? <LocalState loading={requirementsQuery.isPending || versionsQuery.isPending || workspacesQuery.isPending} error={requirementsQuery.isError || versionsQuery.isError || workspacesQuery.isError} retry={() => { void requirementsQuery.refetch(); void versionsQuery.refetch(); void workspacesQuery.refetch(); }}>
      <div className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="v-kicker">The agreement</p><h2 className="v-section-title mt-1">What this project is expected to deliver</h2><p className="v-muted mt-1 text-sm">Current scope items are editable; snapshots preserve earlier comparison points.</p></div>{writable ? <Button onClick={() => setAdding(true)}>Add scope item</Button> : null}</div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]"><div className="space-y-4"><label className="block text-sm font-medium">Search scope<input className="mt-2 block h-11 w-full rounded-lg border border-[var(--v-border)] bg-white px-3 font-normal" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title or description" /></label>{!scopeItems.length && requirements.length ? <p className="v-muted">No items match that search.</p> : <RequirementTable requirements={scopeItems} canEdit={writable} onEdit={setEditing} onDelete={(item) => void removeRequirement(item)} />}</div><aside className="space-y-4"><BaselineButton requirements={requirements} canCreate={approver} isLoading={createBaseline.isPending} onCreateBaseline={() => createBaseline.mutateAsync({ projectId })} onCompare={() => setSection('compare')} /><RequirementVersionHistory versions={versions} />{writable ? <details className="v-panel p-5"><summary className="cursor-pointer font-semibold">Suggest items from scope text</summary><div className="mt-4"><RequirementExtractionPanel projectId={projectId} workspaceId={workspaceId} defaultSourceText={project.originalScope} /></div></details> : null}</aside></div>
      </div>
    </LocalState> : null}

    {section === 'compare' ? <LocalState loading={versionsQuery.isPending || requirementsQuery.isPending || analysesQuery.isPending || workspacesQuery.isPending} error={versionsQuery.isError || requirementsQuery.isError || analysesQuery.isError || workspacesQuery.isError} retry={retryCore}>
      <div className="space-y-6"><DriftAnalysisPanel projectId={projectId} workspaceId={workspaceId} versions={versions} canAnalyze={writable} onPrepareDecision={() => setSection('decisions')} /><details className="v-panel p-5"><summary className="cursor-pointer font-semibold">Previously saved analyses ({analyses.length})</summary><div className="mt-4"><DriftHistory analyses={analyses} canDelete={writable} onDelete={(item) => void removeAnalysis(item)} isDeleting={deleteAnalysis.isPending} /></div></details></div>
    </LocalState> : null}

    {section === 'decisions' ? <LocalState loading={requestsQuery.isPending || analysesQuery.isPending || workspacesQuery.isPending} error={requestsQuery.isError || analysesQuery.isError || workspacesQuery.isError} retry={() => { void requestsQuery.refetch(); void analysesQuery.refetch(); void workspacesQuery.refetch(); }}>
      <div className="space-y-6"><div><p className="v-kicker">Human decision</p><h2 className="v-section-title mt-1">Prepare and decide</h2><p className="v-muted mt-1 text-sm">Start from a saved proposed analysis. Edit the request before submitting it; approval is a separate decision.</p></div>{writable ? <ChangeRequestPreview projectId={projectId} driftAnalyses={analyses} /> : null}<ChangeRequestHistory changeRequests={requests} canEdit={writable} canApprove={approver} onUpdate={(item, status) => { if (item._id) void updateRequest.mutateAsync({ changeRequestId: item._id, projectId, payload: { status } }); }} onSubmitApproval={(item) => { if (item._id) void approvalDecision.mutateAsync({ action: 'submit', changeRequestId: item._id, projectId, note: 'Submitted from the project.' }); }} onDelete={(item) => void removeRequest(item)} isUpdating={updateRequest.isPending} isApprovalUpdating={approvalDecision.isPending} isDeleting={deleteRequest.isPending} />{approver ? <Link className="v-link text-sm" to="/approvals">Open decision queue →</Link> : null}</div>
    </LocalState> : null}

    {section === 'more' ? <div className="space-y-6"><section className="v-panel p-5"><p className="v-kicker">Supporting files</p><h2 className="v-section-title mt-1">Project documents</h2><p className="v-muted mt-2 text-sm">Files are stored with this project; they are not automatically used in change analysis.</p><LocalState loading={filesQuery.isPending} error={filesQuery.isError} retry={() => void filesQuery.refetch()}><div className="mt-5">{fileCapabilitiesQuery.isError ? <p role="alert" className="rounded-lg bg-[var(--v-accent-soft)] p-4 text-sm">Upload availability couldn't be checked. Existing files are still shown. <button className="v-link" onClick={() => void fileCapabilitiesQuery.refetch()}>Retry</button></p> : fileCapabilitiesQuery.isPending ? <p role="status" className="v-muted text-sm">Checking file storage…</p> : !fileCapabilitiesQuery.data?.uploadEnabled ? <p className="rounded-lg bg-[var(--v-accent-soft)] p-4 text-sm">File storage isn't enabled on this installation. Existing project work is unaffected. An administrator can configure storage locally.</p> : null}<FileUploadPanel files={files} canUpload={writable && Boolean(fileCapabilitiesQuery.data?.uploadEnabled)} canDelete={writable} isUploading={uploadFile.isPending} isDeleting={deleteFile.isPending} errorMessage={uploadFile.error?.message} onUpload={(payload) => uploadFile.mutateAsync({ projectId, ...payload }).then(() => undefined)} onDelete={(item) => void removeFile(item)} /></div></LocalState></section><section className="v-panel p-5"><h2 className="v-section-title">Project details</h2><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="v-muted">Workspace</dt><dd>{typeof project.workspace === 'string' ? 'Workspace' : project.workspace.name}</dd></div><div><dt className="v-muted">Deadline</dt><dd>{formatDate(project.deadline)}</dd></div><div><dt className="v-muted">Priority</dt><dd className="capitalize">{project.priority}</dd></div><div><dt className="v-muted">Updated</dt><dd>{formatDate(project.updatedAt)}</dd></div></dl>{project.description ? <p className="v-muted mt-4 text-sm">{project.description}</p> : null}</section><Link className="v-link text-sm" to="/evaluation">Advanced model diagnostics →</Link></div> : null}

    <RequirementFormModal open={adding || Boolean(editing)} onClose={() => { setAdding(false); setEditing(null); }} onSubmit={saveRequirement} initialValues={editing ? requirementToFormValues(editing) : undefined} mode={editing ? 'edit' : 'create'} isSubmitting={createRequirement.isPending || updateRequirement.isPending} />
  </div>;
};
