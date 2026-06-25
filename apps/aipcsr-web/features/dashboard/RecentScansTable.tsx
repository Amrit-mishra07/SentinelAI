'use client';

import React from 'react';
import Link from 'next/link';
import { Scan } from '../../types';
import { formatRelative, formatDuration } from '../../lib/formatters';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';

interface RecentScansTableProps {
  scans: Scan[];
}

export const RecentScansTable: React.FC<RecentScansTableProps> = ({ scans }) => {
  if (!scans || scans.length === 0) {
    return (
      <EmptyState 
        icon={<svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
        title="No recent scans"
        description="Run a new scan to see it here."
      />
    );
  }

  // Show up to 8 rows
  const displayScans = scans.slice(0, 8);

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="border-b border-sentinel-border text-[14px] font-medium text-sentinel-text-secondary">
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Repository</th>
              <th className="px-4 py-3 font-medium">Branch</th>
              <th className="px-4 py-3 font-medium">Risk</th>
              <th className="px-4 py-3 font-medium text-right">Time</th>
            </tr>
          </thead>
          <tbody>
            {displayScans.map((scan) => (
              <tr 
                key={scan.id} 
                className="border-b border-sentinel-border/50 hover:bg-sentinel-elevated transition-colors group cursor-pointer"
                onClick={() => window.location.href = `/scans/${scan.id}`}
              >
                <td className="px-4 py-3">
                  <Badge variant={scan.status} pulse={scan.status === 'scanning'} />
                </td>
                <td className="px-4 py-3 font-mono text-[13px] text-sentinel-text-primary">
                  {scan.repository_name}
                </td>
                <td className="px-4 py-3 text-[13px] text-sentinel-text-secondary flex items-center">
                  <svg className="w-3 h-3 mr-1.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                  {scan.branch}
                </td>
                <td className="px-4 py-3">
                  {scan.status === 'completed' ? (
                    scan.severity ? <Badge variant={scan.severity} /> : <Badge variant="clean" />
                  ) : (
                    <span className="text-sentinel-text-tertiary">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-[12px] text-sentinel-text-secondary">
                  {formatRelative(scan.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {scans.length > 8 && (
        <div className="pt-4 text-right">
          <Link href="/scans" className="text-[13px] text-sentinel-accent hover:text-blue-400 font-medium transition-colors">
            View all scans →
          </Link>
        </div>
      )}
    </div>
  );
};
