'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import { useKeyboard } from '../../hooks/useKeyboard';
import { cn } from '../../lib/utils';

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  
  useKeyboard({
    'cmd+k': () => setIsOpen(true),
    'ctrl+k': () => setIsOpen(true),
    'escape': () => setIsOpen(false),
  });

  React.useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('sentinelai:open-search', handleOpen);
    return () => window.removeEventListener('sentinelai:open-search', handleOpen);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 sm:px-0 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-xl glass-card rounded-xl overflow-hidden pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center border-b border-white/10 px-4">
                <Search className="w-5 h-5 text-sentinel-text-secondary" />
                <input 
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-transparent border-none text-sentinel-text-primary h-14 px-4 focus:outline-none placeholder:text-sentinel-text-tertiary text-lg"
                  placeholder="Search repositories, scans, or vulnerabilities..."
                />
                <button 
                  onClick={() => setIsOpen(false)}
                  className="bg-sentinel-elevated text-[10px] uppercase font-bold text-sentinel-text-secondary px-2 py-1 rounded border border-sentinel-border hover:text-white transition-colors"
                >
                  ESC
                </button>
              </div>
              
              <div className="max-h-[50vh] overflow-y-auto p-2">
                {query.length === 0 ? (
                  <div className="py-12 text-center text-sentinel-text-tertiary flex flex-col items-center justify-center">
                    <p className="text-sm">Type a command or search...</p>
                    <div className="flex items-center justify-center space-x-3 mt-6 text-xs text-sentinel-text-secondary">
                      <span className="flex items-center"><span className="bg-sentinel-elevated px-2 py-1 rounded border border-sentinel-border mr-2 shadow-sm text-[10px]">↑ ↓</span> Navigate</span>
                      <span className="flex items-center"><span className="bg-sentinel-elevated px-2 py-1 rounded border border-sentinel-border mr-2 shadow-sm text-[10px]">↵</span> Select</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-sentinel-text-secondary text-sm">
                    No results found for "<span className="text-sentinel-text-primary">{query}</span>"
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
