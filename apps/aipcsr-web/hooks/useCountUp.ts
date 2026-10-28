import { useState, useEffect } from 'react';

export function useCountUp(target: number, duration = 1000): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let startTime: number | null = null;
    let animationFrame: number;

    const easeOutQuad = (t: number) => t * (2 - t);

    const animate = (timestamp: number) => {
      if (reducedMotion || duration <= 0) { setCount(target); return; }
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      const currentVal = Math.floor(easeOutQuad(percentage) * target);
      setCount(currentVal);

      if (percentage < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [target, duration]);

  return count;
}
