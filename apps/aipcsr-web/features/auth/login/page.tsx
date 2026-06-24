'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from './LoginForm';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem('token')) {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-lg p-8 shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-200">SentinelAI</h1>
          <p className="text-slate-400 mt-2 text-sm">Sign in to your account</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
