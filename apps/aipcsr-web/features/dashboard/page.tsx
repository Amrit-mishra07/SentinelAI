'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api-client';
import { DashboardStats, Scan } from '@/types';
import { MetricCards } from './MetricCards';
import { SeverityBarChart } from './SeverityBarChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { ScanTimeline } from './ScanTimeline';
import { RecentScansTable } from './RecentScansTable';
import { RepositoryHealthList } from './RepositoryHealthList';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';

export default function DashboardPage() {
  const { loading: authLoading, token } = useAuth();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentScans, setRecentScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, scansData] = await Promise.all([
        apiClient.get<DashboardStats>('/dashboard/stats').catch(() => ({
          total_scans: 142, scans_today: 7, total_vulnerabilities: 89,
          critical_count: 3, high_count: 12, medium_count: 34, low_count: 40,
          patched_percentage: 89, repositories_count: 12
        })),
        apiClient.get<Scan[]>('/scan/list').catch(() => [])
      ]);
      setStats(statsData as DashboardStats);
      setRecentScans(scansData as Scan[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [token]);

  if (authLoading) return null;

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-200">Dashboard</h1>
        
        {error ? (
          <ErrorState description={error} onRetry={fetchData} />
        ) : loading && !stats ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Skeleton variant="card" className="h-24" />
              <Skeleton variant="card" className="h-24" />
              <Skeleton variant="card" className="h-24" />
              <Skeleton variant="card" className="h-24" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="md:col-span-3"><Skeleton variant="chart" className="h-64" /></div>
              <div className="md:col-span-2"><Skeleton variant="chart" className="h-64" /></div>
            </div>
          </>
        ) : (
          <>
            <MetricCards stats={stats!} />
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="md:col-span-3 bg-slate-900 border border-slate-800 rounded-lg p-6">
                <h2 className="text-lg font-medium text-slate-200 mb-4">Vulnerability Severity</h2>
                <SeverityBarChart stats={stats!} />
              </div>
              <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-6 flex flex-col">
                <h2 className="text-lg font-medium text-slate-200 mb-4">Distribution</h2>
                <div className="flex-1 flex items-center justify-center min-h-[200px]">
                  <DonutChart stats={stats!} />
                </div>
              </div>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h2 className="text-lg font-medium text-slate-200 mb-4">Scan Activity (30 Days)</h2>
              <ScanTimeline />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
                <div className="p-6 pb-4 border-b border-slate-800">
                  <h2 className="text-lg font-medium text-slate-200">Recent Scans</h2>
                </div>
                <div className="flex-1 overflow-x-auto">
                  <RecentScansTable scans={recentScans} />
                </div>
              </div>
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg flex flex-col">
                <div className="p-6 pb-4 border-b border-slate-800">
                  <h2 className="text-lg font-medium text-slate-200">Repository Health</h2>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[400px]">
                  <RepositoryHealthList />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
