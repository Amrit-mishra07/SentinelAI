'use client';

import React from 'react';
import Link from 'next/link';
import { Scan } from '../../types';
import { formatRelative } from '../../lib/formatters';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { GitBranch, FolderGit2, SearchX } from 'lucide-react';
import { motion } from 'framer-motion';

interface RecentScansTableProps {
  scans: Scan[];
}

export const RecentScansTable: React.FC<RecentScansTableProps> = ({ scans }) => {
  if (!scans || scans.length === 0) {
    return (
      <EmptyState 
        icon={<SearchX className="w-12 h-12 text-sentinel-text-tertiary" />}
        title="No recent scans"
        description="Run a new scan to see it here."
      />
    );
  }

  const displayScans = scans.slice(0, 8);

  return (
    <div className="w-full">
      <div className="overflow-x-auto rounded-lg border border-sentinel-border/40 bg-sentinel-inset/30">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="border-b border-sentinel-border/30 text-xs tracking-wider uppercase font-semibold text-sentinel-text-secondary bg-sentinel-panel/50">
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Repository</th>
              <th className="px-5 py-4">Branch</th>
              <th className="px-5 py-4">Risk</th>
              <th className="px-5 py-4 text-right">Time</th>
            </tr>
          </thead>
          <tbody>
            {displayScans.map((scan, i) => (
              <motion.tr 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                key={scan.id} 
                className="border-b border-sentinel-border/30 hover:bg-sentinel-inset/40 transition-colors group cursor-pointer"
                onClick={() => window.location.href = `/scans/${scan.id}`}
              >
                <td className="px-5 py-3">
                  <Badge variant={scan.status} pulse={scan.status === 'scanning'} />
                </td>
                <td className="px-5 py-3 font-mono text-[13px] text-sentinel-text-primary flex items-center mt-0.5">
                  <FolderGit2 className="w-4 h-4 mr-2 text-sentinel-text-secondary" />
                  {scan.repository_name}
                </td>
                <td className="px-5 py-3 text-[13px] text-sentinel-text-secondary">
                  <span className="flex items-center">
                    <GitBranch className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                    {scan.branch}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {scan.status === 'completed' ? (
                    scan.severity ? <Badge variant={scan.severity} /> : <Badge variant="clean" />
                  ) : (
                    <span className="text-sentinel-text-tertiary">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right text-xs text-sentinel-text-secondary">
                  {formatRelative(scan.created_at)}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {scans.length > 8 && (
        <div className="pt-4 text-right">
          <Link href="/scans" className="text-[13px] text-sentinel-accent hover:text-blue-400 font-medium transition-colors inline-flex items-center">
            View all scans <span className="ml-1 text-lg leading-none">→</span>
          </Link>
        </div>
      )}
    </div>
  );
};
