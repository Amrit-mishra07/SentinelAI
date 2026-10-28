'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { MetricCard } from './MetricCard';
import { RecentScansTable } from './RecentScansTable';
import { RepositoryHealthList } from './RepositoryHealthList';
import { AIActivityFeed } from './AIActivityFeed';
import { SEVERITY_COLORS } from '../../lib/constants';
import { apiClient } from '../../lib/api-client';
import { ErrorState } from '../../components/ui/ErrorState';
import { mapApiError } from '../../lib/error-mapper';
import { Scan, Repository, DashboardMetrics, Vulnerability } from '../../types';

// Dynamically import Recharts components to reduce initial main bundle size
const SeverityBars = dynamic(() => import('../../components/charts/SeverityBars').then(mod => mod.SeverityBars), { 
  ssr: false, 
  loading: () => <div className="animate-pulse bg-white/5 w-full h-full rounded" /> 
});
const DonutChart = dynamic(() => import('../../components/charts/DonutChart').then(mod => mod.DonutChart), { 
  ssr: false, 
  loading: () => <div className="w-[160px] h-[160px] rounded-full border-[14px] border-white/5 animate-pulse" /> 
});
const ScanTimeline = dynamic(() => import('../../components/charts/ScanTimeline').then(mod => mod.ScanTimeline), { 
  ssr: false, 
  loading: () => <div className="animate-pulse bg-white/5 w-full h-full rounded" /> 
});

