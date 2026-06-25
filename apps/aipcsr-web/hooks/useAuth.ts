import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './useToast';
import { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const toastError = toast.error;

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  useEffect(() => {
    // Hydrate state from localStorage on client mount
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error('Failed to parse stored user', e);
        }
      }
    } else {
      // If no token, maybe redirect to login if we are in a protected route?
      // Since AppShell wraps everything but /login, we could handle it here or in middleware.
    }
    setLoading(false);

    // Listen for unauthorized event dispatched by api-client
    const handleUnauthorized = () => {
      toastError('Session expired. Please log in again.');
      logout();
    };

    window.addEventListener('sentinelai:unauthorized', handleUnauthorized);
    
    return () => {
      window.removeEventListener('sentinelai:unauthorized', handleUnauthorized);
    };
  }, [logout, toastError]);

  return { user, token, logout, loading };
}
