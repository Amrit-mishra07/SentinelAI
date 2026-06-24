import { SEVERITY_COLORS, SCAN_STATUS_COLORS } from '@/lib/constants';

type BadgeVariant = 'critical' | 'high' | 'medium' | 'low' | 'pending' | 'scanning' | 'completed' | 'failed' | 'clean';

export function Badge({ variant, children, className = '' }: { variant: BadgeVariant | string; children: React.ReactNode; className?: string }) {
  let colorStyles = 'bg-slate-800 text-slate-300';
  
  if (['critical', 'high', 'medium', 'low'].includes(variant)) {
    const s = SEVERITY_COLORS[variant as keyof typeof SEVERITY_COLORS];
    colorStyles = `${s.bg} ${s.text} border ${s.border}`;
  } else if (['pending', 'scanning', 'completed', 'failed'].includes(variant)) {
    const s = SCAN_STATUS_COLORS[variant as keyof typeof SCAN_STATUS_COLORS];
    colorStyles = `${s.bg} ${s.text} border border-transparent`;
    if (variant === 'scanning') colorStyles += ' animate-pulse';
  } else if (variant === 'clean') {
    colorStyles = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorStyles} ${className}`}>
      {children}
    </span>
  );
}
