import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { providerApi } from '../../api/provider.api';
import { useWorkspaces } from '../../hooks/useWorkspaces';
import { geminiFreeTierModels, providerFromEndpoint, providerPresets, type ProviderID } from './providerPresets';

const inputClass = 'mt-2 block h-11 w-full rounded-lg border border-[var(--v-border)] bg-white px-3 text-sm focus:border-[var(--v-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--v-accent)]';

export const ProviderSettings = () => {
  const { workspaces, isPending: workspacesPending } = useWorkspaces();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [workspaceId, setWorkspaceId] = useState('');
  const [mode, setMode] = useState<'local' | 'online'>('local');
  const [providerId, setProviderId] = useState<ProviderID>('openai');
  const [displayName, setDisplayName] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!savedFeedback) return;
    const timeout = window.setTimeout(() => setSavedFeedback(false), 6000);
    return () => window.clearTimeout(timeout);
  }, [savedFeedback]);
  useEffect(() => {
    const requested = searchParams.get('workspace');
    if (requested && workspaces.some((item) => item._id === requested)) setWorkspaceId(requested);
    else if (workspaces[0]) setWorkspaceId((current) => current || workspaces[0]._id);
  }, [searchParams, workspaces]);
  const workspace = workspaces.find((item) => item._id === workspaceId);
  const canManage = workspace?.role === 'owner' || workspace?.role === 'admin';
  const providerQuery = useQuery({ queryKey: ['provider', workspaceId], queryFn: () => providerApi.get(workspaceId), enabled: Boolean(workspaceId) });
  const provider = providerQuery.data;
  useEffect(() => {
    if (!provider) return;
    const selected = provider.providerId ?? providerFromEndpoint(provider.endpoint);
    setMode(provider.providerType === 'local' ? 'local' : 'online');
    setProviderId(provider.credentialConfigured ? selected : 'openai');
    setDisplayName(provider?.providerType === 'openai_compatible' ? provider.displayName : '');
    setEndpoint(provider?.endpoint ?? providerPresets.openai.endpoint);
    setModel(provider?.model ?? '');
    setApiKey('');
    setAcknowledged(false);
  }, [provider]);

  const resetFeedback = () => { setSavedFeedback(false); setError(''); };
  const selectProvider = (id: ProviderID) => {
    const savedId = provider?.providerId ?? providerFromEndpoint(provider?.endpoint);
    const returnToSaved = provider?.credentialConfigured && id === savedId;
    setProviderId(id);
    setDisplayName(returnToSaved ? provider.displayName : id === 'custom' ? '' : providerPresets[id].name);
    setEndpoint(returnToSaved ? provider.endpoint ?? '' : providerPresets[id].endpoint);
    setModel(returnToSaved ? provider.model ?? '' : '');
    setApiKey('');
    resetFeedback();
  };
  const payload = {
    providerType: 'openai_compatible' as const,
    providerId,
    displayName: providerId === 'custom' ? displayName.trim() : providerPresets[providerId].name,
    endpoint: providerId === 'custom' ? endpoint.trim() : providerPresets[providerId].endpoint,
    model: model.trim(), apiKey, privacyAcknowledged: acknowledged,
  };
  const savedSelectionMatches = Boolean(provider?.credentialConfigured &&
    (provider.providerId ?? providerFromEndpoint(provider.endpoint)) === providerId && provider.endpoint === payload.endpoint &&
    provider.model === payload.model && provider.displayName === payload.displayName);
  const needsNewKey = !savedSelectionMatches;
  const canSaveOnline = Boolean(payload.endpoint && payload.model && payload.displayName &&
    (apiKey ? acknowledged : !needsNewKey));
  const act = async (action: 'save' | 'local' | 'forget') => {
    if (!workspaceId || !canManage) return;
    if (action === 'forget' && !window.confirm('Permanently remove the saved online key and provider settings for this workspace? Local mode will stay active.')) return;
    resetFeedback(); setBusy(true);
    try {
      if (action === 'save') {
        if (!canSaveOnline) { setError(needsNewKey ? 'Enter a key and acknowledge the data transfer before saving.' : 'Complete the provider details before saving.'); return; }
        if (apiKey) await providerApi.save(workspaceId, payload);
        else await providerApi.setMode(workspaceId, 'openai_compatible');
        setApiKey('');
        await queryClient.invalidateQueries({ queryKey: ['provider', workspaceId] });
        await queryClient.invalidateQueries({ queryKey: ['change-readiness'] });
        setSavedFeedback(true);
      } else if (action === 'local') {
        await providerApi.setMode(workspaceId, 'local');
        setApiKey('');
        await queryClient.invalidateQueries({ queryKey: ['provider', workspaceId] });
        await queryClient.invalidateQueries({ queryKey: ['change-readiness'] });
      } else {
        await providerApi.remove(workspaceId);
        setApiKey('');
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
    <p className="v-muted mt-2 text-sm">Choose local analysis or connect an online provider for this workspace. Drift's backend still controls access, scope selection, review, and saving.</p>
    {workspacesPending ? <p role="status" className="v-muted mt-5 text-sm">Loading workspaces…</p> : !workspaces.length ? <p className="v-muted mt-5 text-sm">Create a workspace before configuring analysis.</p> : <>
      <label className="mt-5 block text-sm font-medium">Workspace<select className={inputClass} value={workspaceId} onChange={(event) => { setApiKey(''); setWorkspaceId(event.target.value); resetFeedback(); }}>{workspaces.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
      {providerQuery.isPending ? <p role="status" className="v-muted mt-4 text-sm">Loading provider…</p> : providerQuery.isError ? <p role="alert" className="mt-4 text-sm">Provider settings could not be loaded. <button className="v-link" type="button" onClick={() => void providerQuery.refetch()}>Retry</button></p> : <>
        <p className="mt-5 text-sm"><strong>Currently using:</strong> {provider?.providerType === 'openai_compatible' ? `${provider.displayName} · ${provider.model}` : 'Local model'}</p>
        {provider?.credentialConfigured ? <p className="v-muted mt-2 text-sm">Online key saved securely for {provider.displayName}. {provider.providerType === 'local' ? 'It is paused while local mode is active.' : 'It is active for this workspace.'} Last verified {provider.lastValidatedAt ? new Date(provider.lastValidatedAt).toLocaleString() : 'not recorded'}.</p> : <p className="v-muted mt-2 text-sm">Local mode is selected by default. You can still manage projects and scope without installing a model.</p>}
        {!canManage ? <p className="v-muted mt-3 text-sm">Only workspace owners and admins can change provider settings. Credentials are never shown here.</p> : <>
          <fieldset className="mt-5 grid gap-3 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-semibold">Analysis mode</legend>
            <label className="flex cursor-pointer gap-3 rounded-lg border border-[var(--v-border)] p-4 text-sm"><input type="radio" name="analysis-mode" checked={mode === 'local'} onChange={() => { setMode('local'); setApiKey(''); resetFeedback(); }} /><span><strong>Local model</strong><span className="v-muted mt-1 block">Uses the model on this computer. Your online settings stay saved.</span></span></label>
            <label className="flex cursor-pointer gap-3 rounded-lg border border-[var(--v-border)] p-4 text-sm"><input type="radio" name="analysis-mode" checked={mode === 'online'} onChange={() => { setMode('online'); resetFeedback(); }} /><span><strong>Online provider</strong><span className="v-muted mt-1 block">Uses your key through Drift's backend.</span></span></label>
          </fieldset>
          {mode === 'local' ? <div className="mt-5">
            {provider?.providerType === 'openai_compatible' ? <button className="v-button" type="button" disabled={busy} onClick={() => void act('local')}>{busy ? 'Switching…' : 'Use local model'}</button> : <p className="v-muted text-sm">Local mode is active. Projects and scope still work if the model is unavailable; comparison will show an unavailable state.</p>}
            {provider?.credentialConfigured ? <p className="v-muted mt-3 text-sm">Your saved {provider.displayName} model and encrypted key are kept. Select Online provider to switch back.</p> : null}
            {provider?.credentialConfigured && provider.providerType === 'local' ? <details className="mt-4 text-sm"><summary className="v-muted cursor-pointer">Remove saved online key</summary><p className="v-muted mt-2">This permanently deletes the saved provider settings. Switching modes does not.</p><button className="v-link mt-2" type="button" disabled={busy} onClick={() => void act('forget')}>Forget provider and key</button></details> : null}
          </div> : <div className="mt-6 border-t border-[var(--v-border)] pt-5">
            <h3 className="font-semibold">Connect an online provider</h3>
            <p className="v-muted mt-1 text-sm">Choose who issued your API key. A ChatGPT subscription is separate from an OpenAI API key. Setup tests synthetic text before the key is encrypted and saved; no project text is sent during the test.</p>
            <label className="mt-4 block text-sm font-medium">Provider<select className={inputClass} value={providerId} onChange={(event) => selectProvider(event.target.value as ProviderID)}><option value="openai">OpenAI</option><option value="gemini">Google Gemini</option><option value="deepseek">DeepSeek</option><option value="custom">Other OpenAI-compatible API</option></select></label>
            {providerId === 'custom' ? <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">Provider name<input className={inputClass} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Provider name" maxLength={80} /></label>
              <label className="text-sm font-medium">Public HTTPS base URL<input className={inputClass} type="url" value={endpoint} onChange={(event) => setEndpoint(event.target.value)} placeholder="https://api.example.com/v1" autoComplete="url" /></label>
            </div> : <p className="v-muted mt-3 break-all text-xs">API endpoint: {providerPresets[providerId].endpoint}</p>}
            <label className="mt-4 block text-sm font-medium">Model ID<input className={inputClass} list={providerId === 'gemini' ? 'gemini-free-tier-models' : undefined} value={model} onChange={(event) => setModel(event.target.value)} placeholder={providerPresets[providerId].modelHint} maxLength={160} /></label>
            {providerId === 'gemini' ? <>
              <datalist id="gemini-free-tier-models">{geminiFreeTierModels.map((id) => <option key={id} value={id} />)}</datalist>
              <p className="v-muted mt-2 text-xs">Google lists a Standard API free tier for: {geminiFreeTierModels.map((id, index) => <span key={id}>{index ? ', ' : ''}<button className="v-link" type="button" onClick={() => setModel(id)}>{id}</button></span>)}. Your project may have different access or limits. Google says free-tier content may be used to improve its products; avoid sensitive project text if that is not acceptable.</p>
              <a className="v-link mt-2 inline-block text-xs" href="https://aistudio.google.com/docs/pricing" target="_blank" rel="noopener noreferrer">Check Google's current pricing and limits</a>
            </> : providerPresets[providerId].docs ? <a className="v-link mt-2 inline-block text-xs" href={providerPresets[providerId].docs} target="_blank" rel="noopener noreferrer">Find available model IDs</a> : null}
            <label className="mt-4 block text-sm font-medium">{savedSelectionMatches ? 'Replace saved API key (optional)' : 'API key'}<input className={inputClass} type="password" value={apiKey} onChange={(event) => { setApiKey(event.target.value); resetFeedback(); }} autoComplete="off" spellCheck={false} placeholder={savedSelectionMatches ? 'Leave blank to keep the saved key' : 'Enter API key'} /></label>
            {savedSelectionMatches ? <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-700 text-xs text-white">✓</span><span>API key saved securely. {provider?.providerType === 'local' ? 'Currently paused; it will be tested again when you save.' : 'Active for this workspace.'} The key itself cannot be displayed.</span></div> : <p className="v-muted mt-2 text-xs">No key saved for these provider details yet.</p>}
            <p className="v-muted mt-2 text-xs">Drift encrypts the key in the workspace database and never returns it to the browser. Use HTTPS if you access Drift from another computer.</p>
            <label className="mt-5 flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /><span>The selected agreed requirement and new client input used for analysis will be sent to this provider.</span></label>
            <button className={savedFeedback || (savedSelectionMatches && provider?.providerType === 'openai_compatible' && !apiKey) ? 'mt-5 rounded-lg border border-emerald-300 bg-emerald-100 px-5 py-3 text-sm font-semibold text-emerald-900' : 'v-button mt-5'} type="button" disabled={busy || !canSaveOnline || (savedSelectionMatches && provider?.providerType === 'openai_compatible' && !apiKey)} onClick={() => void act('save')}>{busy ? <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />Testing connection…</span> : savedFeedback || (savedSelectionMatches && provider?.providerType === 'openai_compatible' && !apiKey) ? '✓ Connected and saved' : 'Save provider'}</button>
            <p className="v-muted mt-3 text-xs">Saving tests the connection before activating it. If the test fails, the current provider stays active.</p>
          </div>}
        </>}
      </>}
    </>}
    {error ? <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">{error}</p> : null}
  </section>;
};
