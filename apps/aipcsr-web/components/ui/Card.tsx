import React from 'react';

interface CardProps {
  accentColor?: string; // hex — the left border gradient signature
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ 
  accentColor, 
  padding = 'md', 
  hoverable = false, 
  className = '', 
  children 
}) => {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const hoverStyles = hoverable ? 'transition-colors hover:bg-sentinel-elevated cursor-pointer' : '';
  
  const borderStyle = accentColor 
    ? { borderLeft: `2px solid ${accentColor}` }
    : {};

  // If accentColor exists, we can apply a subtle gradient using an inline style for the border, 
  // but standard CSS border-image might be tricky with border-radius. 
  // A simpler robust way: use an absolute positioned pseudo-element or just a standard solid border as per spec "signature left-border: border-l-2 with color matching"

  return (
    <div 
      className={`relative bg-sentinel-panel rounded-lg border border-sentinel-border overflow-hidden ${hoverStyles} ${className}`}
      style={borderStyle}
    >
      {/* Signature gradient border fallback if we wanted to make it a gradient instead of solid 2px */}
      {accentColor && (
        <div 
          className="absolute top-0 left-0 w-[2px] h-full"
          style={{
            background: `linear-gradient(to bottom, ${accentColor}, transparent)`,
          }}
        />
      )}
      <div className={paddings[padding]}>
        {children}
      </div>
    </div>
  );
};
