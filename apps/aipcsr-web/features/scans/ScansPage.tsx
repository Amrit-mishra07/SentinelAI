'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ScanStatus, Scan } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { NewScanModal } from './NewScanModal';
import { formatRelative, formatDuration, formatCommitHash } from '../../lib/formatters';
import { usePolling } from '../../hooks/usePolling';
import { apiClient } from '../../lib/api-client';
import { Plus, SearchX, GitBranch, FolderGit2 } from 'lucide-react';
import { motion } from 'framer-motion';

type Tab = 'all' | ScanStatus;

export const ScansPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scans, setScans] = useState<Scan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchScans = async () => {
    try {
      const response = await apiClient.get('/scan/list');
      setScans(response.data);
    } catch (error) {
      console.error('Failed to fetch scans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScans();
  }, []);

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

  const hasActiveScans = scans.some(s => s.status === 'pending' || s.status === 'scanning');
  
  usePolling(async () => {
    await fetchScans();
  }, 5000, hasActiveScans);

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'pending', label: 'Pending', count: counts.pending },
    { id: 'scanning', label: 'Scanning', count: counts.scanning },
    { id: 'completed', label: 'Completed', count: counts.completed },
    { id: 'failed', label: 'Failed', count: counts.failed },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex space-x-1 border-b border-white/10 w-full sm:w-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-[13px] font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-sentinel-text-secondary hover:text-white hover:bg-white/5 rounded-t-lg'
              }`}
            >
              {tab.label}
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-white/5 text-[11px] text-sentinel-text-tertiary">
                {tab.count}
              </span>
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTabIndicator"
                  className="absolute bottom-0 left-0 w-full h-[2px] bg-sentinel-accent shadow-[0_0_8px_rgba(47,129,247,0.8)]" 
                />
              )}
            </button>
          ))}
        </div>
        
        <Button 
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          New scan
        </Button>
      </div>

      <div className="glass-card rounded-xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-sentinel-text-secondary">Loading scans...</div>
        ) : filteredScans.length === 0 ? (
          <EmptyState 
            icon={<SearchX className="w-12 h-12 text-sentinel-text-tertiary" />}
            title="No scans found"
            description={`You don't have any ${activeTab !== 'all' ? activeTab : ''} scans.`}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-sentinel-border/30 text-xs uppercase tracking-wider font-semibold text-sentinel-text-secondary bg-sentinel-panel/50">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Repository</th>
                  <th className="px-6 py-4">Branch / Hash</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Vulns / Risk</th>
                  <th className="px-6 py-4">Started</th>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredScans.map((scan, i) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    key={scan.id} 
                    className="border-b border-sentinel-border/30 hover:bg-sentinel-inset/40 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-sentinel-text-secondary">
                        #{scan.id.substring(0, 6)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-[13px] text-sentinel-text-primary flex items-center">
                      <FolderGit2 className="w-4 h-4 mr-2 text-sentinel-text-secondary" />
                      {scan.repository_name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[13px] text-sentinel-text-primary flex items-center">
                          <GitBranch className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                          {scan.branch}
                        </span>
                        {scan.commit_hash && (
                          <span className="text-[11px] font-mono text-sentinel-text-secondary mt-1 ml-[18px]">
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
                          <span className="text-[13px] font-medium text-white">
                            {scan.vulnerabilities_count}
                          </span>
                          {scan.severity ? <Badge variant={scan.severity} size="sm" /> : <Badge variant="clean" size="sm" />}
                        </div>
                      ) : (
                        <span className="text-sentinel-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-sentinel-text-secondary">
                      {scan.started_at ? formatRelative(scan.started_at) : '—'}
                    </td>
                    <td className="px-6 py-4 text-xs text-sentinel-text-secondary font-mono">
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
                  </motion.tr>
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
          fetchScans();
        }}
      />
    </div>
  );
};
