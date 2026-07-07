'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ScanTerminal } from './ScanTerminal';
import { VulnerabilityList } from './VulnerabilityList';
import { Scan } from '../../../types';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { mockScans } from '../../../lib/mock-data';
import { mockVulnerabilities } from '../../../lib/mock-vulns';
import { formatRelative, formatDuration, formatCommitHash } from '../../../lib/formatters';

interface ScanDetailPageProps {
  scanId: string;
}

export const ScanDetailPage: React.FC<ScanDetailPageProps> = ({ scanId }) => {
  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);

  // Simulate fetching data and polling state transitions
  useEffect(() => {
    // Initial fetch
    const currentScan = mockScans.find(s => s.id === scanId) || mockScans[0];
    
    // Simulate API delay
    const initialTimer = setTimeout(() => {
      setScan({ ...currentScan });
      setLoading(false);
    }, 600);

    let progressTimer: NodeJS.Timeout | undefined;

    if (currentScan.status === 'pending') {
      progressTimer = setTimeout(() => {
        setScan(prev => prev ? { ...prev, status: 'scanning' } : prev);
        
        // After scanning for a while, transition to completed
        setTimeout(() => {
          setScan(prev => prev ? { ...prev, status: 'completed', vulnerabilities_count: 3, severity: 'critical', completed_at: new Date().toISOString() } : prev);
        }, 8000);
      }, 3000);
    } else if (currentScan.status === 'scanning') {
      progressTimer = setTimeout(() => {
        setScan(prev => prev ? { ...prev, status: 'completed', vulnerabilities_count: 3, severity: 'critical', completed_at: new Date().toISOString() } : prev);
      }, 8000);
    }

    return () => {
      clearTimeout(initialTimer);
      if (progressTimer) clearTimeout(progressTimer);
    };
  }, [scanId]);

  if (loading || !scan) {
    return (
      <div className="space-y-6">
        <div className="h-[100px] w-full bg-sentinel-panel rounded animate-pulse" />
        <div className="h-[400px] w-full bg-[#0d1117] rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-slide-in-right" style={{ animationDuration: '0.4s' }}>
      
      {/* Breadcrumb & Title */}
      <div className="flex items-center space-x-2 text-[13px] text-sentinel-text-secondary mb-2">
        <Link href="/scans" className="hover:text-sentinel-text-primary transition-colors">Scans</Link>
        <span>/</span>
        <span className="text-sentinel-text-primary font-mono">#{scan.id.substring(0, 6)}</span>
      </div>

      {/* Header Card */}
      <div className="bg-sentinel-panel border border-sentinel-border rounded-lg p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          
          <div className="space-y-4 flex-1">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-semibold text-sentinel-text-primary font-mono tracking-tight">
                {scan.repository_name}
              </h1>
              <Badge variant={scan.status} pulse={scan.status === 'scanning'} size="md" />
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-sentinel-text-secondary">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                {scan.branch}
              </div>
              
              {scan.commit_hash && (
                <div className="flex items-center font-mono">
                  <svg className="w-4 h-4 mr-1.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                  {formatCommitHash(scan.commit_hash)}
                </div>
              )}
              
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {scan.started_at ? formatDuration(scan.started_at, scan.completed_at) : '—'}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end space-y-2">
            <span className="text-[12px] uppercase tracking-wide text-sentinel-text-tertiary font-medium">Started</span>
            <span className="text-[13px] text-sentinel-text-primary font-medium">
              {formatRelative(scan.created_at)}
            </span>
            {scan.status === 'completed' && (
              <Button 
                variant="secondary" 
                size="sm"
                className="mt-2"
                onClick={() => window.location.href = `/reports/${scan.id}`}
                leftIcon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
              >
                View Full Report
              </Button>
            )}
          </div>

        </div>
      </div>

      {/* Main Content Area based on Status */}
      <div className="mt-8">
        {scan.status === 'pending' && (
          <div className="flex flex-col items-center justify-center p-12 bg-sentinel-panel border border-sentinel-border rounded-lg shadow-sm min-h-[300px]">
            <div className="text-sentinel-text-tertiary mb-6">
              <svg className="w-16 h-16 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-sentinel-text-primary mb-2">Scan queued</h3>
            <p className="text-sentinel-text-secondary">Waiting for an available runner...</p>
          </div>
        )}

        {scan.status === 'scanning' && (
          <ScanTerminal />
        )}

        {scan.status === 'completed' && (
          <VulnerabilityList vulnerabilities={mockVulnerabilities} />
        )}

        {scan.status === 'failed' && (
          <div className="flex flex-col items-center justify-center p-12 bg-sentinel-panel border border-sentinel-border rounded-lg shadow-sm min-h-[300px]">
            <div className="w-16 h-16 rounded-full bg-sentinel-critical/10 flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-sentinel-critical" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-sentinel-text-primary mb-2">Scan failed</h3>
            <p className="text-sentinel-text-secondary max-w-md text-center mb-6">
              {scan.error_message || 'Common reasons: repository is private, URL is incorrect, or the scanner timed out. Ensure the repository is public.'}
            </p>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Retry scan
            </Button>
          </div>
        )}
      </div>

    </div>
  );
};
