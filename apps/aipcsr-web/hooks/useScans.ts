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
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : '') || 'Failed to fetch scans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchScans);
  }, [fetchScans]);

  const hasActiveScans = useMemo(() => scans.some(s => s.status === 'pending' || s.status === 'scanning'), [scans]);
  usePolling(fetchScans, POLLING_INTERVAL, hasActiveScans);

  return { scans, loading, error, refetch: fetchScans };
}
