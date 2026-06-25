'use client';

import React, { useState, useEffect, useRef } from 'react';

const terminalLines = [
  { text: "$ git clone https://github.com/user/repo temp/scan_xyz", type: "cmd" },
  { text: "Cloning into 'temp/scan_xyz'...", type: "info" },
  { text: "✓ Repository cloned (234 files, 12,450 lines)", type: "success" },
  { text: "", type: "empty" },
  { text: "$ bandit -r temp/scan_xyz -f json", type: "cmd" },
  { text: "✓ Bandit complete — 3 issues found", type: "success" },
  { text: "", type: "empty" },
  { text: "$ semgrep scan --json temp/scan_xyz", type: "cmd" },
  { text: "⟳ Running semgrep...", type: "progress" },
  { text: "", type: "empty" },
  { text: "○ ESLint (queued)", type: "queued" },
  { text: "○ AI analysis (queued)", type: "queued" },
];

export const ScanTerminal: React.FC = () => {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visibleLines < terminalLines.length) {
      const timer = setTimeout(() => {
        setVisibleLines(prev => prev + 1);
      }, visibleLines === 8 ? 2000 : 300); // Wait longer on the 'progress' line
      return () => clearTimeout(timer);
    }
  }, [visibleLines]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleLines]);

  const getLineClass = (type: string) => {
    switch (type) {
      case 'cmd': return 'text-sentinel-text-primary';
      case 'info': return 'text-sentinel-text-secondary';
      case 'success': return 'text-sentinel-completed';
      case 'progress': return 'text-sentinel-scanning';
      case 'queued': return 'text-sentinel-text-tertiary';
      default: return '';
    }
  };

  return (
    <div className="bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden flex flex-col font-mono text-[13px] shadow-2xl">
      {/* Title Bar */}
      <div className="flex items-center px-4 py-3 border-b border-[#30363d] bg-[#161b22]">
        <div className="flex space-x-2 mr-4">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
        </div>
        <div className="flex items-center text-[#8b949e] text-[12px] font-sans tracking-wide">
          SentinelAI — Security Scanner
          <span className="ml-3 flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sentinel-completed opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sentinel-completed"></span>
          </span>
          <span className="ml-1 text-sentinel-completed">scanning</span>
        </div>
      </div>

      {/* Terminal Content */}
      <div 
        ref={scrollRef}
        className="p-4 flex-1 min-h-[300px] overflow-y-auto space-y-1.5"
      >
        {terminalLines.slice(0, visibleLines).map((line, i) => (
          <div key={i} className={`flex ${getLineClass(line.type)}`}>
            {line.type === 'progress' ? (
              <div className="flex w-full items-center">
                <span className="w-44">{line.text}</span>
                <div className="flex-1 max-w-[200px] h-3 bg-sentinel-inset rounded-sm overflow-hidden ml-4 relative">
                  <div className="absolute top-0 left-0 h-full w-1/2 bg-sentinel-scanning animate-[shimmer_1.5s_infinite_linear] bg-gradient-to-r from-sentinel-scanning/80 via-[#8cb4ff] to-sentinel-scanning/80 bg-[length:200%_100%]" />
                </div>
                <span className="ml-4 tabular-nums">60%</span>
              </div>
            ) : (
              <span>{line.text || '\u00A0'}</span>
            )}
          </div>
        ))}
        {/* Blinking Cursor */}
        {visibleLines < terminalLines.length && (
          <div className="w-2 h-[15px] bg-sentinel-text-secondary animate-pulse mt-1" />
        )}
      </div>
    </div>
  );
};
