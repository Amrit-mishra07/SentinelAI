'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  preventClose?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, preventClose }) => {
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !preventClose) {
        onClose();
      }
    };

    // Focus trap could be fully implemented here, for now basic focus:
    if (modalRef.current) {
      const focusable = modalRef.current.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable) (focusable as HTMLElement).focus();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, preventClose]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !preventClose) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        ref={modalRef}
        className="relative bg-sentinel-panel w-full max-w-md rounded-lg border border-sentinel-border shadow-2xl overflow-hidden animate-slide-in-right"
        style={{ animationName: 'count-up' }} // reusing fade-up animation as slide-in
      >
        <div className="flex items-center justify-between p-4 border-b border-sentinel-border">
          <h2 id="modal-title" className="text-16px font-medium text-sentinel-text-primary">
            {title}
          </h2>
          {!preventClose && (
            <button 
              onClick={onClose}
              className="p-1 rounded hover:bg-sentinel-elevated text-sentinel-text-secondary transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
