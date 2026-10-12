import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { providerApi } from '../../api/provider.api';
import { useWorkspaces } from '../../hooks/useWorkspaces';

const inputClass = 'mt-2 block h-11 w-full rounded-lg border border-[var(--v-border)] bg-white px-3 text-sm focus:border-[var(--v-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--v-accent)]';

export const ProviderSettings = () => {
  const { workspaces, isPending: workspacesPending } = useWorkspaces();
  const queryClient = useQueryClient();
  const [workspaceId, setWorkspaceId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (!workspaceId && workspaces[0]) setWorkspaceId(workspaces[0]._id); }, [workspaceId, workspaces]);
  const workspace = workspaces.find((item) => item._id === workspaceId);
  const canManage = workspace?.role === 'owner' || workspace?.role === 'admin';
  const providerQuery = useQuery({ queryKey: ['provider', workspaceId], queryFn: () => providerApi.get(workspaceId), enabled: Boolean(workspaceId) });
  const provider = providerQuery.data;
  useEffect(() => {
    setDisplayName(provider?.providerType === 'openai_compatible' ? provider.displayName : '');
    setEndpoint(provider?.endpoint ?? '');
    setModel(provider?.model ?? '');
    setApiKey('');
    setAcknowledged(false);
  }, [workspaceId, provider?.providerType, provider?.displayName, provider?.endpoint, provider?.model]);

  const resetFeedback = () => { setMessage(''); setError(''); };
  const payload = { providerType: 'openai_compatible' as const, displayName, endpoint, model, apiKey, privacyAcknowledged: acknowledged };
  const act = async (action: 'test' | 'testSaved' | 'save' | 'remove') => {
    if (!workspaceId || !canManage) return;
    resetFeedback(); setBusy(true);
    try {
      if (action === 'test' || action === 'testSaved') {
        await providerApi.test(workspaceId, action === 'testSaved' ? {} : payload);
        setMessage('Connected. No project text was sent for this test.');
      } else if (action === 'save') {
        if (!acknowledged) { setError('Acknowledge the external data transfer before saving.'); return; }
        if (!apiKey) { setError('Enter an API key. Saved keys cannot be revealed or reused in this form.'); return; }
        await providerApi.save(workspaceId, payload);
        setApiKey('');
        setMessage('External provider saved. The key cannot be viewed again.');
        await queryClient.invalidateQueries({ queryKey: ['provider', workspaceId] });
        await queryClient.invalidateQueries({ queryKey: ['change-readiness'] });
      } else {
        if (!window.confirm('Remove the external credential and switch this workspace to the local model? Project data and analysis history will remain.')) return;
        await providerApi.remove(workspaceId);
        setApiKey('');
        setMessage('External credential removed. Local model selected.');
        await queryClient.invalidateQueries({ queryKey: ['provider', workspaceId] });
        await queryClient.invalidateQueries({ queryKey: ['change-readiness'] });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Provider action failed.');
    } finally { setBusy(false); }
  };

  return <section id="analysis-provider" className="v-panel p-6">
    <p className="v-kicker">Workspace setting</p>
    <h2 className="v-section-title mt-2">Analysis provider</h2>
    <p className="v-muted mt-2 text-sm">Choose the local model or an external provider you pay directly. Analysis remains a proposal; people make decisions.</p>
    {workspacesPending ? <p role="status" className="v-muted mt-5 text-sm">Loading workspaces…</p> : !workspaces.length ? <p className="v-muted mt-5 text-sm">Create a workspace before configuring analysis.</p> : <>
      <label className="mt-5 block text-sm font-medium">Workspace<select className={inputClass} value={workspaceId} onChange={(event) => { setWorkspaceId(event.target.value); resetFeedback(); }}>{workspaces.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
      {providerQuery.isPending ? <p role="status" className="v-muted mt-4 text-sm">Loading provider…</p> : providerQuery.isError ? <p role="alert" className="mt-4 text-sm">Provider settings could not be loaded. <button className="v-link" type="button" onClick={() => void providerQuery.refetch()}>Retry</button></p> : <>
        <p className="mt-5 text-sm"><strong>Current:</strong> {provider?.providerType === 'openai_compatible' ? `${provider.displayName} · ${provider.model}` : 'Local model'}{provider?.providerType === 'openai_compatible' ? ' · API key configured' : ''}</p>
        {!canManage ? <p className="v-muted mt-3 text-sm">Only workspace owners and admins can change provider settings. Credentials are never shown here.</p> : <>
          {provider?.providerType === 'openai_compatible' ? <button className="v-link mt-4 text-sm" type="button" disabled={busy} onClick={() => void act('remove')}>Remove external provider and switch to local</button> : null}
          <div className="mt-6 border-t border-[var(--v-border)] pt-5">
            <h3 className="font-semibold">{provider?.providerType === 'openai_compatible' ? 'Update external provider' : 'Use an external provider'}</h3>
            <p className="v-muted mt-1 text-sm">OpenAI-compatible HTTPS API. Saved keys are write-only; enter a new key to replace one.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">Provider name<input className={inputClass} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your provider" maxLength={80} /></label>
              <label className="text-sm font-medium">Model<input className={inputClass} value={model} onChange={(event) => setModel(event.target.value)} placeholder="Model identifier" maxLength={160} /></label>
            </div>
            <label className="mt-4 block text-sm font-medium">HTTPS endpoint<input className={inputClass} type="url" value={endpoint} onChange={(event) => setEndpoint(event.target.value)} placeholder="https://api.example.com/v1" autoComplete="url" /></label>
            <label className="mt-4 block text-sm font-medium">{provider?.credentialConfigured ? 'Replace API key' : 'API key'}<input className={inputClass} type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="new-password" placeholder={provider?.credentialConfigured ? 'Enter a new key to replace the saved key' : 'Enter API key'} /></label>
            <label className="mt-5 flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /><span>Scope text used for analysis will be sent to this provider.</span></label>
            <div className="mt-5 flex flex-wrap gap-3"><button className="v-button" type="button" disabled={busy || !apiKey || !endpoint || !model} onClick={() => void act('test')}>Test connection</button><button className="v-button" type="button" disabled={busy || !apiKey || !endpoint || !model || !acknowledged} onClick={() => void act('save')}>{provider?.credentialConfigured ? 'Replace API key and save' : 'Save provider'}</button>{provider?.credentialConfigured ? <button className="v-link" type="button" disabled={busy} onClick={() => void act('testSaved')}>Test saved connection</button> : null}</div>
          </div>
        </>}
      </>}
    </>}
    {message ? <p role="status" className="mt-4 text-sm text-[var(--v-accent)]">{message}</p> : null}
    {error ? <p role="alert" className="mt-4 text-sm text-[var(--color-danger)]">{error}</p> : null}
  </section>;
};
