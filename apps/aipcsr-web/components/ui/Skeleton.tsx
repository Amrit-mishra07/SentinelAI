export function Skeleton({ variant = 'text', className = '' }: { variant?: 'text' | 'card' | 'table-row' | 'chart', className?: string }) {
  const baseClass = "animate-pulse bg-slate-800 rounded";
  
  switch(variant) {
    case 'text': return <div className={`h-4 w-24 ${baseClass} ${className}`}></div>;
    case 'card': return <div className={`h-32 w-full ${baseClass} ${className}`}></div>;
    case 'table-row': return <div className={`h-12 w-full ${baseClass} ${className}`}></div>;
    case 'chart': return <div className={`h-64 w-full ${baseClass} ${className}`}></div>;
    default: return <div className={`${baseClass} ${className}`}></div>;
  }
}
