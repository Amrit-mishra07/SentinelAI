import React from 'react';

interface SkeletonProps {
  variant: 'text' | 'card' | 'avatar' | 'badge' | 'chart' | 'table';
  width?: string | number;
  height?: string | number;
  rows?: number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ variant, width, height, rows = 3, className = '' }) => {
  const baseClasses = 'animate-shimmer bg-[#1c2333] bg-gradient-to-r from-[#1c2333] via-[#21262d] to-[#1c2333] bg-[length:400%_100%] rounded';

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
        <div className={`${baseClasses} h-8 w-full rounded`} />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex space-x-4">
            <div className={`${baseClasses} h-4 w-1/4 rounded`} />
            <div className={`${baseClasses} h-4 w-1/4 rounded`} />
            <div className={`${baseClasses} h-4 w-1/2 rounded`} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div 
      className={`${baseClasses} ${className}`}
      style={styles()}
    />
  );
};
