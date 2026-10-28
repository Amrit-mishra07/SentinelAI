'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ScanTerminal } from './ScanTerminal';
import { VulnerabilityList } from './VulnerabilityList';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { ErrorState } from '../../../components/ui/ErrorState';
import { useScanDetail } from '../../../hooks/useScanDetail';
import { useReport } from '../../../hooks/useReport';
import { apiClient } from '../../../lib/api-client';
import { mapApiError } from '../../../lib/error-mapper';
import { formatRelative, formatDuration } from '../../../lib/formatters';
import { useRouter } from 'next/navigation';

export function ScanDetailPage({ scanId }: { scanId: string }) {
  const { scan, loading, error, refetch } = useScanDetail(scanId);
  const { report, error: reportError, refetch: refreshReport, hasMore, loadMore, loadingMore } = useReport(scanId, scan?.status !== 'failed');
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const router = useRouter();
  useEffect(() => { if (scan?.status === 'completed') void Promise.resolve().then(refreshReport); }, [scan?.status, refreshReport]);
  const retryScan = async () => {
    if (!scan || retrying) return;
    setRetrying(true); setRetryError(null);
    try {
      const { data } = await apiClient.post<{ id: string }>('/scan/create', { repository: scan.repository_id, branch: scan.branch });
      router.push(`/scans/${data.id}`);
    } catch (err) { setRetryError(mapApiError(err)); }
    finally { setRetrying(false); }
  };
  if (error && !scan) return <ErrorState description={error} onRetry={refetch} />;
  if (loading || !scan) return <p className="p-12 text-sentinel-text-secondary">Loading scan...</p>;
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link href="/scans" className="text-sm text-sentinel-accent">← Scans</Link>
      {error && <ErrorState description={error} onRetry={refetch} />}
      <div className="bg-sentinel-panel border border-sentinel-border rounded-lg p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-4"><h1 className="text-2xl font-semibold font-mono">{scan.repository_name}</h1><Badge variant={scan.status} pulse={scan.status === 'scanning'} /></div>
        <p className="text-sm text-sentinel-text-secondary">Branch: <span className="font-mono">{scan.branch}</span> · Created {formatRelative(scan.created_at)} · Duration {scan.started_at ? formatDuration(scan.started_at, scan.completed_at) : '—'}</p>
        {scan.commit_hash && <p className="font-mono text-xs break-all">Commit: {scan.commit_hash}</p>}
        {scan.status === 'completed' && <Link href={`/reports/${scan.id}`} className="inline-block text-sm text-sentinel-accent">View full report →</Link>}
      </div>
      <ScanTerminal scan={scan} />
      {scan.status === 'failed' && <div className="space-y-3"><Button onClick={retryScan} loading={retrying}>Start a new scan of this branch</Button>{retryError && <p role="alert" className="text-sentinel-critical">{retryError}</p>}</div>}
      {reportError && <ErrorState description={reportError} onRetry={refreshReport} />}
      {report && <VulnerabilityList vulnerabilities={report.vulnerabilities || []} hasMore={hasMore} onLoadMore={loadMore} loadingMore={loadingMore} onChange={refreshReport} severityCounts={report.severity_counts} />}
    </div>
  );
}
