import { API_TIMEOUT } from './constants';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function fetchWithTimeout(resource: string, options: RequestInit = {}) {
  const { timeout = API_TIMEOUT } = options as any;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  const response = await fetch(resource, {
    ...options,
    signal: controller.signal
  });
  clearTimeout(id);
  
  return response;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
  if (baseUrl.endsWith('/api')) baseUrl = baseUrl.slice(0, -4);
  
  let safeEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (!safeEndpoint.startsWith('/api')) safeEndpoint = `/api${safeEndpoint}`;
  
  const url = `${baseUrl}${safeEndpoint}`;
  
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }
  
  try {
    const response = await fetchWithTimeout(url, { ...options, headers });
    
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      throw new ApiError(401, 'Unauthorized');
    }
    
    if (!response.ok) {
      let message = 'An error occurred';
      try {
        const errorData = await response.json();
        message = errorData.detail || errorData.message || message;
      } catch (e) {
        // Not JSON
      }
      throw new ApiError(response.status, message);
    }
    
    // Avoid parsing JSON on 204 No Content
    if (response.status === 204) {
      return {} as T;
    }
    
    return await response.json();
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new ApiError(408, 'Request timeout');
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', error);
    }
    throw error;
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) => 
    request<T>(endpoint, { ...options, method: 'GET' }),
  
  post: <T>(endpoint: string, body?: any, options?: RequestInit) => 
    request<T>(endpoint, { 
      ...options, 
      method: 'POST', 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    }),
    
  put: <T>(endpoint: string, body?: any, options?: RequestInit) => 
    request<T>(endpoint, { 
      ...options, 
      method: 'PUT', 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    }),
    
  delete: <T>(endpoint: string, options?: RequestInit) => 
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