export const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [scans, setScans] = useState<Scan[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardMetrics | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<Vulnerability[]>([]);
  const fetchData = useCallback(async () => {
      try {
        const [scansRes, reposRes, metricsRes, activityRes] = await Promise.all([
          apiClient.get<Scan[]>('/scan/list'),
          apiClient.get<Repository[]>('/repository/list'),
          apiClient.get<DashboardMetrics>('/dashboard/metrics'),
          apiClient.get<Vulnerability[]>('/report/vulnerabilities/list')
        ]);
        setScans(scansRes.data);
        setRepositories(reposRes.data);
        setDashboardData(metricsRes.data);
        setActivity(activityRes.data.filter(v => !!v.ai_status).slice(0, 10));
        setError(null);
      } catch (error) {
        setError(mapApiError(error));
      } finally {
        setLoading(false);
      }
  }, []);
  useEffect(() => { void Promise.resolve().then(fetchData); }, [fetchData]);

  const recentScans = scans.slice(0, 5);
  
  // Use backend metrics or fallback to defaults
  const metrics = dashboardData?.metrics || {
    total_vulnerabilities: 0,
    critical_count: 0,
    scans_today: 0,
    patched_percentage: 0
  };
  
  const severity_distribution = dashboardData?.severity_distribution || {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };

  const timeline = (dashboardData?.timeline || []).map(day => ({ ...day, severity: day.severity ?? null }));

  if (error) return <ErrorState description={error} onRetry={fetchData} />;

  return (
    <div className="space-y-8 animate-slide-in-right" style={{ animationDuration: '0.4s' }}>
      
      {/* Row 1 — Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          title="Total Vulns"
          value={metrics.total_vulnerabilities}
          trend={dashboardData?.trends?.total_vulnerabilities ?? 0}
          trendLabel="vs yesterday"
          accentColor="var(--color-bg-inset)"
          loading={loading}
        />
        <MetricCard
          title="Critical"
          value={metrics.critical_count}
          trend={dashboardData?.trends?.critical_count ?? 0}
          trendLabel="vs yesterday"
          accentColor={SEVERITY_COLORS.critical}
          loading={loading}
        />
        <MetricCard
          title="Scans Today"
          value={metrics.scans_today}
          trend={dashboardData?.trends?.scans_today ?? 0}
          trendLabel="vs yesterday"
          accentColor="var(--color-accent)"
          trendInverse
          loading={loading}
        />
        <MetricCard
          title="Draft PR coverage"
          value={metrics.patched_percentage}
          suffix="%"
          trend={dashboardData?.trends?.patched_percentage ?? 0}
          trendLabel="vs yesterday"
          accentColor={SEVERITY_COLORS.clean}
          trendInverse
          loading={loading}
        />
      </div>

      {/* Row 2 — Charts (58% | 42%) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="glass-card rounded-xl p-6 lg:col-span-7">
          <h3 className="text-[16px] font-medium text-sentinel-text-primary mb-6">
            Vulnerability Severity
          </h3>
          {loading ? (
            <div className="h-[200px] flex items-center justify-center">
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-6 py-1">
                  <div className="h-2 bg-sentinel-inset rounded w-3/4"></div>
                  <div className="h-2 bg-sentinel-inset rounded w-1/2"></div>
                  <div className="h-2 bg-sentinel-inset rounded w-5/6"></div>
                  <div className="h-2 bg-sentinel-inset rounded w-1/3"></div>
                </div>
              </div>
            </div>
          ) : (
            <SeverityBars data={severity_distribution} />
          )}
        </div>
        
        <div className="glass-card rounded-xl p-6 lg:col-span-5 flex flex-col">
          <h3 className="text-[16px] font-medium text-sentinel-text-primary mb-2">
            Vulnerability Donut
          </h3>
          <div className="flex-1 flex items-center justify-center">
            {loading ? (
              <div className="w-[160px] h-[160px] rounded-full border-[14px] border-sentinel-inset animate-pulse" />
            ) : (
              <DonutChart data={severity_distribution} />
            )}
          </div>
        </div>
      </div>

      {/* Row 3 — Scan Activity Timeline */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-[16px] font-medium text-sentinel-text-primary mb-6">
          Scan Activity — Last 30 Days
        </h3>
        {loading ? (
          <div className="h-[140px] flex items-end justify-between gap-1 animate-pulse">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="flex-1 bg-sentinel-inset rounded-sm" style={{ height: `${((i * 17) % 80) + 20}%` }} />
            ))}
          </div>
        ) : (
          <ScanTimeline data={timeline} />
        )}
      </div>

      {/* Row 4 — Scans and Repos (60% | 40%) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="glass-card rounded-xl p-6 lg:col-span-7 flex flex-col">
          <h3 className="text-[16px] font-medium text-sentinel-text-primary mb-6">
            Recent Scans
          </h3>
          <div className="flex-1">
            {loading ? (
              <div className="space-y-4 animate-pulse mt-2">
                <div className="h-4 bg-sentinel-inset rounded w-full"></div>
                <div className="h-10 bg-sentinel-inset rounded w-full"></div>
                <div className="h-10 bg-sentinel-inset rounded w-full"></div>
                <div className="h-10 bg-sentinel-inset rounded w-full"></div>
              </div>
            ) : (
              <RecentScansTable scans={recentScans} />
            )}
          </div>
        </div>

        <div className="glass-card rounded-xl p-6 lg:col-span-5 flex flex-col h-full min-h-[400px]">
          <h3 className="text-[16px] font-medium text-sentinel-text-primary mb-6">
            Repository Health
          </h3>
          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-[52px] bg-sentinel-inset rounded w-full"></div>
              <div className="h-[52px] bg-sentinel-inset rounded w-full"></div>
              <div className="h-[52px] bg-sentinel-inset rounded w-full"></div>
            </div>
          ) : (
            <RepositoryHealthList repositories={repositories} />
          )}
        </div>
      </div>

      {/* Row 5 — AI Activity Feed */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-[16px] font-medium text-sentinel-text-primary mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-sentinel-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          AI Analysis Activity
        </h3>
        {loading ? (
           <div className="h-[120px] bg-[#0a0d14] rounded animate-pulse"></div>
        ) : (
          <AIActivityFeed events={activity.map(v => ({ time: v.created_at, file: v.file_path, status: v.patch_status === 'pr_opened' ? 'Draft PR opened' : v.ai_status || 'Analyzed', severity: v.severity }))} />
        )}
      </div>

    </div>
  );
};
