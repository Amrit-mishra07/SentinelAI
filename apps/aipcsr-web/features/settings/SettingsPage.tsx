'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../../components/ui/ThemeProvider';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ErrorState } from '../../components/ui/ErrorState';
import { apiClient } from '../../lib/api-client';
import { mapApiError } from '../../lib/error-mapper';
import { useToast } from '../../hooks/useToast';
import { GitHubConnections, NotificationSettings } from './IntegrationSettings';

interface Integrations { has_github_token: boolean; has_openai_key: boolean }

export function SettingsPage({ callbackStatus }: { callbackStatus?: string }) {
  const { theme, toggleTheme } = useTheme();
  const [integrations, setIntegrations] = useState<Integrations | null>(null);
  const [githubToken, setGithubToken] = useState('');
  const [openAiKey, setOpenAiKey] = useState('');
  const [removeGithub, setRemoveGithub] = useState(false);
  const [removeOpenAi, setRemoveOpenAi] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const load = useCallback(async () => {
    try { setIntegrations((await apiClient.get<Integrations>('/auth/integrations')).data); setError(null); }
    catch (err) { setError(mapApiError(err)); }
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !integrations) return;
    setBusy(true); setError(null);
    const payload: { github_token?: string; openai_api_key?: string } = {};
    if (removeGithub) payload.github_token = ''; else if (githubToken.trim()) payload.github_token = githubToken.trim();
    if (removeOpenAi) payload.openai_api_key = ''; else if (openAiKey.trim()) payload.openai_api_key = openAiKey.trim();
    try {
      const response = await apiClient.put<Integrations>('/auth/integrations', payload);
      setIntegrations(response.data); setGithubToken(''); setOpenAiKey(''); setRemoveGithub(false); setRemoveOpenAi(false);
      toast.success('Integration settings saved.');
    } catch (err) { setError(mapApiError(err)); }
    finally { setBusy(false); }
  };
  return <div className="space-y-6 max-w-3xl"><h1 className="text-2xl font-semibold">Settings</h1><section className="bg-sentinel-panel border border-sentinel-border rounded-lg p-6 space-y-4"><h2 className="text-lg font-medium">Appearance</h2><Button variant="secondary" onClick={toggleTheme}>Switch to {theme === 'dark' ? 'light' : 'dark'} mode</Button></section><section className="bg-sentinel-panel border border-sentinel-border rounded-lg p-6 space-y-4"><h2 className="text-lg font-medium">API integrations</h2><p className="text-sm text-sentinel-text-secondary">Credentials are never returned to the browser. Leave a field blank to keep its current value.</p>{error && <ErrorState description={error} onRetry={load} />}{!integrations ? <p className="text-sm">Loading integration status...</p> : <form onSubmit={save} className="space-y-6"><div className="space-y-3"><label htmlFor="github-token" className="block text-sm font-medium">GitHub personal access token · {integrations.has_github_token ? 'Saved' : 'Not configured'}</label><Input id="github-token" type="password" autoComplete="new-password" placeholder="Enter a new token" value={githubToken} onChange={e=>setGithubToken(e.target.value)} disabled={busy || removeGithub} fullWidth /><p className="text-xs text-sentinel-text-secondary">Used for private repositories and draft patch PRs. Grant access only to repositories you intend to scan.</p>{integrations.has_github_token && <label className="flex gap-2 text-sm"><input type="checkbox" checked={removeGithub} onChange={e=>setRemoveGithub(e.target.checked)} disabled={busy} />Remove saved GitHub token</label>}</div><div className="space-y-3"><label htmlFor="openai-key" className="block text-sm font-medium">OpenAI API key · {integrations.has_openai_key ? 'Saved' : 'No user key configured'}</label><Input id="openai-key" type="password" autoComplete="new-password" placeholder="Enter a new API key" value={openAiKey} onChange={e=>setOpenAiKey(e.target.value)} disabled={busy || removeOpenAi} fullWidth /><p className="text-xs text-sentinel-text-secondary">The worker uses your saved key when present, otherwise the server key if configured. Source context is sent to the AI provider for analysis.</p>{integrations.has_openai_key && <label className="flex gap-2 text-sm"><input type="checkbox" checked={removeOpenAi} onChange={e=>setRemoveOpenAi(e.target.checked)} disabled={busy} />Remove saved OpenAI key</label>}</div><Button type="submit" loading={busy} disabled={!githubToken.trim() && !openAiKey.trim() && !removeGithub && !removeOpenAi}>Save integrations</Button></form>}</section><GitHubConnections callbackStatus={callbackStatus} /><NotificationSettings /></div>;
}
