import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, fullWidth, ...props }, ref) => {
    const widthStyle = fullWidth ? 'w-full' : '';
    const errorStyle = error ? 'border-sentinel-critical focus:border-sentinel-critical focus:ring-sentinel-critical/20' : 'border-sentinel-border-muted focus:border-sentinel-accent focus:ring-sentinel-accent/20';

    return (
      <div className={`flex flex-col space-y-1.5 ${widthStyle} ${className}`}>
        {label && (
          <label className="text-[13px] font-medium text-sentinel-text-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`h-10 px-3 bg-sentinel-inset text-sentinel-text-primary border rounded-md outline-none transition-shadow focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-sentinel-text-tertiary ${errorStyle} ${widthStyle}`}
          {...props}
        />
        {error && (
          <span className="text-[12px] text-sentinel-critical font-medium">
            {error}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
