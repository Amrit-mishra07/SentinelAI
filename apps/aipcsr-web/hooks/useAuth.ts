import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToastContext } from '../components/ui/ToastProvider';
import { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // Safe extraction because this hook might be called outside Provider during SSR
  let toastError = (msg: string) => console.error(msg);
  try {
    const { error } = useToastContext();
    toastError = error;
  } catch(e) {}

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  useEffect(() => {
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
    }
    setLoading(false);

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
