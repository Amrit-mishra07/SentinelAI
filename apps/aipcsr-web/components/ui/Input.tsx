import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && <label className="text-sm font-medium text-foreground/80">{label}</label>}
        <input
          ref={ref}
          className={`input-field ${error ? 'border-danger focus:ring-danger/50' : ''} ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-danger animate-fade-in">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
