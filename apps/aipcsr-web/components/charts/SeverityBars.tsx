import React, { useEffect, useState } from 'react';
import { SEVERITY_COLORS } from '../../lib/constants';

interface SeverityBarsProps {
  data: { critical: number; high: number; medium: number; low: number };
}

export const SeverityBars: React.FC<SeverityBarsProps> = ({ data }) => {
  const [mounted, setMounted] = useState(false);
  
  const total = data.critical + data.high + data.medium + data.low;
  const max = Math.max(data.critical, data.high, data.medium, data.low);
  
  useEffect(() => {
    // Slight delay to trigger animation after mount
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const rows = [
    { label: 'Critical', value: data.critical, color: SEVERITY_COLORS.critical },
    { label: 'High', value: data.high, color: SEVERITY_COLORS.high },
    { label: 'Medium', value: data.medium, color: SEVERITY_COLORS.medium },
    { label: 'Low', value: data.low, color: SEVERITY_COLORS.low },
  ];

  if (total === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center min-h-[160px] text-sentinel-text-secondary text-[13px]">
        No vulnerabilities detected
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      {rows.map((row, index) => {
        // Calculate width relative to the maximum value, but ensure it's at least a sliver if value > 0
        const percentage = row.value === 0 ? 0 : Math.max(2, (row.value / total) * 100);
        
        return (
          <div key={row.label} className="flex items-center group relative">
            <div 
              className="w-[70px] text-[12px] font-medium tracking-wide flex-shrink-0"
              style={{ color: row.color }}
            >
              {row.label.toUpperCase()}
            </div>
            
            <div className="flex-1 h-2.5 bg-sentinel-inset rounded-sm overflow-hidden flex items-center relative">
              <div 
                className="h-full rounded-sm transition-all duration-700 ease-out"
                style={{ 
                  width: mounted ? `${percentage}%` : '0%', 
                  backgroundColor: row.color,
                  transitionDelay: `${index * 100}ms`
                }}
              />
            </div>
            
            <div className="w-[45px] text-right text-[13px] font-mono text-sentinel-text-primary ml-4">
              {row.value}
            </div>

            {/* Tooltip on hover */}
            <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 -top-8 left-1/2 transform -translate-x-1/2 bg-sentinel-elevated text-white text-[11px] py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10 border border-sentinel-border shadow-lg">
              {row.value} ({((row.value / total) * 100).toFixed(1)}%)
            </div>
          </div>
        );
      })}
    </div>
  );
};
