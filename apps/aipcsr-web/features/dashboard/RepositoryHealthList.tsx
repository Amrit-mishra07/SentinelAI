export function RepositoryHealthList() {
  // Mock data for repository health
  const repos = [
    { name: 'frontend-monorepo', lastScan: '2 hours ago', severity: 'critical', vulnCount: 12 },
    { name: 'payment-gateway', lastScan: '5 hours ago', severity: 'high', vulnCount: 5 },
    { name: 'auth-service', lastScan: '1 day ago', severity: 'medium', vulnCount: 2 },
    { name: 'user-profile-api', lastScan: '2 days ago', severity: 'low', vulnCount: 1 },
    { name: 'docs-site', lastScan: '3 days ago', severity: 'clean', vulnCount: 0 },
  ];

  const getBorderColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500';
      case 'high': return 'border-amber-500';
      case 'medium': return 'border-blue-400';
      case 'low': return 'border-emerald-400';
      default: return 'border-emerald-500';
    }
  };

  const getDotColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-amber-500';
      case 'medium': return 'bg-blue-400';
      case 'low': return 'bg-emerald-400';
      default: return 'bg-emerald-500';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {repos.map((repo, i) => (
          <div key={i} className={`flex items-center justify-between p-4 border-b border-slate-800 border-l-4 ${getBorderColor(repo.severity)} hover:bg-slate-800/20 transition-colors`}>
            <div>
              <div className="font-mono text-sm text-slate-200">{repo.name}</div>
              <div className="text-xs text-slate-500 mt-1">Last scan: {repo.lastScan}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm font-bold text-slate-300">{repo.vulnCount}</div>
              <div className={`w-2.5 h-2.5 rounded-full ${getDotColor(repo.severity)}`}></div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-slate-800">
        <button className="w-full py-2 border border-slate-700 rounded text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
          + Add repository
        </button>
      </div>
    </div>
  );
}
