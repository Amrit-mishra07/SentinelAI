import React, { useEffect, useState } from 'react';
import { SEVERITY_COLORS } from '../../lib/constants';

interface DonutChartProps {
  data: { critical: number; high: number; medium: number; low: number };
}

export const DonutChart: React.FC<DonutChartProps> = ({ data }) => {
  const [mounted, setMounted] = useState(false);
  
  const total = data.critical + data.high + data.medium + data.low;
  
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const size = 160;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate segments
  let currentOffset = 0;
  const segments = [
    { label: 'Critical', value: data.critical, color: SEVERITY_COLORS.critical },
    { label: 'High', value: data.high, color: SEVERITY_COLORS.high },
    { label: 'Medium', value: data.medium, color: SEVERITY_COLORS.medium },
    { label: 'Low', value: data.low, color: SEVERITY_COLORS.low },
  ].filter(s => s.value > 0).map(segment => {
    const dashArray = (segment.value / total) * circumference;
    const offset = currentOffset;
    currentOffset += dashArray;
    return { ...segment, dashArray, offset };
  });

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90 transform">
          {/* Background Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="var(--color-bg-inset)"
            strokeWidth={strokeWidth}
          />
          
          {/* Data Segments */}
          {total > 0 && segments.map((segment, i) => (
            <circle
              key={segment.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${segment.dashArray} ${circumference}`}
              strokeDashoffset={mounted ? -segment.offset : circumference}
              className="transition-all duration-1000 ease-out"
              strokeLinecap="round"
            />
          ))}
        </svg>
        
        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[28px] font-semibold tabular-nums leading-none text-sentinel-text-primary">
            {total}
          </span>
          <span className="text-[11px] text-sentinel-text-secondary mt-1">
            {total === 0 ? 'Clean' : 'vulns'}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-6">
        {total === 0 ? (
          <div className="flex items-center text-[12px] text-sentinel-text-secondary">
            <span className="w-2 h-2 rounded-full mr-2 bg-sentinel-clean" />
            Zero vulnerabilities
          </div>
        ) : (
          segments.map(segment => (
            <div key={segment.label} className="flex items-center text-[12px] text-sentinel-text-secondary">
              <span 
                className="w-2 h-2 rounded-full mr-2" 
                style={{ backgroundColor: segment.color }}
              />
              {segment.label}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
