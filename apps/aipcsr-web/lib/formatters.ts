import { SeverityCounts } from '../types';

export function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC'
  }) + ' UTC';
}

export function formatRelative(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays <= 7) return `${diffDays} days ago`;
  
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDuration(startIso: string, endIso: string | null): string {
  if (!startIso || !endIso) return '—';
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const diffSecs = Math.floor((end - start) / 1000);
  
  if (diffSecs < 60) return `${diffSecs}s`;
  const m = Math.floor(diffSecs / 60);
  const s = diffSecs % 60;
  return `${m}m ${s}s`;
}

export function formatFilePathTruncated(path: string, maxLen = 30): string {
  if (!path) return '';
  if (path.length <= maxLen) return path;

  const parts = path.split('/');
  const filename = parts.pop() || '';
  if (filename.length >= maxLen - 5) return `.../${filename}`;

  const firstPart = parts[0] || '';
  const remainingLen = maxLen - filename.length - firstPart.length - 5;
  
  if (remainingLen <= 0) return `${firstPart}/.../${filename}`;
  return `${firstPart}/.../${filename}`; // Simplification, can be improved to show more parts if needed
}

export function formatCount(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 1000000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
}

export function pluralize(n: number, singular: string, plural?: string): string {
  if (n === 1) return `1 ${singular}`;
  return `${n} ${plural || singular + 's'}`;
}

export function computeRiskScore(counts: SeverityCounts | undefined): number {
  if (!counts) return 0;
  const score = (counts.critical * 10) + (counts.high * 7) + (counts.medium * 4) + (counts.low * 1);
  return Math.min(100, score);
}

export function getRiskLabel(score: number): 'Critical Risk' | 'High Risk' | 'Medium Risk' | 'Low Risk' | 'Clean' {
  if (score >= 80) return 'Critical Risk';
  if (score >= 50) return 'High Risk';
  if (score >= 20) return 'Medium Risk';
  if (score > 0) return 'Low Risk';
  return 'Clean';
}

export function truncateScanId(id: string): string {
  if (!id) return '';
  return '#' + id.substring(0, 6);
}

export function formatCommitHash(hash: string | null): string {
  if (!hash) return '—';
  return hash.substring(0, 7);
}
