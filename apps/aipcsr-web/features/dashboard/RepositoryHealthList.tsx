'use client';

import React from 'react';
import Link from 'next/link';
import { Repository } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatRelative } from '../../lib/formatters';
import { SEVERITY_COLORS } from '../../lib/constants';
import { Plus, GitPullRequest } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface RepositoryHealthListProps {
  repositories: Repository[];
}

export const RepositoryHealthList: React.FC<RepositoryHealthListProps> = ({ repositories }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pr-2 space-y-2 mb-4">
        {repositories.map((repo, i) => {
          const color = repo.last_scan_severity ? SEVERITY_COLORS[repo.last_scan_severity] : 'var(--color-bg-inset)';
          
          return (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              key={repo.id}
              className="flex items-center justify-between p-3 glass rounded-lg border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all group cursor-pointer relative overflow-hidden"
              onClick={() => window.location.href = `/repositories`}
            >
              <div 
                className="absolute left-0 top-0 bottom-0 w-[3px]"
                style={{ backgroundColor: color }}
              />
              <div className="pl-3 flex flex-col min-w-0 pr-4">
                <span className="font-mono text-[13px] text-sentinel-text-primary truncate flex items-center">
                  <GitPullRequest className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                  {repo.name}
                </span>
                <span className="text-[11px] text-sentinel-text-secondary mt-1">
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
            </motion.div>
          );
        })}
      </div>
      
      <div className="pt-3 mt-auto border-t border-white/10">
        <Link href="/repositories" className="block">
          <Button variant="ghost" fullWidth leftIcon={<Plus className="w-4 h-4" />}>
            Add repository
          </Button>
        </Link>
      </div>
    </div>
  );
};
