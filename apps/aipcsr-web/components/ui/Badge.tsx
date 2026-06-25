import React from 'react';
import { SeverityLevel, ScanStatus } from '../../types';

interface BadgeProps {
  variant: SeverityLevel | ScanStatus | 'clean' | 'applied' | 'rejected';
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant, size = 'sm', pulse, className = '' }) => {
  const styles: Record<string, string> = {
    critical: 'bg-sentinel-critical/10 text-sentinel-critical border-sentinel-critical/20',
    high: 'bg-sentinel-high/10 text-sentinel-high border-sentinel-high/20',
    medium: 'bg-sentinel-medium/10 text-sentinel-medium border-sentinel-medium/20',
    low: 'bg-sentinel-low/10 text-sentinel-low border-sentinel-low/20',
    clean: 'bg-sentinel-clean/10 text-sentinel-clean border-sentinel-clean/20',
    scanning: 'bg-sentinel-scanning/10 text-sentinel-scanning border-sentinel-scanning/20',
    pending: 'bg-sentinel-pending/10 text-sentinel-pending border-sentinel-pending/20',
    failed: 'bg-sentinel-failed/10 text-sentinel-failed border-sentinel-failed/20',
    completed: 'bg-sentinel-completed/10 text-sentinel-completed border-sentinel-completed/20',
    applied: 'bg-sentinel-completed/10 text-sentinel-completed border-sentinel-completed/20',
    rejected: 'bg-sentinel-text-tertiary/10 text-sentinel-text-secondary border-sentinel-border-muted',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  const badgeColor = styles[variant] || styles.pending;
  const label = variant.charAt(0).toUpperCase() + variant.slice(1);

  return (
    <span 
      className={`inline-flex items-center rounded-full border font-medium tracking-wide ${badgeColor} ${sizes[size]} ${className}`}
      aria-label={`Severity: ${label}`}
    >
      {pulse && (
        <span className="relative mr-1.5 flex h-1.5 w-1.5">
          <span className="animate-pulse-dot absolute inline-flex h-1.5 w-1.5 rounded-full bg-current opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
        </span>
      )}
      {label}
    </span>
  );
};
