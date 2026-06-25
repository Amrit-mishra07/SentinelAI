import React, { useState } from 'react';
import { SeverityLevel } from '../../types';
import { SEVERITY_COLORS } from '../../lib/constants';

interface TimelineDay {
  date: string;
  count: number;
  severity: SeverityLevel | null;
}

interface ScanTimelineProps {
  data: TimelineDay[];
}

export const ScanTimeline: React.FC<ScanTimelineProps> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Pad to 30 days if less
  const paddedData = [...data];
  while (paddedData.length < 30) {
    const d = new Date();
    d.setDate(d.getDate() - (30 - paddedData.length));
    paddedData.unshift({ date: d.toISOString(), count: 0, severity: null });
  }

  const maxCount = Math.max(1, ...paddedData.map(d => d.count));

  const getSeverityColor = (severity: SeverityLevel | null, count: number) => {
    if (count === 0) return 'var(--color-border)'; // faint background
    if (!severity) return 'var(--color-bg-inset)';
    return SEVERITY_COLORS[severity];
  };

  return (
    <div className="w-full relative py-2">
      <div className="flex items-end justify-between h-[120px] w-full gap-1">
        {paddedData.map((day, i) => {
          // Minimum height 4px even for zero
          const heightPct = day.count === 0 ? 0 : (day.count / maxCount) * 100;
          const minHeight = 4;
          const height = Math.max(minHeight, (heightPct / 100) * 120);
          
          return (
            <div 
              key={i}
              className="flex-1 flex flex-col justify-end group relative cursor-pointer"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div 
                className={`w-full rounded-sm transition-all duration-300 ${hoveredIndex !== null && hoveredIndex !== i ? 'opacity-50' : 'opacity-100'}`}
                style={{ 
                  height: `${height}px`,
                  backgroundColor: getSeverityColor(day.severity, day.count),
                }}
              />
              
              {/* Tooltip */}
              {hoveredIndex === i && (
                <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-20 bg-sentinel-elevated text-sentinel-text-primary text-[11px] py-1.5 px-3 rounded shadow-xl border border-sentinel-border pointer-events-none whitespace-nowrap animate-slide-in-right" style={{ animationDuration: '0.15s' }}>
                  <div className="font-medium text-white mb-0.5">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="text-sentinel-text-secondary">
                    {day.count} {day.count === 1 ? 'scan' : 'scans'}
                    {day.severity && <span className="ml-1" style={{ color: SEVERITY_COLORS[day.severity] }}>({day.severity.toUpperCase()})</span>}
                  </div>
                  
                  {/* Arrow pointing down */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-sentinel-border"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* X-axis labels (every 5th day) */}
      <div className="flex justify-between mt-3 text-[10px] text-sentinel-text-tertiary">
        {paddedData.filter((_, i) => i % 5 === 0 || i === paddedData.length - 1).map((day, i) => (
          <div key={i}>
            {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        ))}
      </div>
    </div>
  );
};
