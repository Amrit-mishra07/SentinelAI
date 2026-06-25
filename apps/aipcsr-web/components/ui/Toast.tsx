import React from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const icons = {
    success: (
      <svg className="w-5 h-5 text-sentinel-completed" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5 text-sentinel-critical" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 text-sentinel-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };

  return (
    <div className="flex items-start w-full max-w-sm bg-sentinel-panel border border-sentinel-border shadow-lg rounded-lg p-4 animate-slide-in-right pointer-events-auto">
      <div className="flex-shrink-0 mt-0.5">
        {icons[toast.type]}
      </div>
      <div className="ml-3 w-0 flex-1 pt-0.5">
        <p className="text-[13px] font-medium text-sentinel-text-primary">
          {toast.message}
        </p>
      </div>
      <div className="ml-4 flex-shrink-0 flex">
        <button
          className="bg-transparent rounded-md inline-flex text-sentinel-text-secondary hover:text-sentinel-text-primary focus:outline-none focus:ring-2 focus:ring-sentinel-accent"
          onClick={() => onDismiss(toast.id)}
        >
          <span className="sr-only">Close</span>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
