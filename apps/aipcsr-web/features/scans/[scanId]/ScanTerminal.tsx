'use client';

import { Scan } from '../../../types';

const stages = ['cloning', 'scanning', 'analyzing', 'reporting', 'completed'];
const labels: Record<string, string> = {
  pending: 'Waiting for a worker', cloning: 'Cloning the selected branch',
  scanning: 'Running security scanners', analyzing: 'Analyzing findings',
  reporting: 'Generating the report', completed: 'Scan completed', failed: 'Scan failed',
};

export function ScanTerminal({ scan }: { scan: Scan }) {
  const stage = scan.stage || scan.status;
  const current = stages.indexOf(stage);
  return (
    <div className="rounded-lg border border-sentinel-border bg-sentinel-panel p-6 space-y-4" aria-live="polite">
      <h2 className="font-medium text-sentinel-text-primary">{labels[stage] || stage}</h2>
      <p className="text-sm text-sentinel-text-secondary">Progress comes from the worker. Long scans may remain at the same stage.</p>
      <ol className="space-y-2 font-mono text-sm">
        {stages.map((item, index) => <li key={item} className={index === current ? 'text-sentinel-accent' : 'text-sentinel-text-secondary'}>{index < current ? '✓' : index === current ? '›' : '·'} {labels[item]}</li>)}
      </ol>
      {scan.commit_hash && <p className="font-mono text-xs break-all">Commit: {scan.commit_hash}</p>}
      {Object.entries(scan.engine_results || {}).map(([name, result]) => (
        <p key={name} className="text-sm text-sentinel-text-secondary">{name}: {result.status || (result.error ? 'failed' : 'finished')}{result.error ? ` — ${result.error}` : ''}</p>
      ))}
      {scan.error_message && <p role="alert" className="text-sm text-sentinel-critical">{scan.error_message}</p>}
    </div>
  );
}
