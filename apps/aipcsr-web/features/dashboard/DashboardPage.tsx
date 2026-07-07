'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MetricCard } from './MetricCard';
import { RecentScansTable } from './RecentScansTable';
import { RepositoryHealthList } from './RepositoryHealthList';
import { AIActivityFeed } from './AIActivityFeed';
import { SEVERITY_COLORS } from '../../lib/constants';
import { mockDashboardData, mockScans, mockRepositories } from '../../lib/mock-data';

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

  // In a real implementation we would fetch data here.
  // For the B.Tech project demo, we simulate loading the mock data.
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-8 animate-slide-in-right" style={{ animationDuration: '0.4s' }}>
      
      {/* Row 1 — Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          title="Total Vulns"
          value={mockDashboardData.metrics.total_vulnerabilities}
          trend={mockDashboardData.metrics.vs_yesterday.total}
          trendLabel="vs yesterday"
          accentColor="var(--color-bg-inset)"
          loading={loading}
        />
        <MetricCard
          title="Critical"
          value={mockDashboardData.metrics.critical_count}
          trend={mockDashboardData.metrics.vs_yesterday.critical}
          trendLabel="vs yesterday"
          accentColor={SEVERITY_COLORS.critical}
          loading={loading}
        />
        <MetricCard
          title="Scans Today"
          value={mockDashboardData.metrics.scans_today}
          trend={mockDashboardData.metrics.vs_yesterday.scans}
          trendLabel="vs yesterday"
          accentColor="var(--color-accent)"
          loading={loading}
        />
        <MetricCard
          title="Patched"
          value={mockDashboardData.metrics.patched_percentage}
          suffix="%"
          trend={mockDashboardData.metrics.vs_yesterday.patched}
          trendLabel="vs yest."
          accentColor={SEVERITY_COLORS.clean}
          loading={loading}
        />
      </div>

      {/* Row 2 — Charts (58% | 42%) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="glass-card rounded-xl border border-white/5 p-6 lg:col-span-7">
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
            <SeverityBars data={mockDashboardData.severity_distribution} />
          )}
        </div>
        
        <div className="glass-card rounded-xl border border-white/5 p-6 lg:col-span-5 flex flex-col">
          <h3 className="text-[16px] font-medium text-sentinel-text-primary mb-2">
            Vulnerability Donut
          </h3>
          <div className="flex-1 flex items-center justify-center">
            {loading ? (
              <div className="w-[160px] h-[160px] rounded-full border-[14px] border-sentinel-inset animate-pulse" />
            ) : (
              <DonutChart data={mockDashboardData.severity_distribution} />
            )}
          </div>
        </div>
      </div>

      {/* Row 3 — Scan Activity Timeline */}
      <div className="glass-card rounded-xl border border-white/5 p-6">
        <h3 className="text-[16px] font-medium text-sentinel-text-primary mb-6">
          Scan Activity — Last 30 Days
        </h3>
        {loading ? (
          <div className="h-[140px] flex items-end justify-between gap-1 animate-pulse">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="flex-1 bg-sentinel-inset rounded-sm" style={{ height: `${Math.random() * 80 + 20}%` }} />
            ))}
          </div>
        ) : (
          <ScanTimeline data={mockDashboardData.timeline} />
        )}
      </div>

      {/* Row 4 — Scans and Repos (60% | 40%) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="glass-card rounded-xl border border-white/5 p-6 lg:col-span-7 flex flex-col">
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
              <RecentScansTable scans={mockScans} />
            )}
          </div>
        </div>

        <div className="glass-card rounded-xl border border-white/5 p-6 lg:col-span-5 flex flex-col h-full min-h-[400px]">
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
            <RepositoryHealthList repositories={mockRepositories} />
          )}
        </div>
      </div>

      {/* Row 5 — AI Activity Feed */}
      <div className="glass-card rounded-xl border border-white/5 p-6">
        <h3 className="text-[16px] font-medium text-sentinel-text-primary mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-sentinel-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          AI Patch Activity
        </h3>
        {loading ? (
           <div className="h-[120px] bg-[#0a0d14] rounded animate-pulse"></div>
        ) : (
          <AIActivityFeed events={mockDashboardData.recent_ai_activity} />
        )}
      </div>

    </div>
  );
};
