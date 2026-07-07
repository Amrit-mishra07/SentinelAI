import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, fullWidth, leftIcon, rightIcon, children, ...props }, ref) => {
    
    const variants = {
      primary: 'bg-sentinel-accent text-white hover:bg-sentinel-accent/90 border border-transparent shadow-[0_0_15px_rgba(47,129,247,0.3)]',
      secondary: 'glass text-sentinel-text-primary hover:bg-sentinel-elevated border-sentinel-border shadow-sm',
      ghost: 'bg-transparent text-sentinel-text-secondary hover:bg-sentinel-elevated hover:text-sentinel-text-primary border-transparent',
      danger: 'bg-sentinel-critical text-white hover:bg-sentinel-critical/90 border-transparent shadow-[0_0_15px_rgba(248,81,73,0.3)]',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sentinel-accent disabled:opacity-50 disabled:cursor-not-allowed rounded-md relative overflow-hidden',
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : leftIcon ? (
          <span className="mr-2 flex items-center">{leftIcon}</span>
        ) : null}
        
        {children}
        
        {!loading && rightIcon && (
          <span className="ml-2 flex items-center">{rightIcon}</span>
        )}
      </motion.button>
    );
  }
);
Button.displayName = 'Button';
