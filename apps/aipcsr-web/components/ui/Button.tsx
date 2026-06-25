import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', loading, disabled, fullWidth, leftIcon, rightIcon, children, ...props }, ref) => {
    
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sentinel-accent disabled:opacity-50 disabled:cursor-not-allowed rounded-md';
    
    const variants = {
      primary: 'bg-sentinel-accent text-white hover:bg-blue-600 border border-transparent',
      secondary: 'bg-sentinel-panel text-sentinel-text-primary hover:bg-sentinel-elevated border border-sentinel-border',
      ghost: 'bg-transparent text-sentinel-text-secondary hover:bg-sentinel-elevated hover:text-sentinel-text-primary border border-transparent',
      danger: 'bg-sentinel-critical text-white hover:bg-red-600 border border-transparent',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    const widthStyle = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthStyle} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : leftIcon ? (
          <span className="mr-2 flex items-center">{leftIcon}</span>
        ) : null}
        
        {children}
        
        {!loading && rightIcon && (
          <span className="ml-2 flex items-center">{rightIcon}</span>
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';
