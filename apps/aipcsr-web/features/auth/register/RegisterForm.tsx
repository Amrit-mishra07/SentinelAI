'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useToastContext } from '../../../components/ui/ToastProvider';
import { apiClient } from '../../../lib/api-client';
import { motion } from 'framer-motion';

export const RegisterForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
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

  const handleConfirmPasswordBlur = () => {
    if (confirmPassword && confirmPassword !== password) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
    } else {
      setErrors(prev => ({ ...prev, confirmPassword: undefined }));
    }
  };

  const validate = () => {
    const newErrors: { email?: string; password?: string; confirmPassword?: string } = {};
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm password is required';
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      await apiClient.post('/auth/register', body);
      
      success('Registration successful. Please log in.');
      setTimeout(() => {
        router.push('/login');
      }, 1000);
      
    } catch (err: any) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      
      const is400 = err.original?.response?.status === 400;
      if (is400) {
        setErrors({ email: err.message || 'Email already registered' });
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
        autoComplete="new-password"
      />
      <Input
        label="Confirm Password"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        onBlur={handleConfirmPasswordBlur}
        error={errors.confirmPassword}
        fullWidth
        autoComplete="new-password"
      />
      <div className="pt-2">
        <Button 
          type="submit" 
          fullWidth 
          loading={loading}
        >
          Create account
        </Button>
      </div>
    </motion.form>
  );
};
