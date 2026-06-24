import { ScanStatus } from '@/types';
import { formatDuration } from '@/lib/formatters';

export function ScanProgress({ status, startedAt, completedAt }: { status: ScanStatus; startedAt: string | null; completedAt: string | null }) {
  const steps = [
    { id: 'pending', label: 'Queued', icon: '⏳' },
    { id: 'scanning', label: 'Scanning Codebase', icon: '🔍' },
    { id: 'analyzing', label: 'AI Analysis', icon: '🧠' }, // Visual step
    { id: 'completed', label: 'Report Generated', icon: '📄' },
  ];

  let currentStepIdx = 0;
  if (status === 'scanning') currentStepIdx = 1;
  if (status === 'completed') currentStepIdx = 3;
  if (status === 'failed') currentStepIdx = -1;

  if (status === 'failed') {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-4">
        <div className="text-3xl">❌</div>
        <div>
          <h3 className="text-lg font-medium text-red-400">Scan Failed</h3>
          <p className="text-sm text-red-400/80 mt-1">An error occurred during the scanning process.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-900 border border-slate-800 rounded-lg">
      <div className="relative">
        {/* Track */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -translate-y-1/2 rounded" />
        {/* Progress Fill */}
        <div 
          className="absolute top-1/2 left-0 h-1 bg-indigo-500 -translate-y-1/2 rounded transition-all duration-1000"
          style={{ width: `${(Math.max(currentStepIdx, 0) / (steps.length - 1)) * 100}%` }}
        />
        
        <div className="relative flex justify-between">
          {steps.map((step, idx) => {
            const isCompleted = idx <= currentStepIdx;
            const isActive = idx === currentStepIdx && status !== 'completed';
            
            return (
              <div key={step.id} className="flex flex-col items-center">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg z-10 transition-colors ${
                    isCompleted 
                      ? 'bg-indigo-500 text-white' 
                      : 'bg-slate-800 text-slate-500 border-2 border-slate-700'
                  } ${isActive ? 'animate-pulse ring-4 ring-indigo-500/30' : ''}`}
                >
                  {step.icon}
                </div>
                <div className={`mt-3 text-sm font-medium ${isCompleted ? 'text-slate-200' : 'text-slate-500'}`}>
                  {step.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {status === 'completed' && (
        <div className="mt-8 text-center text-sm text-slate-400">
          Scan completed in <span className="font-mono text-slate-200">{formatDuration(startedAt || '', completedAt)}</span>
        </div>
      )}
    </div>
  );
}
