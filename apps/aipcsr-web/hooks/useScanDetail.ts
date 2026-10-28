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
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : '') || 'Failed to fetch scan detail');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void Promise.resolve().then(fetchScan);
  }, [fetchScan]);

  const isActive = useMemo(() => !!scan && (scan.status === 'pending' || scan.status === 'scanning'), [scan]);
  usePolling(fetchScan, POLLING_INTERVAL, isActive);

  return { scan, loading, error, refetch: fetchScan };
}
