export function EmptyState({ icon, title, description, action }: { icon: string; title: string; description: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-900 border border-slate-800 rounded-lg">
      <div className="text-4xl mb-4 opacity-50">{icon}</div>
      <h3 className="text-lg font-medium text-slate-200">{title}</h3>
      <p className="text-sm text-slate-400 mt-1 mb-6 max-w-sm">{description}</p>
      {action && (
        <button 
          onClick={action.onClick}
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
