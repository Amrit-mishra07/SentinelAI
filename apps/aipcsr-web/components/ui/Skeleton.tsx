import React from 'react';
import { cn } from '../../lib/utils';

export interface SkeletonProps {
  variant: 'text' | 'card' | 'avatar' | 'badge' | 'chart' | 'table';
  width?: string | number;
  height?: string | number;
  rows?: number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ variant, width, height, rows = 3, className }) => {
  const baseClasses = 'animate-shimmer bg-sentinel-elevated bg-gradient-to-r from-sentinel-elevated via-sentinel-border-muted to-sentinel-elevated bg-[length:400%_100%] rounded';

  const styles = () => {
    switch (variant) {
      case 'text':
        return { width: width || '100%', height: height || '1em', borderRadius: '4px' };
      case 'card':
        return { width: width || '100%', height: height || '120px', borderRadius: '8px' };
      case 'avatar':
        return { width: width || '40px', height: height || '40px', borderRadius: '50%' };
      case 'badge':
        return { width: width || '60px', height: height || '20px', borderRadius: '9999px' };
      case 'chart':
        return { width: width || '100%', height: height || '200px', borderRadius: '8px' };
      default:
        return { width: width || '100%', height: height || '1em' };
    }
  };

  if (variant === 'table') {
    return (
      <div className="w-full space-y-4">
        <div className={cn(baseClasses, "h-8 w-full rounded", className)} />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex space-x-4">
            <div className={cn(baseClasses, "h-4 w-1/4 rounded")} />
            <div className={cn(baseClasses, "h-4 w-1/4 rounded")} />
            <div className={cn(baseClasses, "h-4 w-1/2 rounded")} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div 
      className={cn(baseClasses, className)}
      style={styles()}
    />
  );
};
