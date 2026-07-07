'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useToastContext } from '../../../components/ui/ToastProvider';
import { apiClient } from '../../../lib/api-client';
import { AuthResponse } from '../../../types';
import { motion } from 'framer-motion';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [shake, setShake] = useState(false);
  
  const router = useRouter();
  const { success, error: toastError } = useToastContext();

  const handleEmailBlur = () => {
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
    } else {
      setErrors(prev => ({ ...prev, email: undefined }));
    }
  };

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const body = { email, password };
      const response = await apiClient.post<AuthResponse>('/api/auth/login', body);
      
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      success('Login successful');
      setTimeout(() => {
        router.push('/dashboard');
      }, 300);
      
    } catch (err: any) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      
      // If our interceptor threw it, err.original is the AxiosError
      const is401 = err.original?.response?.status === 401;
      
      if (is401) {
        setErrors({ email: 'Invalid email or password' });
      } else {
        toastError(err.message || 'Connection failed. Check your internet connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form 
      animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
      transition={{ duration: 0.4 }}
      onSubmit={handleSubmit} 
      className="space-y-5"
      noValidate
    >
      <Input
        label="Email address"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={handleEmailBlur}
        error={errors.email}
        fullWidth
        autoComplete="email"
      />
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        fullWidth
        autoComplete="current-password"
      />
      <div className="pt-2">
        <Button 
          type="submit" 
          fullWidth 
          loading={loading}
        >
          Sign in
        </Button>
      </div>
    </motion.form>
  );
};
