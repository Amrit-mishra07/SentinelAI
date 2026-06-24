'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useScans } from '@/hooks/useScans';
import { Badge } from '@/components/ui/Badge';
import { formatRelativeTime, formatDuration } from '@/lib/formatters';
import Link from 'next/link';
import { NewScanModal } from './NewScanModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';

export default function ScansPage() {
  const { scans, loading, error, refetch } = useScans();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Scanning' | 'Completed' | 'Failed'>('All');

  const filteredScans = scans.filter(s => {
    if (filter === 'All') return true;
    return s.status.toLowerCase() === filter.toLowerCase();
  });

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-slate-200">Scans</h1>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            + New Scan
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
          <div className="border-b border-slate-800 p-2 flex gap-1 overflow-x-auto">
            {['All', 'Pending', 'Scanning', 'Completed', 'Failed'].map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab as any)}
                className={`px-4 py-2 text-sm font-medium rounded transition-colors whitespace-nowrap ${
                  filter === tab 
                    ? 'bg-slate-800 text-slate-200' 
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-0 overflow-x-auto min-h-[400px]">
            {error && scans.length === 0 ? (
              <div className="p-8">
                <ErrorState description={error} onRetry={refetch} />
              </div>
            ) : loading && scans.length === 0 ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} variant="table-row" />)}
              </div>
            ) : filteredScans.length === 0 ? (
              <EmptyState 
                icon="🔍" 
                title={`No ${filter !== 'All' ? filter.toLowerCase() : ''} scans found`} 
                description={filter === 'All' ? "You haven't run any scans yet." : `There are no scans with status ${filter}.`}
                action={filter === 'All' ? { label: 'Start your first scan', onClick: () => setIsModalOpen(true) } : undefined}
              />
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-3 font-medium">ID</th>
                    <th className="px-6 py-3 font-medium">Repository</th>
                    <th className="px-6 py-3 font-medium">Branch</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Vulnerabilities</th>
                    <th className="px-6 py-3 font-medium">Severity</th>
                    <th className="px-6 py-3 font-medium">Created</th>
                    <th className="px-6 py-3 font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredScans.map((scan) => (
                    <tr key={scan.id} className="hover:bg-slate-800/20 transition-colors group">
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">
                        <Link href={`/scans/${scan.id}`} className="hover:text-indigo-400">{scan.id.substring(0, 8)}</Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/scans/${scan.id}`} className="font-medium text-slate-200 group-hover:text-indigo-400 transition-colors">
                          {scan.repository_name || 'unknown-repo'}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs">{scan.branch}</td>
                      <td className="px-6 py-4">
                        <Badge variant={scan.status}>{scan.status}</Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{scan.vulnerabilities_count ?? '—'}</td>
                      <td className="px-6 py-4">
                        {scan.severity ? <Badge variant={scan.severity}>{scan.severity}</Badge> : <span className="text-slate-500">—</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-400">{formatRelativeTime(scan.created_at)}</td>
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                        {formatDuration(scan.started_at || scan.created_at, scan.completed_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Pagination (dummy UI for now) */}
          {!loading && filteredScans.length > 0 && (
            <div className="p-4 border-t border-slate-800 flex items-center justify-between text-sm text-slate-400">
              <div>Showing <span className="font-medium text-slate-200">1</span> to <span className="font-medium text-slate-200">{filteredScans.length}</span> of <span className="font-medium text-slate-200">{filteredScans.length}</span> results</div>
              <div className="flex gap-2">
                <button disabled className="px-3 py-1 border border-slate-700 rounded text-slate-500 bg-slate-800/50 cursor-not-allowed">Previous</button>
                <button disabled className="px-3 py-1 border border-slate-700 rounded text-slate-500 bg-slate-800/50 cursor-not-allowed">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <NewScanModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onScanCreated={refetch} />
    </AppShell>
  );
}
