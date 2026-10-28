import axios from 'axios';
import { mapApiError } from './error-mapper';

export class ApiClientError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use((response) => response, (error: unknown) => {
  if (axios.isAxiosError(error) && error.response?.status === 401 && typeof window !== 'undefined') {
    // A failed login must not expire an unrelated session or hide the login error.
    if (!error.config?.url?.endsWith('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('sentinelai:unauthorized'));
    }
  }
  return Promise.reject(new ApiClientError(mapApiError(error), axios.isAxiosError(error) ? error.response?.status : undefined));
});

export const api = {
  get: async <T>(url: string): Promise<T> => (await apiClient.get<T>(url)).data,
};
