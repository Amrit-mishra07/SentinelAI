import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePolling } from '@/hooks/usePolling';
import { api } from '@/lib/api-client';
import { Scan } from '@/types';
import { POLLING_INTERVAL } from '@/lib/constants';

export function useScans() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScans = useCallback(async () => {
    try {
      const data = await api.get<Scan[]>('/scan/list');
      setScans(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch scans');
      // Mock data for development
      setScans([
        { id: 'scan-1', repository_id: 'repo-1', repository_name: 'frontend-monorepo', branch: 'main', commit_hash: '1234abc', status: 'scanning', vulnerabilities_count: 0, severity: undefined, created_at: new Date().toISOString(), started_at: new Date().toISOString(), completed_at: null, updated_at: new Date().toISOString() },
        { id: 'scan-2', repository_id: 'repo-2', repository_name: 'auth-service', branch: 'develop', commit_hash: 'abcdef', status: 'failed', vulnerabilities_count: 0, severity: undefined, created_at: new Date(Date.now() - 86400000).toISOString(), started_at: new Date(Date.now() - 86400000).toISOString(), completed_at: new Date(Date.now() - 86300000).toISOString(), updated_at: new Date(Date.now() - 86300000).toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  const hasActiveScans = useMemo(() => scans.some(s => s.status === 'pending' || s.status === 'scanning'), [scans]);
  usePolling(fetchScans, POLLING_INTERVAL, hasActiveScans);

  return { scans, loading, error, refetch: fetchScans };
}
