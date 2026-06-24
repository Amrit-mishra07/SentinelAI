import React from 'react';

export function Card({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`glass-panel p-6 animate-fade-in ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`mb-4 border-b border-surface-border pb-4 ${className}`} {...props}>{children}</div>;
}

export function CardTitle({ children, className = '', ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={`text-xl font-semibold tracking-tight text-foreground ${className}`} {...props}>{children}</h2>;
}

export function CardContent({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`${className}`} {...props}>{children}</div>;
}
