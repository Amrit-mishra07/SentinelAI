'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { apiClient } from '../../lib/api-client';
import { mapApiError } from '../../lib/error-mapper';
import { Repository } from '../../types';
import { usePolling } from '../../hooks/usePolling';

interface Connection {
  id: string;
  repository_id: string;
  active: boolean;
  webhook_url: string;
}
interface CreatedConnection extends Connection { webhook_secret: string; instructions: string }
interface Preferences { email_enabled: boolean; high_severity_only: boolean; delivery_available: boolean }
interface Delivery { id: string; event_type: string; status: string; attempts: number; error_message?: string | null; created_at: string }

export function GitHubConnections({ callbackStatus }: { callbackStatus?: string }) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [created, setCreated] = useState<CreatedConnection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const [repos, configured] = await Promise.all([
        apiClient.get<Repository[]>('/repository/list'),
        apiClient.get<Connection[]>('/integrations/github/repositories'),
      ]);
      setRepositories(repos.data); setConnections(configured.data); setError(null);
    } catch (err) { setError(mapApiError(err)); }
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  const connectAccount = async () => {
    setBusy('oauth'); setError(null);
    try {
      const { data } = await apiClient.get<{ authorization_url: string }>('/integrations/github/oauth/start');
      const target = new URL(data.authorization_url);
      if (target.protocol !== 'https:' || target.hostname !== 'github.com') throw new Error('The server returned an invalid GitHub authorization URL.');
      window.location.assign(target.href);
    } catch (err) { setError(mapApiError(err)); setBusy(null); }
  };
  const configure = async (id: string, active: boolean) => {
    setBusy(id); setError(null); setCreated(null);
    try {
      if (active) await apiClient.delete('/integrations/github/repositories/' + id);
      else {
        const { data } = await apiClient.post<CreatedConnection>('/integrations/github/repositories/' + id);
        setCreated(data);
      }
      await load();
    } catch (err) { setError(mapApiError(err)); }
    finally { setBusy(null); }
  };
  return <section className="bg-sentinel-panel border border-sentinel-border rounded-lg p-6 space-y-4">
    <h2 className="text-lg font-medium">Continuous GitHub review</h2>
    {callbackStatus && <p role="status" className="text-sm">{callbackStatus === 'connected' ? 'GitHub account connected.' : callbackStatus === 'denied' ? 'GitHub authorization was cancelled.' : 'GitHub authorization failed. Please reconnect.'}</p>}
    <p className="text-sm text-sentinel-text-secondary">Authorize GitHub through the configured OAuth app, or use your saved personal access token. Repository administrator access is required to configure signed events.</p>
    <Button variant="secondary" onClick={connectAccount} loading={busy === 'oauth'} disabled={!!busy}>Connect GitHub account</Button>
    {error && <ErrorState description={error} onRetry={load} />}
    {created && <div className="border border-sentinel-accent rounded-md p-4 space-y-3">
      <p className="text-sm font-medium">Add this webhook in your GitHub repository settings</p>
      <p className="text-xs text-sentinel-text-secondary">The secret is shown once. Keep it private and select application/json with push and pull request events. Fork pull requests are not scanned automatically.</p>
      <label className="block text-xs">Payload URL<input readOnly value={created.webhook_url} className="mt-1 w-full bg-sentinel-inset border border-sentinel-border rounded p-2 text-xs" /></label>
      <label className="block text-xs">Webhook secret<input readOnly value={created.webhook_secret} className="mt-1 w-full bg-sentinel-inset border border-sentinel-border rounded p-2 text-xs font-mono" /></label>
      <Button size="sm" variant="ghost" onClick={() => setCreated(null)}>Hide secret</Button>
    </div>}
    {repositories.length === 0 ? <p className="text-sm text-sentinel-text-secondary">Connect a repository first to enable automatic reviews.</p> : <ul className="divide-y divide-sentinel-border">
      {repositories.map(repo => {
        const connection = connections.find(item => item.repository_id === repo.id && item.active);
        return <li key={repo.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-sm font-medium">{repo.name}</p><p className="text-xs text-sentinel-text-secondary">{connection ? 'Signed event receiver enabled; configure the webhook in GitHub.' : 'Manual scans only'}</p></div>
          <Button size="sm" variant={connection ? 'ghost' : 'secondary'} loading={busy === repo.id} disabled={!!busy} onClick={() => configure(repo.id, !!connection)}>{connection ? 'Disable receiver' : 'Configure webhook'}</Button>
        </li>;
      })}
    </ul>}
    <p className="text-xs text-sentinel-text-secondary">Disabling a receiver stops event processing here. Remove its webhook in GitHub separately.</p>
  </section>;
}

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmRetry, setConfirmRetry] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const load = useCallback(async () => {
    try {
      const [prefs, outbox] = await Promise.all([
        apiClient.get<Preferences>('/notifications/preferences'),
        apiClient.get<Delivery[]>('/notifications/outbox?limit=20'),
      ]);
      setPreferences(prefs.data); setDeliveries(outbox.data); setError(null);
    } catch (err) { setError(mapApiError(err)); }
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  usePolling(load, 10000, !!preferences?.delivery_available && deliveries.some(item => ['pending', 'sending'].includes(item.status)));
  const save = async () => {
    if (!preferences) return;
    setBusy(true); setSaved(false); setError(null);
    try {
      const { data } = await apiClient.put<Preferences>('/notifications/preferences', {
        email_enabled: preferences.email_enabled, high_severity_only: preferences.high_severity_only,
      });
      setPreferences(data); setSaved(true);
    } catch (err) { setError(mapApiError(err)); }
    finally { setBusy(false); }
  };
  const retry = async (item: Delivery) => {
    if (item.status === 'unknown' && confirmRetry !== item.id) { setConfirmRetry(item.id); return; }
    setBusy(true); setError(null);
    try {
      await apiClient.post('/notifications/outbox/' + item.id + '/retry', { confirm_duplicate_risk: item.status === 'unknown' });
      setConfirmRetry(null); await load();
    } catch (err) { setError(mapApiError(err)); }
    finally { setBusy(false); }
  };
  return <section className="bg-sentinel-panel border border-sentinel-border rounded-lg p-6 space-y-4">
    <h2 className="text-lg font-medium">Email notifications</h2>
    {error && <ErrorState description={error} onRetry={load} />}
    {!preferences ? <p className="text-sm">Loading notification settings...</p> : <>
      <p className="text-sm text-sentinel-text-secondary">{preferences.delivery_available ? 'Email delivery is configured. Notifications are sent to your account email.' : 'Email delivery is not configured on this server. Your preferences are saved, and eligible events remain queued until the provider is configured.'}</p>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={preferences.email_enabled} disabled={busy} onChange={e => { setSaved(false); setPreferences({ ...preferences, email_enabled: e.target.checked }); }} />Email me when scans complete</label>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={preferences.high_severity_only} disabled={busy || !preferences.email_enabled} onChange={e => { setSaved(false); setPreferences({ ...preferences, high_severity_only: e.target.checked }); }} />Only scans with high or critical findings</label>
      <Button onClick={save} loading={busy}>Save notification preferences</Button>
      {saved && <p role="status" className="text-sm">Preferences saved.</p>}
    </>}
    {deliveries.length > 0 && <div className="space-y-3"><h3 className="text-sm font-medium">Recent delivery attempts</h3><ul className="divide-y divide-sentinel-border">{deliveries.map(item => <li key={item.id} className="py-3 space-y-2">
      <p className="text-sm">Scan completed · {item.status} · {item.attempts} attempt(s)</p>
      {item.error_message && <p className="text-xs text-sentinel-text-secondary">{item.error_message}</p>}
      {item.status === 'unknown' && confirmRetry === item.id && <p role="alert" className="text-xs text-sentinel-high">Delivery may already have succeeded. Retrying may send another email. Check your provider first.</p>}
      {['failed', 'unknown'].includes(item.status) && <Button size="sm" variant="secondary" disabled={busy || !preferences?.delivery_available} onClick={() => retry(item)}>{confirmRetry === item.id ? 'Confirm resend despite duplicate risk' : 'Retry delivery'}</Button>}
    </li>)}</ul></div>}
  </section>;
}
