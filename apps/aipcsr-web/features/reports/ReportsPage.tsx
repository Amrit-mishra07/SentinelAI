'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { ErrorState } from '../../components/ui/ErrorState';
import { mapApiError } from '../../lib/error-mapper';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatRelative } from '../../lib/formatters';
import { apiClient } from '../../lib/api-client';
import { Report } from '../../types';
import { SearchX, FolderGit2, FileText } from 'lucide-react';
import { motion } from 'framer-motion';


export const ReportsPage: React.FC = () => {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      const response = await apiClient.get('/report/list/all');
      setReports(response.data);
      setError(null);
    } catch (error) {
      setError(mapApiError(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(fetchReports);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sentinel-text-primary">Reports</h1>
          <p className="text-sm text-sentinel-text-secondary mt-1">
            Download or view security audit summaries and generated security reports.
          </p>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden shadow-xl">
        {error ? (<ErrorState description={error} onRetry={fetchReports} />) : isLoading ? (
          <div className="p-12 text-center text-sentinel-text-secondary">Loading reports...</div>
        ) : reports.length === 0 ? (
          <EmptyState 
            icon={<SearchX className="w-12 h-12 text-sentinel-text-tertiary" />}
            title="No reports generated"
            description="Run a repository security scan first to generate security reports."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-sentinel-border/30 text-xs uppercase tracking-wider font-semibold text-sentinel-text-secondary bg-sentinel-panel/50">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Repository</th>
                  <th className="px-6 py-4">Vulnerabilities</th>
                  <th className="px-6 py-4">Overall Risk</th>
                  <th className="px-6 py-4">Generated At</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report, i) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    key={report.id} 
                    className="border-b border-sentinel-border/30 hover:bg-sentinel-inset/40 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-sentinel-text-secondary">
                        #{report.id.substring(0, 6)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-[13px] text-sentinel-text-primary flex items-center">
                      <FolderGit2 className="w-4 h-4 mr-2 text-sentinel-text-secondary" />
                      {report.repository_name}
                    </td>
                    <td className="px-6 py-4 text-[13px] text-white font-medium">
                      {report.vulnerabilities_count} findings
                    </td>
                    <td className="px-6 py-4">
                      {report.severity ? (
                        <Badge variant={report.severity} size="sm" />
                      ) : (
                        <span className="text-xs text-sentinel-text-secondary">{report.status === 'ready' && report.vulnerabilities_count === 0 ? 'Clean' : 'Unavailable'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-sentinel-text-secondary">
                      {formatRelative(report.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="secondary" 
                        size="sm"
                        leftIcon={<FileText className="w-3.5 h-3.5" />}
                        onClick={() => router.push(`/reports/${report.scan_id}`)}
                      >
                        View Report
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
