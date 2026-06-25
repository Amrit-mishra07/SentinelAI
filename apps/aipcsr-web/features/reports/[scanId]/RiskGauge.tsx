'use client';

import React, { useEffect, useState } from 'react';
import { getRiskLabel } from '../../../lib/formatters';

interface RiskGaugeProps {
  score: number;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ score }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const size = 200;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // half circle
  
  // Dash array length to animate
  const dashOffset = circumference - (score / 100) * circumference;

  let color = 'var(--color-clean)'; // 0-20
  if (score >= 80) color = 'var(--color-critical)';
  else if (score >= 50) color = 'var(--color-high)';
  else if (score >= 20) color = 'var(--color-medium)';

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size / 2 }}>
        <svg width={size} height={size / 2} className="overflow-visible">
          {/* Background Arc */}
          <path
            d={`M ${strokeWidth/2} ${size/2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth/2} ${size/2}`}
            fill="transparent"
            stroke="var(--color-bg-inset)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          
          {/* Foreground Arc */}
          <path
            d={`M ${strokeWidth/2} ${size/2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth/2} ${size/2}`}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={mounted ? dashOffset : circumference}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        
        {/* Needle or Center Text */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex flex-col items-center pb-2">
          <span className="text-4xl font-semibold tabular-nums text-sentinel-text-primary leading-none" style={{ color }}>
            {score}
          </span>
        </div>
      </div>
      
      <div className="mt-4 text-[14px] font-medium text-sentinel-text-secondary tracking-wide uppercase">
        {getRiskLabel(score)}
      </div>
    </div>
  );
};
