import React from 'react';
import { useCountUp } from '../../hooks/useCountUp';

interface MetricCardProps {
  title: string;
  value: number;
  suffix?: string;
  trend: number;
  trendLabel: string;
  accentColor: string;
  loading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title, value, suffix = '', trend, trendLabel, accentColor, loading
}) => {
  const animatedValue = useCountUp(loading ? 0 : value, 1000);
  
  const isPositiveTrend = trend > 0;
  const isNeutralTrend = trend === 0;
  const trendColor = isPositiveTrend ? 'text-sentinel-critical' : isNeutralTrend ? 'text-sentinel-text-secondary' : 'text-sentinel-completed';
  const trendIcon = isPositiveTrend ? '↑' : isNeutralTrend ? '−' : '↓';

  if (loading) {
    return (
      <div 
        className="bg-sentinel-panel rounded-lg border border-sentinel-border p-5 relative overflow-hidden"
        style={{ borderLeft: `2px solid ${accentColor}` }}
      >
        <div className="animate-shimmer bg-[#1c2333] h-[36px] w-16 mb-2 rounded bg-gradient-to-r from-[#1c2333] via-[#21262d] to-[#1c2333] bg-[length:400%_100%]" />
        <div className="animate-shimmer bg-[#1c2333] h-[16px] w-24 mb-4 rounded bg-gradient-to-r from-[#1c2333] via-[#21262d] to-[#1c2333] bg-[length:400%_100%]" />
        <div className="animate-shimmer bg-[#1c2333] h-[14px] w-32 rounded bg-gradient-to-r from-[#1c2333] via-[#21262d] to-[#1c2333] bg-[length:400%_100%]" />
      </div>
    );
  }

  return (
    <div 
      className="bg-sentinel-panel rounded-lg border border-sentinel-border p-5 relative"
      style={{ borderLeft: `2px solid ${accentColor}` }}
    >
      <div className="text-[36px] font-semibold tabular-nums leading-none text-sentinel-text-primary mb-1">
        {animatedValue}{suffix}
      </div>
      <div className="text-[10px] font-medium text-sentinel-text-secondary tracking-[0.08em] uppercase mb-4">
        {title}
      </div>
      <div className="flex items-center text-[12px]">
        <span className={`font-medium mr-1.5 ${trendColor}`}>
          {trendIcon} {Math.abs(trend)}{suffix}
        </span>
        <span className="text-sentinel-text-tertiary">
          {trendLabel}
        </span>
      </div>
    </div>
  );
};
