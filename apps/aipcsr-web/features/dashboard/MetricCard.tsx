import React from 'react';
import { useCountUp } from '../../hooks/useCountUp';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MetricCardProps {
  title: string;
  value: number;
  suffix?: string;
  trend: number;
  trendLabel: string;
  accentColor: string;
  loading?: boolean;
  trendInverse?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title, value, suffix = '', trend, trendLabel, accentColor, loading, trendInverse = false
}) => {
  const animatedValue = useCountUp(loading ? 0 : value, 1000);
  
  const isPositiveTrend = trend > 0;
  const isNeutralTrend = trend === 0;
  
  let trendColor = 'text-sentinel-text-secondary';
  if (!isNeutralTrend) {
    if (isPositiveTrend) {
      trendColor = trendInverse ? 'text-sentinel-clean' : 'text-sentinel-critical';
    } else {
      trendColor = trendInverse ? 'text-sentinel-critical' : 'text-sentinel-clean';
    }
  }

  const TrendIcon = isPositiveTrend ? TrendingUp : isNeutralTrend ? Minus : TrendingDown;

  if (loading) {
    return (
      <div 
        className="glass-card rounded-xl p-5 relative overflow-hidden"
        style={{ borderLeft: `3px solid ${accentColor}` }}
      >
        <div className="animate-pulse flex flex-col space-y-3">
          <div className="h-9 bg-white/5 rounded w-16" />
          <div className="h-3 bg-white/5 rounded w-24" />
          <div className="h-3 bg-white/5 rounded w-32 mt-4" />
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card rounded-xl p-5 relative overflow-hidden group transition-colors"
      style={{ borderLeft: `3px solid ${accentColor}` }}
    >
      {/* Subtle glow effect behind the card matching accent color */}
      <div 
        className="absolute -top-10 -right-10 w-32 h-32 blur-[50px] opacity-20 group-hover:opacity-30 transition-opacity rounded-full pointer-events-none"
        style={{ backgroundColor: accentColor }}
      />
      
      <div className="text-4xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-white mb-1 drop-shadow-sm">
        {animatedValue}{suffix}
      </div>
      <div className="text-[11px] font-semibold text-sentinel-text-secondary tracking-widest uppercase mb-4">
        {title}
      </div>
      <div className="flex items-center text-xs">
        <span className={cn("font-medium mr-1.5 flex items-center", trendColor)}>
          {!isNeutralTrend && <TrendIcon className="w-3 h-3 mr-1" strokeWidth={3} />}
          {isNeutralTrend ? '' : trend > 0 ? '+' : '-'}{Math.abs(trend)}{suffix}
        </span>
        <span className="text-sentinel-text-tertiary">
          {trendLabel}
        </span>
      </div>
    </motion.div>
  );
};
