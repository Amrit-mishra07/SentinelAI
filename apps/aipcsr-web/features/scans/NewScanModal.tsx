'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../hooks/useToast';
import { apiClient } from '../../lib/api-client';
import { Repository } from '../../types';
import { mapApiError } from '../../lib/error-mapper';

interface Props { isOpen: boolean; onClose: () => void; onSuccess: () => void }

export function NewScanModal({ isOpen, onClose, onSuccess }: Props) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState('');
  const [branch, setBranch] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const load = async () => {
    setLoading(true); setError(null);
    try {
      const { data } = await apiClient.get<Repository[]>('/repository/list');
      setRepositories(data); setSelectedRepoId(data[0]?.id || ''); setBranch(data[0]?.default_branch || '');
    } catch (err) { setError(mapApiError(err)); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (isOpen) void Promise.resolve().then(load); }, [isOpen]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || !selectedRepoId || !branch.trim()) return;
    setSubmitting(true); setError(null);
    try { await apiClient.post('/scan/create', { repository: selectedRepoId, branch: branch.trim() }); toast.success('Scan queued successfully.'); onSuccess(); onClose(); }
    catch (err) { setError(mapApiError(err)); }
    finally { setSubmitting(false); }
  };
  return <Modal isOpen={isOpen} onClose={onClose} title="Start a new scan" preventClose={submitting}>
    {error && <div role="alert" className="mb-4 text-sm text-sentinel-critical">{error}{!repositories.length && <Button type="button" variant="secondary" onClick={load}>Retry</Button>}</div>}
    {loading ? <p className="py-8 text-center">Loading repositories...</p> : !repositories.length ? <div className="space-y-4"><p className="text-sm text-sentinel-text-secondary">Connect a GitHub repository before starting a scan.</p><Link href="/repositories" onClick={onClose} className="text-sentinel-accent">Go to repositories →</Link></div> : <form onSubmit={submit} className="space-y-5"><label className="block text-sm space-y-2"><span>Repository</span><select value={selectedRepoId} disabled={submitting} onChange={e=>{setSelectedRepoId(e.target.value);setBranch(repositories.find(r=>r.id===e.target.value)?.default_branch || '');}} className="block w-full bg-sentinel-inset border border-sentinel-border rounded p-2">{repositories.map(repo=><option key={repo.id} value={repo.id}>{repo.name}</option>)}</select></label><Input label="Branch" value={branch} onChange={e=>setBranch(e.target.value)} required disabled={submitting} fullWidth /><p className="text-xs text-sentinel-text-secondary">The selected branch is cloned and its exact commit is recorded in the report.</p><div className="flex justify-end gap-3"><Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button><Button type="submit" loading={submitting} disabled={!branch.trim()}>Start scan</Button></div></form>}
  </Modal>;
}
