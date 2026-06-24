export const SEVERITY_COLORS = {
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-500' },
  high:     { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  medium:   { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-400' },
  low:      { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
};

export const SCAN_STATUS_COLORS = {
  pending:   { bg: 'bg-slate-700', text: 'text-slate-300' },
  scanning:  { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  failed:    { bg: 'bg-red-500/10', text: 'text-red-400' },
};

export const POLL_INTERVAL_FAST = 3000;   // active scan detail
export const POLL_INTERVAL_SLOW = 5000;   // scan list
export const DASHBOARD_REFRESH  = 30000;  // dashboard auto-refresh
export const API_TIMEOUT        = 30000;  // fetch timeout
