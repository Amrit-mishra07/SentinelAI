'use client';

import React from 'react';
import { useTheme } from '../../components/ui/ThemeProvider';

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-8 animate-slide-in-right" style={{ animationDuration: '0.4s' }}>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-sentinel-text-primary">Settings</h1>
      </div>

      <div className="bg-sentinel-panel border border-sentinel-border rounded-lg overflow-hidden shadow-sm max-w-3xl">
        <div className="p-6 border-b border-sentinel-border">
          <h2 className="text-lg font-medium text-sentinel-text-primary mb-1">Appearance</h2>
          <p className="text-sm text-sentinel-text-secondary">Customize how SentinelAI looks on your device.</p>
        </div>
        
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium text-sentinel-text-primary">Theme preference</h3>
              <p className="text-sm text-sentinel-text-secondary mt-1">
                Choose between dark mode and light mode. Graphics and charts will adapt automatically.
              </p>
            </div>
            
            <div className="flex items-center bg-sentinel-inset rounded-md p-1 border border-sentinel-border">
              <button
                onClick={() => theme !== 'light' && toggleTheme()}
                className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
                  theme === 'light' 
                    ? 'bg-sentinel-elevated text-sentinel-text-primary shadow-sm border border-sentinel-border' 
                    : 'text-sentinel-text-secondary hover:text-sentinel-text-primary'
                }`}
              >
                Light
              </button>
              <button
                onClick={() => theme !== 'dark' && toggleTheme()}
                className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
                  theme === 'dark' 
                    ? 'bg-sentinel-elevated text-sentinel-text-primary shadow-sm border border-sentinel-border' 
                    : 'text-sentinel-text-secondary hover:text-sentinel-text-primary'
                }`}
              >
                Dark
              </button>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
};
