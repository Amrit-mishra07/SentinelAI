'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginPage } from '../../features/auth/login/LoginPage';
import { useAuth } from '../../hooks/useAuth';

export default function Login() {
  const { token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && token) {
      router.push('/dashboard');
    }
  }, [token, loading, router]);

  if (loading || token) return null; // Avoid rendering login form before redirecting

  return <LoginPage />;
}
