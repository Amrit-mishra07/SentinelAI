'use client';

import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/ui/EmptyState';

export default function RepositoriesPage() {
  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-200">Repositories</h1>
          <button className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded transition-colors">
            Connect Repo
          </button>
        </div>
        
        <EmptyState 
          icon="📦" 
          title="No repositories connected" 
          description="Connect your GitHub or GitLab account to import repositories and start scanning."
        />
      </div>
    </AppShell>
  );
}
