'use client';

import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/ui/EmptyState';

export const ReportsPage = () => {
  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-slate-200">Reports</h1>
        <EmptyState 
          icon="📄" 
          title="No reports generated" 
          description="Reports will appear here once scans have completed successfully."
        />
      </div>
    </AppShell>
  );
}
