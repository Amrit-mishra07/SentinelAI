import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api-client';
import { Report } from '@/types';
import { usePolling } from './usePolling';
import { mapApiError } from '@/lib/error-mapper';

export function useReport(scanId: string, poll = true) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(50);
  const fetchReport = useCallback(async () => {
    try {
      let combined: Report | null = null;
      for (let skip = 0; skip < loaded.current; skip += 1000) {
        const limit = Math.min(1000, loaded.current - skip);
        const data = await api.get<Report | null>(`/report/${scanId}?skip=${skip}&limit=${limit}`);
        if (!data) { combined = null; break; }
        combined = combined ? { ...data, vulnerabilities: [...(combined.vulnerabilities || []), ...(data.vulnerabilities || [])] } : data;
        if ((combined.vulnerabilities?.length || 0) >= (data.pagination?.total ?? data.vulnerabilities_count)) break;
      }
      setReport(combined);
      setError(null);
    } catch (err: unknown) { setError(mapApiError(err)); }
    finally { setLoading(false); }
  }, [scanId]);
  useEffect(() => { loaded.current = 50; void Promise.resolve().then(() => { setReport(null); setLoading(true); return fetchReport(); }); }, [fetchReport]);
  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    loaded.current += 50;
    await fetchReport();
    setLoadingMore(false);
  };
  const needsUpdates = !report || report.status === 'pending' || !!report.vulnerabilities?.some(v => v.patch_status === 'validating');
  usePolling(fetchReport, 3000, poll && !error && needsUpdates);
  const hasMore = (report?.pagination?.total || 0) > (report?.vulnerabilities?.length || 0);
  return { report, loading, loadingMore, error, refetch: fetchReport, hasMore, loadMore };
}
