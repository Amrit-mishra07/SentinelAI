import React from 'react';
import { ApiError } from '../../types';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  error?: ApiError;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ 
  title = "Something went wrong", 
  description = "We couldn't load this data.", 
  onRetry,
  error
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-sentinel-panel border border-sentinel-border rounded-lg">
      <div className="w-12 h-12 rounded-full bg-sentinel-critical/10 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-sentinel-critical" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-16px font-medium text-sentinel-text-primary mb-2">
        {title}
      </h3>
      <p className="text-[13px] text-sentinel-text-secondary mb-6 max-w-sm">
        {description}
      </p>
      
      {error && process.env.NODE_ENV === 'development' && (
        <div className="mb-6 p-3 bg-[#161b22] text-left rounded text-xs font-mono text-sentinel-critical max-w-full overflow-auto">
          <div>Status: {error.status}</div>
          <div>Message: {error.message}</div>
          {error.detail && <div>Detail: {error.detail}</div>}
        </div>
      )}

      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
};
