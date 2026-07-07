import axios from 'axios';
import { mapApiError } from './error-mapper';

// Using a custom config for exponential backoff or retries could go here via interceptors.
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 30000, // 30 second timeout for long-running operations, or background scanning
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If it's a 401, dispatch a custom event so the AppShell or useAuth hook can catch it and log out.
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('sentinelai:unauthorized'));
      }
    }
    
    // Enhance the error object with our mapped, human-readable message
    const enhancedError = new Error(mapApiError(error));
    // @ts-ignore
    enhancedError.original = error;
    
    return Promise.reject(enhancedError);
  }
);
