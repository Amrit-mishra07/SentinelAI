import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    window.dispatchEvent(new Event('sentinelai:auth-changed'));
    router.replace('/login');
  }, [router]);

  useEffect(() => {
    const checkAuth = () => {
      const storedToken = localStorage.getItem('token');
      let storedUser: User | null = null;
      try {
        const value: unknown = JSON.parse(localStorage.getItem('user') || 'null');
        if (value && typeof value === 'object' && 'id' in value && 'email' in value && typeof value.id === 'string' && typeof value.email === 'string') {
          storedUser = { id: value.id, email: value.email };
        }
      } catch { localStorage.removeItem('user'); }
      setToken(storedToken);
      setUser(storedToken ? storedUser : null);
      setLoading(false);
    };
    checkAuth();
    window.addEventListener('sentinelai:unauthorized', logout);
    window.addEventListener('sentinelai:auth-changed', checkAuth);
    window.addEventListener('storage', checkAuth);
    return () => {
      window.removeEventListener('sentinelai:unauthorized', logout);
      window.removeEventListener('sentinelai:auth-changed', checkAuth);
      window.removeEventListener('storage', checkAuth);
    };
  }, [logout]);
  return { user, token, logout, loading };
}
