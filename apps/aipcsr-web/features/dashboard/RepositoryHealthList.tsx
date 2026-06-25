'use client';

import React from 'react';
import Link from 'next/link';
import { Repository } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatRelative } from '../../lib/formatters';
import { SEVERITY_COLORS } from '../../lib/constants';

interface RepositoryHealthListProps {
  repositories: Repository[];
}

export const RepositoryHealthList: React.FC<RepositoryHealthListProps> = ({ repositories }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pr-2 space-y-2 mb-4">
        {repositories.map(repo => {
          const color = repo.last_scan_severity ? SEVERITY_COLORS[repo.last_scan_severity] : 'var(--color-bg-inset)';
          
          return (
            <div 
              key={repo.id}
              className="flex items-center justify-between p-3 bg-sentinel-base rounded border border-sentinel-border hover:border-sentinel-border-muted transition-colors group cursor-pointer relative overflow-hidden"
              onClick={() => window.location.href = `/repositories`}
            >
              <div 
                className="absolute left-0 top-0 bottom-0 w-[3px]"
                style={{ backgroundColor: color }}
              />
              <div className="pl-3 flex flex-col min-w-0 pr-4">
                <span className="font-mono text-[13px] text-sentinel-text-primary truncate">
                  {repo.name}
                </span>
                <span className="text-[11px] text-sentinel-text-secondary mt-0.5">
                  {repo.last_scan_at ? `Scanned ${formatRelative(repo.last_scan_at)}` : 'Never scanned'}
                </span>
              </div>
              <div className="flex-shrink-0">
                {repo.last_scan_severity ? (
                  <Badge variant={repo.last_scan_severity} />
                ) : (
                  <span className="text-[12px] text-sentinel-text-tertiary">Unknown</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="pt-2 mt-auto border-t border-sentinel-border">
        <Link href="/repositories" className="block">
          <Button variant="ghost" fullWidth leftIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          }>
            Add repository
          </Button>
        </Link>
      </div>
    </div>
  );
};
