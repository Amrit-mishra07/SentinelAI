import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePolling } from '@/hooks/usePolling';
import { api } from '@/lib/api-client';
import { Scan } from '@/types';
import { POLLING_INTERVAL } from '@/lib/constants';

export function useScanDetail(id: string) {
  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScan = useCallback(async () => {
    try {
      const data = await api.get<Scan>(`/scan/${id}`);
      setScan(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch scan detail');
      // Mock data for development
      setScan({ 
        id, 
        repository_id: 'repo-1', 
        repository_name: 'frontend-monorepo', 
        branch: 'main', 
        commit_hash: '1234abc', 
        status: 'scanning', 
        vulnerabilities_count: 0, 
        severity: undefined, 
        created_at: new Date(Date.now() - 60000).toISOString(), 
        started_at: new Date(Date.now() - 50000).toISOString(), 
        completed_at: null, 
        updated_at: new Date().toISOString() 
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchScan();
  }, [fetchScan]);

  const isActive = useMemo(() => !!scan && (scan.status === 'pending' || scan.status === 'scanning'), [scan]);
  usePolling(fetchScan, POLLING_INTERVAL, isActive);

  return { scan, loading, error, refetch: fetchScan };
}
