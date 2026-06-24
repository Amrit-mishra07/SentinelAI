export function ErrorState({ title = 'Something went wrong', description, onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-900 border border-red-500/20 rounded-lg">
      <div className="text-4xl mb-4 text-red-500/50">⚠️</div>
      <h3 className="text-lg font-medium text-slate-200">{title}</h3>
      {description && <p className="text-sm text-slate-400 mt-1 mb-6 max-w-sm">{description}</p>}
      {onRetry && (
        <button 
          onClick={onRetry}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium py-2 px-4 rounded transition-colors mt-4"
        >
          Retry
        </button>
      )}
    </div>
  );
}
