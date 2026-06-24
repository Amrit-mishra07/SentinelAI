export function ScanTimeline() {
  // Generate 30 days of mock data
  const data = Array.from({ length: 30 }).map((_, i) => {
    const val = Math.floor(Math.random() * 20);
    let color = '#34d399'; // default low
    if (val > 15) color = '#ef4444';
    else if (val > 10) color = '#f59e0b';
    else if (val > 5) color = '#60a5fa';
    
    // Some empty days
    if (i % 7 === 0) return { val: 0, color: '#1e2433', date: `Day ${i+1}` };
    
    return { val, color, date: `Day ${i+1}` };
  });

  const maxVal = Math.max(...data.map(d => d.val), 5); // at least 5

  return (
    <div className="h-48 w-full flex items-end gap-1 sm:gap-2">
      {data.map((d, i) => {
        const heightPct = Math.max((d.val / maxVal) * 100, 4); // min height 4%
        
        return (
          <div key={i} className="group relative flex-1 flex flex-col justify-end h-full">
            <div 
              className="w-full rounded-t-sm transition-all duration-300 hover:opacity-80 cursor-pointer"
              style={{ height: `${heightPct}%`, backgroundColor: d.color }}
            />
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 text-slate-200 text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-lg border border-slate-700">
              <div className="font-bold">{d.date}</div>
              <div>{d.val} scans</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
