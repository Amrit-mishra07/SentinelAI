'use client';

import React, { useState, useEffect } from 'react';
import { RiskGauge } from './RiskGauge';
import { MetricCard } from '../../dashboard/MetricCard';
import { VulnerabilityList } from '../../scans/[scanId]/VulnerabilityList';
import { SEVERITY_COLORS } from '../../../lib/constants';
import { computeRiskScore } from '../../../lib/formatters';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../hooks/useToast';
import { apiClient } from '../../../lib/api-client';
import { Scan, Vulnerability, SeverityCounts } from '../../../types';

interface ReportPageProps {
  scanId: string;
}

export const ReportPage: React.FC<ReportPageProps> = ({ scanId }) => {
  const [scan, setScan] = useState<Scan | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const scanRes = await apiClient.get(`/scan/${scanId}`);
        setScan(scanRes.data);
        
        const reportRes = await apiClient.get(`/report/${scanId}`);
        if (reportRes.data && reportRes.data.vulnerabilities) {
          setVulnerabilities(reportRes.data.vulnerabilities);
        }
      } catch (err) {
        toast.error('Failed to load report data');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [scanId, toast]);

  const severityCounts: SeverityCounts = {
    critical: vulnerabilities.filter(v => v.severity === 'critical').length,
    high: vulnerabilities.filter(v => v.severity === 'high').length,
    medium: vulnerabilities.filter(v => v.severity === 'medium').length,
    low: vulnerabilities.filter(v => v.severity === 'low').length,
  };
  
  const riskScore = computeRiskScore(severityCounts);

  const handleDownload = async () => {
    toast.info('Preparing report for download...');
    try {
      const response = await apiClient.get(`/report/${scanId}/download`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SentinelAI_Report_${scanId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Report downloaded successfully');
    } catch (err) {
      toast.error('Failed to download report PDF');
    }
  };

  if (loading || !scan) {
    return <div className="p-12 text-center text-sentinel-text-secondary">Loading report...</div>;
  }

  return (
    <div className="space-y-8 animate-slide-in-right max-w-5xl mx-auto pb-12" style={{ animationDuration: '0.4s' }}>
      
      {/* Action Bar (hidden in print) */}
      <div className="flex justify-between items-center no-print">
        <h1 className="text-2xl font-semibold text-sentinel-text-primary">Executive Summary</h1>
        <div className="flex space-x-3">
          <Button variant="secondary" onClick={() => window.print()} leftIcon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>}>
            Print
          </Button>
          <Button variant="primary" onClick={handleDownload} leftIcon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}>
            Download PDF
          </Button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-sentinel-panel border border-sentinel-border rounded-lg p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
          
          <div className="flex-1 space-y-2">
            <h2 className="text-[14px] uppercase tracking-wider text-sentinel-text-secondary font-medium">Security Scan Report</h2>
            <div className="text-3xl font-bold text-sentinel-text-primary font-mono tracking-tight pb-2">
              {scan.repository_name}
            </div>
            <div className="text-[15px] text-sentinel-text-secondary">
              Branch: <span className="font-mono text-sentinel-text-primary">{scan.branch}</span>
            </div>
            <div className="text-[15px] text-sentinel-text-secondary">
              Commit: <span className="font-mono text-sentinel-text-primary">{scan.commit_hash?.substring(0,7) || 'N/A'}</span>
            </div>
            <div className="text-[15px] text-sentinel-text-secondary">
              Scan Date: <span className="text-sentinel-text-primary">{scan.completed_at ? new Date(scan.completed_at).toLocaleDateString('en-US', { dateStyle: 'long' }) : '—'}</span>
            </div>
          </div>

          <div className="flex-shrink-0">
            <RiskGauge score={riskScore} />
          </div>

        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          title="Critical"
          value={severityCounts.critical}
          trend={0}
          trendLabel=""
          accentColor={SEVERITY_COLORS.critical}
        />
        <MetricCard
          title="High"
          value={severityCounts.high}
          trend={0}
          trendLabel=""
          accentColor={SEVERITY_COLORS.high}
        />
        <MetricCard
          title="Medium"
          value={severityCounts.medium}
          trend={0}
          trendLabel=""
          accentColor={SEVERITY_COLORS.medium}
        />
        <MetricCard
          title="Low"
          value={severityCounts.low}
          trend={0}
          trendLabel=""
          accentColor={SEVERITY_COLORS.low}
        />
      </div>

      {/* Details */}
      <div className="pt-4">
        <h2 className="text-[18px] font-medium text-sentinel-text-primary mb-4 border-b border-sentinel-border pb-2">
          Detailed Findings
        </h2>
        <VulnerabilityList vulnerabilities={vulnerabilities} />
      </div>

    </div>
  );
};
