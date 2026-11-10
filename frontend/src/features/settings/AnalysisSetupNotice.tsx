import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { providerApi } from '../../api/provider.api';
import { useChangeReadiness } from '../../hooks/useDrift';

export const AnalysisSetupNotice = ({ workspaceId, canManage }: { workspaceId: string; canManage: boolean }) => {
  const settingsUrl = `/settings?workspace=${encodeURIComponent(workspaceId)}#analysis-provider`;
  const provider = useQuery({
    queryKey: ['provider', workspaceId],
    queryFn: () => providerApi.get(workspaceId),
  });
  const readiness = useChangeReadiness(workspaceId);

  if (provider.isPending || readiness.isPending) return <p className="v-muted text-sm" role="status">Checking analysis setup…</p>;
  if (provider.isError || readiness.isError) return <p className="v-muted text-sm" role="alert">Analysis setup could not be checked. <Link className="v-link" to={settingsUrl}>Open provider settings</Link>.</p>;
  if (provider.data.providerType === 'openai_compatible') return (
    <p className="v-muted text-sm">Analysis provider: {provider.data.displayName} · {provider.data.model}. {readiness.data?.available ? 'Configured; live availability is checked when you compare.' : 'The saved provider is unavailable.'} <Link className="v-link" to={settingsUrl}>Test the connection</Link>.</p>
  );
  if (readiness.data?.available) return <p className="v-muted text-sm">Local analysis is available. You can also <Link className="v-link" to={settingsUrl}>choose an external provider</Link> for this workspace.</p>;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--v-border)] bg-white p-5">
      <div>
        <p className="font-semibold">Compare changes when you're ready</p>
        <p className="v-muted mt-1 max-w-2xl text-sm">Projects and scope snapshots work without AI. Comparison needs a local model or a workspace provider key.</p>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        {canManage ? <Link className="v-link" to={settingsUrl}>Connect your provider</Link> : <span className="v-muted">Ask a workspace owner to configure analysis.</span>}
        <Link className="v-link" to="/projects">Continue without AI</Link>
      </div>
    </div>
  );
};
