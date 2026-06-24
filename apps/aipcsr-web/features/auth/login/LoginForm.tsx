'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Spinner } from '@/components/ui/Spinner';

export function LoginForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!isLogin) {
        // Register first
        await apiClient.post('/auth/register', { email, password });
      }
      
      // Then login (or just login if isLogin is true)
      const res = await apiClient.post<{ access_token: string }>('/auth/login', { email, password });
      localStorage.setItem('token', res.access_token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || (isLogin ? 'Invalid credentials' : 'Failed to register'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded">{error}</div>}
      
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
        <input 
          type="email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          required 
          className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
        <input 
          type="password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          required 
          className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>
      
      <button 
        type="submit" 
        disabled={loading}
        className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 rounded flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
      >
        {loading ? <Spinner /> : (isLogin ? 'Sign in' : 'Create account')}
      </button>

      <div className="text-center mt-4">
        <button 
          type="button" 
          onClick={() => setIsLogin(!isLogin)}
          className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
        >
          {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </form>
  );
}
