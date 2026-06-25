'use client';

import React from 'react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { mockRepositories } from '../../lib/mock-data';
import { formatRelative } from '../../lib/formatters';

export const RepositoriesPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-slide-in-right" style={{ animationDuration: '0.4s' }}>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-sentinel-text-primary">Repositories</h1>
        
        <Button 
          leftIcon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
        >
          Connect repository
        </Button>
      </div>

      <div className="bg-sentinel-panel border border-sentinel-border rounded-lg overflow-hidden shadow-sm">
        {mockRepositories.length === 0 ? (
          <EmptyState 
            icon={<svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>}
            title="No repositories connected"
            description="Connect a GitHub repository to start scanning for vulnerabilities."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-sentinel-border text-[11px] uppercase tracking-wider text-sentinel-text-secondary bg-sentinel-base/50">
                  <th className="px-6 py-4 font-medium">Repository</th>
                  <th className="px-6 py-4 font-medium">Default Branch</th>
                  <th className="px-6 py-4 font-medium">Last Scanned</th>
                  <th className="px-6 py-4 font-medium">Vulns / Risk</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockRepositories.map((repo) => (
                  <tr 
                    key={repo.id} 
                    className="border-b border-sentinel-border/50 hover:bg-sentinel-elevated transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 mr-3 text-sentinel-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                        <span className="font-mono text-[14px] text-sentinel-text-primary">
                          {repo.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[13px] text-sentinel-text-secondary flex items-center">
                      <svg className="w-3 h-3 mr-1.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                      {repo.default_branch}
                    </td>
                    <td className="px-6 py-4 text-[13px] text-sentinel-text-secondary">
                      {repo.last_scan_at ? formatRelative(repo.last_scan_at) : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      {repo.last_scan_severity ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-[13px] font-medium text-sentinel-text-primary">
                            {repo.total_vulnerabilities}
                          </span>
                          <Badge variant={repo.last_scan_severity} size="sm" />
                        </div>
                      ) : (
                        <span className="text-sentinel-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="secondary" 
                        size="sm"
                      >
                        Settings
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
