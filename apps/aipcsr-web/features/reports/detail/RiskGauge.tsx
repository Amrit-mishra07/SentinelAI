import { computeRiskScore } from '@/lib/formatters';
import { SeverityLevel } from '@/types';

export function RiskGauge({ counts }: { counts: Record<SeverityLevel, number> }) {
  const score = computeRiskScore(counts);
  
  // Calculate stroke dasharray for half circle
  // r = 40, c = pi * 40 = 125.66
  const c = 125.66;
  const strokeDasharray = `${c} ${c}`;
  const strokeDashoffset = c - (score / 100) * c;
  
  let color = '#34d399'; // low
  if (score > 80) color = '#ef4444'; // critical
  else if (score > 60) color = '#f59e0b'; // high
  else if (score > 30) color = '#60a5fa'; // medium

  return (
    <div className="relative w-48 h-24 overflow-hidden flex flex-col items-center">
      <svg viewBox="0 0 100 50" className="w-full h-full transform translate-y-2">
        {/* Background track */}
        <path 
          d="M 10 50 A 40 40 0 0 1 90 50" 
          fill="none" 
          stroke="#1e2433" 
          strokeWidth="10" 
          strokeLinecap="round" 
        />
        {/* Progress */}
        <path 
          d="M 10 50 A 40 40 0 0 1 90 50" 
          fill="none" 
          stroke={color} 
          strokeWidth="10" 
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
        <div className="text-3xl font-bold" style={{ color }}>{score}</div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Risk Score</div>
      </div>
    </div>
  );
}
