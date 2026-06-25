'use client';

import React, { useEffect, useRef } from 'react';
import { SeverityLevel } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { formatTime } from '../../lib/formatters';

interface AIActivityEvent {
  time: string;
  file: string;
  status: string;
  severity: SeverityLevel;
}

interface AIActivityFeedProps {
  events: AIActivityEvent[];
}

export const AIActivityFeed: React.FC<AIActivityFeedProps> = ({ events }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest on mount/update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div 
      ref={scrollRef}
      className="bg-[#0a0d14] rounded font-mono text-[13px] border border-sentinel-border p-4 max-h-[300px] overflow-y-auto"
    >
      {events.length === 0 ? (
        <div className="text-sentinel-text-tertiary text-center py-8">
          No recent AI patch activity
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event, i) => (
            <div key={i} className="flex items-start sm:items-center flex-col sm:flex-row leading-relaxed py-1 border-b border-sentinel-border/30 last:border-0 hover:bg-[#111622] transition-colors -mx-2 px-2 rounded">
              <span className="text-sentinel-text-tertiary w-24 shrink-0">
                [{formatTime(event.time).split(' ')[0]}]
              </span>
              
              <span className="text-sentinel-text-secondary mx-2 hidden sm:inline">
                GPT-4 analyzed
              </span>
              
              <span className="text-sentinel-accent truncate max-w-[200px] md:max-w-[300px]" title={event.file}>
                {event.file}
              </span>
              
              <span className="text-sentinel-text-secondary mx-2 hidden sm:inline">
                →
              </span>

              <span className="text-sentinel-text-primary ml-auto sm:ml-2 sm:mr-auto mt-1 sm:mt-0">
                {event.status}
              </span>
              
              <div className="mt-2 sm:mt-0 ml-0 sm:ml-4 flex-shrink-0">
                <Badge variant={event.severity} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
