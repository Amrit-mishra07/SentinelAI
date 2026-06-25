import { useEffect, useRef } from 'react';

export function usePolling(fn: () => Promise<void>, intervalMs: number, shouldPoll: boolean): void {
  const savedCallback = useRef(fn);

  useEffect(() => {
    savedCallback.current = fn;
  }, [fn]);

  useEffect(() => {
    if (!shouldPoll) return;

    let timeoutId: NodeJS.Timeout;
    let isMounted = true;

    const executePoll = async () => {
      // Pause polling if document is hidden
      if (document.hidden) {
        timeoutId = setTimeout(executePoll, intervalMs);
        return;
      }

      try {
        await savedCallback.current();
      } catch (err) {
        console.error('Polling error:', err);
      }
      
      if (isMounted && shouldPoll) {
        timeoutId = setTimeout(executePoll, intervalMs);
      }
    };

    // Initial run
    executePoll();

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [intervalMs, shouldPoll]);
}
