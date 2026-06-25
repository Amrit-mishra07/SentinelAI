import { useEffect } from 'react';

type KeyHandler = (e: KeyboardEvent) => void;

interface Shortcuts {
  [key: string]: KeyHandler;
}

export function useKeyboard(shortcuts: Shortcuts) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape to propagate even in inputs
        if (e.key !== 'Escape') return;
      }

      for (const [keyCombination, handler] of Object.entries(shortcuts)) {
        const keys = keyCombination.toLowerCase().split('+');
        const needsCtrlOrMeta = keys.includes('cmd') || keys.includes('ctrl');
        const needsShift = keys.includes('shift');
        const needsAlt = keys.includes('alt');
        
        const mainKey = keys.filter(k => !['cmd', 'ctrl', 'shift', 'alt'].includes(k))[0];

        const hasCtrlOrMeta = e.ctrlKey || e.metaKey;
        const hasShift = e.shiftKey;
        const hasAlt = e.altKey;

        if (
          (needsCtrlOrMeta === hasCtrlOrMeta) &&
          (needsShift === hasShift) &&
          (needsAlt === hasAlt) &&
          e.key.toLowerCase() === mainKey
        ) {
          e.preventDefault();
          handler(e);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
