'use client';

import { AppShell } from '@/components/layout/AppShell';
import { useReport } from '@/hooks/useReport';
import { RiskGauge } from './RiskGauge';
import { Badge } from '@/components/ui/Badge';
import { formatFilePath } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { useState } from 'react';
import { SeverityLevel } from '@/types';

export default function ReportDetailPage({ params }: { params: { scanId: string } }) {
  const { report, loading, error, refetch } = useReport(params.scanId);
  const [selectedVulnId, setSelectedVulnId] = useState<string | null>(null);

  if (loading && !report) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton variant="card" className="h-48" />
          <Skeleton variant="chart" className="h-96" />
        </div>
      </AppShell>
    );
  }

  if (error || !report) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto pt-10">
          <ErrorState title="Report not found" description={error || 'The report could not be loaded.'} onRetry={refetch} />
        </div>
      </AppShell>
    );
  }

  // Compute counts
  const counts: Record<SeverityLevel, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  report.vulnerabilities?.forEach(v => {
    if (counts[v.severity] !== undefined) {
      counts[v.severity]++;
    }
  });

  const selectedVuln = report.vulnerabilities?.find(v => v.id === selectedVulnId);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-200 flex items-center gap-3">
              Security Report
              <Badge variant={report.severity}>{report.severity}</Badge>
            </h1>
            <p className="text-slate-400 mt-1 text-sm font-mono">Scan ID: {report.scan_id.substring(0, 8)}</p>
          </div>
          
          <button className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium py-2 px-4 rounded transition-colors flex items-center gap-2">
            Export PDF
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 flex flex-col items-center justify-center">
            <RiskGauge counts={counts} />
          </div>
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-6 flex items-center justify-around">
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-200 mb-1">{report.vulnerabilities_count}</div>
              <div className="text-sm text-slate-500">Total Found</div>
            </div>
            <div className="w-px h-16 bg-slate-800"></div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-500 mb-1">{counts.critical}</div>
              <div className="text-sm text-slate-500">Critical</div>
            </div>
            <div className="w-px h-16 bg-slate-800"></div>
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-500 mb-1">{counts.high}</div>
              <div className="text-sm text-slate-500">High</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0">
              <h2 className="font-medium text-slate-200">Vulnerabilities</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {report.vulnerabilities?.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">No vulnerabilities found. Code is secure.</div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {report.vulnerabilities?.map(vuln => (
                    <button 
                      key={vuln.id}
                      onClick={() => setSelectedVulnId(vuln.id)}
                      className={`w-full text-left p-4 transition-colors ${selectedVulnId === vuln.id ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : 'hover:bg-slate-800/50 border-l-2 border-transparent'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant={vuln.severity} className="mb-2 shrink-0">{vuln.severity}</Badge>
                        <span className="text-xs font-mono text-slate-500 truncate">{vuln.rule_id}</span>
                      </div>
                      <div className="text-sm font-medium text-slate-300 line-clamp-2">{vuln.message}</div>
                      <div className="text-xs text-slate-500 font-mono mt-2 truncate" title={vuln.file_path}>
                        {formatFilePath(vuln.file_path)}:{vuln.line_number || '?'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg flex flex-col h-[600px]">
            {selectedVuln ? (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="p-6 border-b border-slate-800 flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-medium text-slate-200 mb-2">{selectedVuln.message}</h2>
                    <div className="flex items-center gap-3 text-sm">
                      <Badge variant={selectedVuln.severity}>{selectedVuln.severity}</Badge>
                      <span className="font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded">Rule: {selectedVuln.rule_id}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider">Location</h3>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-sm text-slate-300">
                      {selectedVuln.file_path} <span className="text-slate-500">Line {selectedVuln.line_number || 'Unknown'}</span>
                    </div>
                  </div>

                  {selectedVuln.ai_analysis && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                        <span className="text-indigo-400">⚡</span> AI Analysis
                      </h3>
                      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-5 text-sm text-slate-300 leading-relaxed">
                        {selectedVuln.ai_analysis}
                      </div>
                    </div>
                  )}

                  {selectedVuln.ai_patch && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                        <span className="text-emerald-400">✨</span> Suggested Patch
                      </h3>
                      <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                        <div className="bg-slate-800 px-4 py-2 text-xs font-mono text-slate-400 flex justify-between items-center">
                          diff
                          <button className="text-indigo-400 hover:text-indigo-300">Copy</button>
                        </div>
                        <pre className="p-4 text-sm font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                          {selectedVuln.ai_patch}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <div className="text-4xl mb-4">👈</div>
                <p>Select a vulnerability from the list to view details, AI analysis, and remediation patches.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
