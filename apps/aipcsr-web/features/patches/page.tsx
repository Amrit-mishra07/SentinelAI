'use client';

import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/ui/EmptyState';

export default function PatchesPage() {
  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-slate-200">AI Patches</h1>
        <EmptyState 
          icon="⚡" 
          title="No AI patches generated" 
          description="AI patches are automatically generated for vulnerabilities found during scans."
        />
      </div>
    </AppShell>
  );
}
