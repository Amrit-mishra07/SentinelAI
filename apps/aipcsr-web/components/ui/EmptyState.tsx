import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[300px]">
      <div className="text-sentinel-text-tertiary mb-4">
        {icon}
      </div>
      <h3 className="text-16px font-medium text-sentinel-text-primary mb-2">
        {title}
      </h3>
      <p className="text-[13px] text-sentinel-text-secondary mb-6 max-w-sm">
        {description}
      </p>
      {action && (
        <Button 
          variant={action.variant || 'primary'} 
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};
