'use client';

import React, { createContext, useContext, useEffect, useSyncExternalStore } from 'react';
type Theme = 'dark' | 'light';
interface ThemeContextType { theme: Theme; toggleTheme: () => void }
const ThemeContext = createContext<ThemeContextType>({ theme: 'dark', toggleTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);
function readTheme(): Theme {
  const stored = localStorage.getItem('sentinel-theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}
function subscribe(update: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: light)');
  window.addEventListener('storage', update);
  window.addEventListener('sentinelai:theme-changed', update);
  media.addEventListener('change', update);
  return () => {
    window.removeEventListener('storage', update);
    window.removeEventListener('sentinelai:theme-changed', update);
    media.removeEventListener('change', update);
  };
}
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => 'dark' as Theme);
  useEffect(() => { document.documentElement.classList.toggle('light', theme === 'light'); }, [theme]);
  const toggleTheme = () => {
    localStorage.setItem('sentinel-theme', theme === 'dark' ? 'light' : 'dark');
    window.dispatchEvent(new Event('sentinelai:theme-changed'));
  };
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}
