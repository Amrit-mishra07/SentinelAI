'use client';

import { useCallback, useEffect, useState } from 'react';
import { Vulnerability, PatchStatus } from '../../types';
import { VulnerabilityList } from '../scans/[scanId]/VulnerabilityList';
import { api } from '../../lib/api-client';
import { mapApiError } from '../../lib/error-mapper';
import { ErrorState } from '../../components/ui/ErrorState';
import { usePolling } from '../../hooks/usePolling';

export function PatchesPage() {
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | PatchStatus>('all');
  const fetchPatches = useCallback(async () => {
    try { setVulnerabilities((await api.get<Vulnerability[]>('/report/vulnerabilities/list')).filter(v => !!v.ai_patch || !!v.patch_error || !!v.pr_url)); setError(null); }
    catch (err) { setError(mapApiError(err)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void Promise.resolve().then(fetchPatches); }, [fetchPatches]);
  usePolling(fetchPatches, 3000, vulnerabilities.some(v => v.patch_status === 'validating'));
  const tabs: { value: 'all' | PatchStatus; label: string }[] = [{value:'all',label:'All'},{value:'pending',label:'Proposed'},{value:'validating',label:'Validating'},{value:'pr_opened',label:'PR opened'},{value:'failed',label:'Failed'},{value:'rejected',label:'Dismissed'}];
  return <div className="space-y-6"><h1 className="text-2xl font-semibold">AI patch suggestions</h1><p className="text-sm text-sentinel-text-secondary">Suggestions are validated before a draft pull request is opened. A PR still requires human review and merge.</p>{error && <ErrorState description={error} onRetry={fetchPatches} />}<div className="flex flex-wrap gap-2">{tabs.map(tab => <button key={tab.value} onClick={()=>setFilter(tab.value)} className={`px-3 py-2 text-sm rounded border ${filter === tab.value ? 'border-sentinel-accent text-sentinel-accent' : 'border-sentinel-border text-sentinel-text-secondary'}`}>{tab.label}</button>)}</div>{loading ? <p>Loading patch suggestions...</p> : <VulnerabilityList vulnerabilities={vulnerabilities.filter(v => filter === 'all' || v.patch_status === filter)} onChange={fetchPatches} />}</div>;
}
