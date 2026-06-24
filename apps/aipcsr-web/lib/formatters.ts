import { SeverityLevel } from '@/types';

export function formatDate(iso: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + 
         date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatRelativeTime(iso: string): string {
  if (!iso) return '—';
  const now = new Date();
  const date = new Date(iso);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'yesterday';
  if (diffInDays < 30) return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  
  return formatDate(iso);
}

export function formatDuration(startIso: string, endIso: string | null): string {
  if (!startIso || !endIso) return '—';
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const diff = Math.floor((end - start) / 1000);
  
  if (diff < 60) return `${diff}s`;
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${m}m ${s}s`;
}

export function formatFilePath(path: string, maxLen: number = 40): string {
  if (!path) return '';
  if (path.length <= maxLen) return path;
  
  const parts = path.split('/');
  if (parts.length <= 2) {
    return path.substring(0, maxLen / 2 - 2) + '...' + path.substring(path.length - maxLen / 2 + 1);
  }
  
  const file = parts[parts.length - 1];
  const firstDir = parts[0];
  
  return `${firstDir}/.../${file}`;
}

export function formatCount(n: number): string {
  if (n === undefined || n === null) return '0';
  if (n < 1000) return n.toString();
  return (n / 1000).toFixed(1) + 'k';
}

export function pluralize(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function getSeverityColor(s: SeverityLevel): string {
  switch (s) {
    case 'critical': return 'text-red-500';
    case 'high': return 'text-amber-500';
    case 'medium': return 'text-blue-400';
    case 'low': return 'text-emerald-400';
    default: return 'text-slate-400';
  }
}

export function getSeverityOrder(s: SeverityLevel): number {
  switch (s) {
    case 'critical': return 4;
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 0;
  }
}

export function computeRiskScore(counts: Record<SeverityLevel, number>): number {
  if (!counts) return 0;
  const rawScore = (counts.critical || 0) * 10 + 
                   (counts.high || 0) * 7 + 
                   (counts.medium || 0) * 4 + 
                   (counts.low || 0) * 1;
                   
  // Scale to 100 (cap at 100)
  return Math.min(100, rawScore);
}
