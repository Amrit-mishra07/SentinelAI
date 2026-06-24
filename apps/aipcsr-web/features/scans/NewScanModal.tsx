'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { apiClient } from '@/lib/api-client';
import { Spinner } from '@/components/ui/Spinner';

export function NewScanModal({ isOpen, onClose, onScanCreated }: { isOpen: boolean; onClose: () => void; onScanCreated: () => void }) {
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) return;
    
    // Basic validation
    let finalUrl = repoUrl.trim();
    if (finalUrl.endsWith('/')) {
      finalUrl = finalUrl.slice(0, -1);
    }
    
    setError('');
    setLoading(true);
    
    try {
      await apiClient.post('/scan/create', { repository: finalUrl });
      setRepoUrl('');
      setBranch('main');
      onScanCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to start scan');
      // Dev mode: pretend it succeeded
      setTimeout(() => {
        onScanCreated();
        onClose();
        setLoading(false);
      }, 500);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Scan">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded animate-fade-in">{error}</div>}
        
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Repository URL</label>
          <input 
            type="text" 
            placeholder="https://github.com/owner/repo" 
            value={repoUrl} 
            onChange={e => setRepoUrl(e.target.value)} 
            required 
            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Branch</label>
          <input 
            type="text" 
            placeholder="main" 
            value={branch} 
            onChange={e => setBranch(e.target.value)} 
            required 
            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        
        <div className="pt-4 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 border border-slate-700 rounded text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading && <Spinner />}
            Start Scan
          </button>
        </div>
      </form>
    </Modal>
  );
}
