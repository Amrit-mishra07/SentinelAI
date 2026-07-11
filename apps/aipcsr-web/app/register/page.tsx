'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RegisterPage } from '../../features/auth/register/RegisterPage';
import { useAuth } from '../../hooks/useAuth';

export default function Register() {
  const { token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && token) {
      router.push('/dashboard');
    }
  }, [token, loading, router]);

  if (loading || token) return null; // Avoid rendering registration form before redirecting

  return <RegisterPage />;
}
