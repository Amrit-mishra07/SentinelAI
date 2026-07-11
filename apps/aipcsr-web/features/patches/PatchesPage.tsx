'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../hooks/useToast';
import { formatRelative } from '../../lib/formatters';
import { apiClient } from '../../lib/api-client';
import { Loader2 } from 'lucide-react';

type FilterTab = 'all' | 'pending' | 'applied' | 'rejected';

interface Vulnerability {
  id: string;
  file_path: string;
  rule_id: string;
  message: string;
  line_number: number | null;
  severity: string;
  ai_patch_code: string | null;
  patch_status: string;
  created_at: string;
}

export const PatchesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchVulnerabilities();
  }, []);

  const fetchVulnerabilities = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/report/vulnerabilities/list');
      // Filter to only show vulnerabilities that actually have an AI patch generated
      const patchesOnly = response.data.filter((v: any) => v.ai_patch_code !== null && v.ai_patch_code !== '');
      setVulns(patchesOnly);
    } catch (error) {
      toast.error('Failed to load patches');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filtered.map(v => v.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    if (activeTab === 'all') return vulns;
    return vulns.filter(v => v.patch_status === activeTab);
  }, [activeTab, vulns]);

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: vulns.length },
    { id: 'pending', label: 'Pending', count: vulns.filter(v => v.patch_status === 'pending').length },
    { id: 'applied', label: 'Applied', count: vulns.filter(v => v.patch_status === 'applied').length },
    { id: 'rejected', label: 'Rejected', count: vulns.filter(v => v.patch_status === 'rejected').length },
  ];

  const handleBulkAction = async (action: 'apply' | 'reject') => {
    if (selectedIds.size === 0) return;
    if (action === 'reject' && !window.confirm(`Are you sure you want to reject ${selectedIds.size} patches?`)) return;
    
    setBulkLoading(true);
    try {
      const promises = Array.from(selectedIds).map(id => {
        const endpoint = action === 'apply' ? `/report/vulnerability/${id}/patch` : `/report/vulnerability/${id}/dismiss`;
        return apiClient.post(endpoint);
      });
      
      await Promise.all(promises);
      toast.success(`${selectedIds.size} patches ${action === 'apply' ? 'applied' : 'rejected'} successfully.`);
      setSelectedIds(new Set());
      await fetchVulnerabilities();
    } catch (err: any) {
      toast.error('Failed to perform bulk action');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleRowAction = async (action: 'apply' | 'reject', id: string) => {
    if (action === 'reject' && !window.confirm('Are you sure you want to reject this patch?')) return;
    
    setActionLoadingId(id);
    try {
      const endpoint = action === 'apply' ? `/report/vulnerability/${id}/patch` : `/report/vulnerability/${id}/dismiss`;
      await apiClient.post(endpoint);
      toast.success(`Patch ${action === 'apply' ? 'applied' : 'rejected'} successfully.`);
      await fetchVulnerabilities();
    } catch (err: any) {
      toast.error(`Failed to ${action} patch`);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-slide-in-right" style={{ animationDuration: '0.4s' }}>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex space-x-1 border-b border-sentinel-border w-full sm:w-auto overflow-x-auto pb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-[13px] font-medium transition-colors relative whitespace-nowrap ${
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

        {selectedIds.size > 0 && (
          <div className="flex items-center space-x-3">
            <span className="text-[13px] text-sentinel-text-secondary font-medium">
              {selectedIds.size} selected
            </span>
            <Button variant="secondary" size="sm" onClick={() => handleBulkAction('reject')} disabled={bulkLoading}>
              Reject selected
            </Button>
            <Button variant="primary" size="sm" onClick={() => handleBulkAction('apply')} loading={bulkLoading}>
              Apply selected
            </Button>
          </div>
        )}
      </div>

      <div className="bg-sentinel-panel border border-sentinel-border rounded-lg overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-sentinel-accent" />
            <span className="text-sm text-sentinel-text-secondary">Loading patches...</span>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState 
            icon={<svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
            title="No AI patches found"
            description={activeTab === 'all' ? "Trigger a scan to automatically generate AI patches." : `No patches with status '${activeTab}'.`}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-sentinel-border text-[14px] font-medium text-sentinel-text-secondary bg-sentinel-base/50">
                  <th className="px-4 py-4 w-12 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-sentinel-border-muted text-sentinel-accent focus:ring-sentinel-accent/30 bg-sentinel-inset"
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-4 font-medium">File</th>
                  <th className="px-4 py-4 font-medium">Rule</th>
                  <th className="px-4 py-4 font-medium">Severity</th>
                  <th className="px-4 py-4 font-medium">AI Confidence</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 font-medium">Scan Date</th>
                  <th className="px-4 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((vuln) => (
                  <tr 
                    key={vuln.id} 
                    className={`border-b border-sentinel-border/50 hover:bg-sentinel-elevated transition-colors ${selectedIds.has(vuln.id) ? 'bg-sentinel-accent/5' : ''}`}
                  >
                    <td className="px-4 py-4 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-sentinel-border-muted text-sentinel-accent focus:ring-sentinel-accent/30 bg-sentinel-inset"
                        checked={selectedIds.has(vuln.id)}
                        onChange={() => handleSelect(vuln.id)}
                      />
                    </td>
                    <td className="px-4 py-4 font-mono text-[13px] text-sentinel-text-primary">
                      {vuln.file_path}
                      {vuln.line_number && <span className="text-sentinel-text-tertiary ml-1">:{vuln.line_number}</span>}
                    </td>
                    <td className="px-4 py-4 text-[13px] text-sentinel-text-secondary">
                      {vuln.rule_id}
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={vuln.severity} size="sm" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-1.5 bg-sentinel-inset rounded-full overflow-hidden">
                          <div className="h-full bg-sentinel-completed" style={{ width: '95%' }} />
                        </div>
                        <span className="text-[12px] font-mono text-sentinel-text-secondary">95%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={vuln.patch_status || 'pending'} />
                    </td>
                    <td className="px-4 py-4 text-[12px] text-sentinel-text-secondary">
                      {formatRelative(vuln.created_at)}
                    </td>
                    <td className="px-4 py-4 text-right space-x-2">
                      <Button 
                        variant="secondary" 
                        size="sm"
                        disabled={vuln.patch_status !== 'pending' || actionLoadingId === vuln.id}
                        onClick={() => handleRowAction('reject', vuln.id)}
                      >
                        Reject
                      </Button>
                      <Button 
                        variant="primary" 
                        size="sm"
                        disabled={vuln.patch_status !== 'pending'}
                        loading={actionLoadingId === vuln.id}
                        onClick={() => handleRowAction('apply', vuln.id)}
                      >
                        Apply
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
