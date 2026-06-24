import { Scan } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { formatRelativeTime, formatDuration } from '@/lib/formatters';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/EmptyState';

export function RecentScansTable({ scans }: { scans: Scan[] }) {
  if (!scans || scans.length === 0) {
    return (
      <EmptyState 
        icon="🔍" 
        title="No recent scans" 
        description="Connect a repository and initiate your first security scan."
      />
    );
  }

  return (
    <table className="w-full text-left text-sm whitespace-nowrap">
      <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-800">
        <tr>
          <th className="px-6 py-3 font-medium">Repository</th>
          <th className="px-6 py-3 font-medium">Branch</th>
          <th className="px-6 py-3 font-medium">Status</th>
          <th className="px-6 py-3 font-medium">Started</th>
          <th className="px-6 py-3 font-medium">Duration</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-800/50">
        {scans.map((scan) => (
          <tr key={scan.id} className="hover:bg-slate-800/20 transition-colors group">
            <td className="px-6 py-4">
              <Link href={`/scans/${scan.id}`} className="font-medium text-indigo-400 group-hover:text-indigo-300">
                {scan.repository_name || 'unknown-repo'}
              </Link>
            </td>
            <td className="px-6 py-4 text-slate-300 font-mono text-xs">{scan.branch}</td>
            <td className="px-6 py-4">
              <Badge variant={scan.status}>{scan.status}</Badge>
            </td>
            <td className="px-6 py-4 text-slate-400">{formatRelativeTime(scan.created_at)}</td>
            <td className="px-6 py-4 text-slate-400 font-mono text-xs">
              {formatDuration(scan.started_at || scan.created_at, scan.completed_at)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
