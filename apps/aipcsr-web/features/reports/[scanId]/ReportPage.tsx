'use client';

import { useState } from 'react';
import { RiskGauge } from './RiskGauge';
import { MetricCard } from '../../dashboard/MetricCard';
import { VulnerabilityList } from '../../scans/[scanId]/VulnerabilityList';
import { SEVERITY_COLORS } from '../../../lib/constants';
import { computeRiskScore } from '../../../lib/formatters';
import { Button } from '../../../components/ui/Button';
import { ErrorState } from '../../../components/ui/ErrorState';
import { useToast } from '../../../hooks/useToast';
import { apiClient } from '../../../lib/api-client';
import { useReport } from '../../../hooks/useReport';
import { useScanDetail } from '../../../hooks/useScanDetail';
import { mapApiError } from '../../../lib/error-mapper';
import { SeverityLevel } from '../../../types';

export function ReportPage({ scanId }: { scanId: string }) {
  const { scan, loading: loadingScan, error: scanError, refetch: refetchScan } = useScanDetail(scanId);
  const { report, loading, error, refetch, hasMore, loadMore, loadingMore } = useReport(scanId, scan?.status !== 'failed');
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();
  const download = async () => {
    if (!report?.pdf_ready || downloading) return;
    setDownloading(true);
    try {
      const { data } = await apiClient.get<Blob>(`/report/${scanId}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url; link.download = `SentinelAI_Report_${scanId}.pdf`; link.click();
      URL.revokeObjectURL(url);
    } catch (err) { toast.error(mapApiError(err)); }
    finally { setDownloading(false); }
  };
  if (scanError) return <ErrorState description={scanError} onRetry={refetchScan} />;
  if (error) return <ErrorState description={error} onRetry={refetch} />;
  if (loading || loadingScan) return <p className="p-12 text-sentinel-text-secondary">Loading report...</p>;
  if (!report) return <ErrorState title="Report not ready" description={scan?.error_message || 'The scan has not generated a report yet.'} onRetry={refetch} />;
  const counts = report.severity_counts || { critical: 0, high: 0, medium: 0, low: 0 };
  return <div className="space-y-6 max-w-5xl mx-auto pb-12">
    <div className="flex flex-wrap gap-3 items-center justify-between no-print"><h1 className="text-2xl font-semibold">Security report</h1><div className="flex gap-3"><Button variant="secondary" onClick={() => window.print()}>Print</Button><Button onClick={download} disabled={!report.pdf_ready} loading={downloading}>Download PDF</Button></div></div>
    {!report.pdf_ready && <p role="status" className="text-sm text-sentinel-text-secondary">{report.status === 'failed' ? `Report generation failed: ${report.error_message || 'Please contact the administrator.'}` : 'The PDF is still being generated. Findings are available below.'}</p>}
    <div className="bg-sentinel-panel border border-sentinel-border rounded-lg p-8 flex flex-wrap justify-between items-center gap-6"><div className="space-y-3"><h2 className="text-xl font-mono">{scan?.repository_name}</h2><p className="text-sm">Branch: {scan?.branch}</p><p className="font-mono text-xs break-all">Commit: {scan?.commit_hash || 'Unavailable'}</p><p className="text-sm">{report.vulnerabilities_count} findings across all pages</p></div><RiskGauge score={computeRiskScore(counts)} /></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{(['critical','high','medium','low'] as SeverityLevel[]).map(level => <MetricCard key={level} title={level.charAt(0).toUpperCase()+level.slice(1)} value={counts[level]} trend={0} trendLabel="" accentColor={SEVERITY_COLORS[level]} />)}</div>
    <VulnerabilityList vulnerabilities={report.vulnerabilities || []} severityCounts={counts} hasMore={hasMore} onLoadMore={loadMore} loadingMore={loadingMore} onChange={refetch} />
  </div>;
}
