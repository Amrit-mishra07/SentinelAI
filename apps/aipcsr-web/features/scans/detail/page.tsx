'use client';

import { AppShell } from '@/components/layout/AppShell';
import { useScanDetail } from '@/hooks/useScanDetail';
import { ScanProgress } from './ScanProgress';
import { Badge } from '@/components/ui/Badge';
import { formatDateTime } from '@/lib/formatters';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';

export default function ScanDetailPage({ params }: { params: { id: string } }) {
  const { scan, loading, error, refetch } = useScanDetail(params.id);

  if (loading && !scan) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton variant="text" className="h-8 w-64" />
          <Skeleton variant="card" className="h-48" />
          <div className="grid grid-cols-2 gap-6">
            <Skeleton variant="card" className="h-32" />
            <Skeleton variant="card" className="h-32" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !scan) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto pt-10">
          <ErrorState title="Scan not found" description={error || 'The scan could not be loaded.'} onRetry={refetch} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-200 flex items-center gap-3">
              Scan {scan.id.substring(0, 8)}
              <Badge variant={scan.status}>{scan.status}</Badge>
            </h1>
            <p className="text-slate-400 mt-1 text-sm flex items-center gap-2">
              <span className="font-mono text-indigo-400">{scan.repository_name || scan.repository_id}</span>
              <span>•</span>
              <span className="font-mono">{scan.branch}</span>
            </p>
          </div>
          
          {scan.status === 'completed' && (
            <Link 
              href={`/reports/${scan.id}`}
              className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded transition-colors flex items-center gap-2"
            >
              View Report 📄
            </Link>
          )}
        </div>

        <ScanProgress status={scan.status} startedAt={scan.started_at} completedAt={scan.completed_at} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h2 className="text-sm font-medium text-slate-400 mb-4">Scan Details</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Created</dt>
                <dd className="text-slate-200">{formatDateTime(scan.created_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Started</dt>
                <dd className="text-slate-200">{formatDateTime(scan.started_at || '')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Completed</dt>
                <dd className="text-slate-200">{formatDateTime(scan.completed_at || '')}</dd>
              </div>
              <div className="flex justify-between pt-3 border-t border-slate-800">
                <dt className="text-slate-500">Commit Hash</dt>
                <dd className="text-slate-200 font-mono">{scan.commit_hash ? scan.commit_hash.substring(0, 7) : '—'}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h2 className="text-sm font-medium text-slate-400 mb-4">Results Summary</h2>
            {scan.status === 'completed' ? (
              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <div className="text-4xl font-bold text-slate-200 mb-1">{scan.vulnerabilities_count || 0}</div>
                  <div className="text-slate-500 text-sm">Vulnerabilities Found</div>
                </div>
                {scan.severity && (
                  <div className="w-24 h-24 rounded-full border-4 border-slate-800 flex items-center justify-center">
                    <div className="text-center">
                      <Badge variant={scan.severity}>{scan.severity}</Badge>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">
                Results will appear here when scan completes
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
