'use client';

import React, { useEffect, useRef } from 'react';
import { SeverityLevel } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { formatTime } from '../../lib/formatters';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div 
      ref={scrollRef}
      className="bg-black/40 rounded-xl font-mono text-[13px] border border-white/5 p-4 max-h-[300px] overflow-y-auto"
    >
      {events.length === 0 ? (
        <div className="text-sentinel-text-tertiary text-center py-8">
          No recent AI patch activity
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event, i) => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              key={i} 
              className="flex items-start sm:items-center flex-col sm:flex-row leading-relaxed py-1.5 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors -mx-2 px-2 rounded-lg"
            >
              <span className="text-sentinel-text-tertiary w-24 shrink-0 flex items-center">
                <Sparkles className="w-3 h-3 mr-1.5 text-sentinel-accent" />
                [{formatTime(event.time).split(' ')[0]}]
              </span>
              
              <span className="text-sentinel-text-secondary mx-2 hidden sm:inline">
                GPT-4 analyzed
              </span>
              
              <span className="text-sentinel-accent truncate max-w-[200px] md:max-w-[300px]" title={event.file}>
                {event.file}
              </span>
              
              <span className="text-sentinel-text-secondary mx-2 hidden sm:flex items-center">
                <ArrowRight className="w-3 h-3" />
              </span>

              <span className="text-sentinel-text-primary ml-auto sm:ml-2 sm:mr-auto mt-1 sm:mt-0 font-sans font-medium text-sm">
                {event.status}
              </span>
              
              <div className="mt-2 sm:mt-0 ml-0 sm:ml-4 flex-shrink-0">
                <Badge variant={event.severity} />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
