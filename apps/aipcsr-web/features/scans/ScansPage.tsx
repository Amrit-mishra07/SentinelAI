'use client';

import React, { useState, useMemo } from 'react';
import { ScanStatus } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { NewScanModal } from './NewScanModal';
import { mockScans } from '../../lib/mock-data';
import { formatRelative, formatDuration, formatCommitHash } from '../../lib/formatters';
import { usePolling } from '../../hooks/usePolling';

type Tab = 'all' | ScanStatus;

export const ScansPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scans, setScans] = useState(mockScans);

  const filteredScans = useMemo(() => {
    if (activeTab === 'all') return scans;
    return scans.filter(s => s.status === activeTab);
  }, [scans, activeTab]);

  const counts = useMemo(() => {
    return {
      all: scans.length,
      pending: scans.filter(s => s.status === 'pending').length,
      scanning: scans.filter(s => s.status === 'scanning').length,
      completed: scans.filter(s => s.status === 'completed').length,
      failed: scans.filter(s => s.status === 'failed').length,
    };
  }, [scans]);

  // Polling logic
  const hasActiveScans = scans.some(s => s.status === 'pending' || s.status === 'scanning');
  
  usePolling(async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Polling] Fetching updated scans list...');
    }
    // In a real app:
    // const res = await api.get<{ items: Scan[] }>('/scans');
    // setScans(res.items);
  }, 5000, hasActiveScans);

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'pending', label: 'Pending', count: counts.pending },
    { id: 'scanning', label: 'Scanning', count: counts.scanning },
    { id: 'completed', label: 'Completed', count: counts.completed },
    { id: 'failed', label: 'Failed', count: counts.failed },
  ];

  return (
    <div className="space-y-6 animate-slide-in-right" style={{ animationDuration: '0.4s' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex space-x-1 border-b border-sentinel-border w-full sm:w-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-[13px] font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-sentinel-text-primary'
                  : 'text-sentinel-text-secondary hover:text-sentinel-text-primary hover:bg-sentinel-elevated/50'
              }`}
            >
              {tab.label}
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-sentinel-elevated text-[11px] text-sentinel-text-tertiary">
                {tab.count}
              </span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-sentinel-accent" />
              )}
            </button>
          ))}
        </div>
        
        <Button 
          onClick={() => setIsModalOpen(true)}
          leftIcon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
        >
          New scan
        </Button>
      </div>

      <div className="bg-sentinel-panel border border-sentinel-border rounded-lg overflow-hidden shadow-sm">
        {filteredScans.length === 0 ? (
          <EmptyState 
            icon={<svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
            title="No scans found"
            description={`You don't have any ${activeTab !== 'all' ? activeTab : ''} scans.`}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-sentinel-border text-[14px] font-medium text-sentinel-text-secondary bg-sentinel-base/50">
                  <th className="px-6 py-4 font-medium">ID</th>
                  <th className="px-6 py-4 font-medium">Repository</th>
                  <th className="px-6 py-4 font-medium">Branch / Hash</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Vulns / Risk</th>
                  <th className="px-6 py-4 font-medium">Started</th>
                  <th className="px-6 py-4 font-medium">Duration</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredScans.map((scan) => (
                  <tr 
                    key={scan.id} 
                    className="border-b border-sentinel-border/50 hover:bg-sentinel-elevated transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-[12px] text-sentinel-text-secondary">
                        #{scan.id.substring(0, 6)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-[13px] text-sentinel-text-primary">
                      {scan.repository_name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[13px] text-sentinel-text-primary flex items-center">
                          <svg className="w-3 h-3 mr-1 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                          {scan.branch}
                        </span>
                        {scan.commit_hash && (
                          <span className="text-[11px] font-mono text-sentinel-text-secondary mt-0.5 ml-[16px]">
                            {formatCommitHash(scan.commit_hash)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={scan.status} pulse={scan.status === 'scanning'} />
                    </td>
                    <td className="px-6 py-4">
                      {scan.status === 'completed' ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-[13px] font-medium text-sentinel-text-primary">
                            {scan.vulnerabilities_count}
                          </span>
                          {scan.severity ? <Badge variant={scan.severity} size="sm" /> : <Badge variant="clean" size="sm" />}
                        </div>
                      ) : (
                        <span className="text-sentinel-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[12px] text-sentinel-text-secondary">
                      {scan.started_at ? formatRelative(scan.started_at) : '—'}
                    </td>
                    <td className="px-6 py-4 text-[12px] text-sentinel-text-secondary font-mono">
                      {formatDuration(scan.started_at || '', scan.completed_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => window.location.href = `/scans/${scan.id}`}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NewScanModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => {
          // Typically refetch list here
        }}
      />
    </div>
  );
};
