import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

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
    success: <CheckCircle2 className="w-5 h-5 text-sentinel-clean" />,
    error: <AlertCircle className="w-5 h-5 text-sentinel-critical" />,
    info: <Info className="w-5 h-5 text-sentinel-accent" />
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-start w-full max-w-sm glass pointer-events-auto",
        "border shadow-xl rounded-xl p-4 overflow-hidden relative",
        toast.type === 'error' ? 'border-sentinel-critical/30 shadow-[0_4px_30px_rgba(248,81,73,0.15)]' : 'border-white/10'
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {icons[toast.type]}
      </div>
      <div className="ml-3 w-0 flex-1 pt-0.5">
        <p className="text-sm font-medium text-sentinel-text-primary leading-snug">
          {toast.message}
        </p>
      </div>
      <div className="ml-4 flex-shrink-0 flex">
        <button
          className="bg-transparent rounded-md inline-flex text-sentinel-text-secondary hover:text-white focus:outline-none focus:ring-2 focus:ring-sentinel-accent transition-colors"
          onClick={() => onDismiss(toast.id)}
        >
          <span className="sr-only">Close</span>
          <X className="h-4 w-4" />
        </button>
      </div>
      {/* Progress Bar indicator */}
      <motion.div 
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 4, ease: "linear" }}
        style={{ originX: 0 }}
        className={cn(
          "absolute bottom-0 left-0 h-1 w-full",
          toast.type === 'error' ? 'bg-sentinel-critical/50' : 
          toast.type === 'success' ? 'bg-sentinel-clean/50' : 'bg-sentinel-accent/50'
        )}
      />
    </motion.div>
  );
};
