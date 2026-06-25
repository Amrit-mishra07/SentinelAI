export class RequestTimeoutError extends Error {
  constructor(message = 'The server took too long to respond. Try again.') {
    super(message);
    this.name = 'RequestTimeoutError';
  }
}

export class ApiError extends Error {
  status: number;
  detail?: string;

  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function fetchWithTimeout(resource: RequestInfo, options: RequestInit = {}): Promise<Response> {
  const { timeout = 30000 } = options as { timeout?: number };
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(resource, {
    ...options,
    signal: controller.signal  
  });
  clearTimeout(id);

  return response;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const startTime = Date.now();
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API Request] ${method} ${url}`, body ? body : '');
  }

  try {
    const response = await fetchWithTimeout(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const duration = Date.now() - startTime;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Response] ${method} ${url} - ${response.status} (${duration}ms)`);
    }

    if (!response.ok) {
      if (response.status === 401 && typeof window !== 'undefined') {
        window.dispatchEvent(new Event('sentinelai:unauthorized'));
      }
      
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { detail: response.statusText };
      }

      throw new ApiError(
        response.status, 
        errorData.detail || errorData.message || 'An error occurred during the request',
        typeof errorData === 'string' ? errorData : JSON.stringify(errorData)
      );
    }

    // Attempt to parse JSON, if it's empty, return null
    const text = await response.text();
    return text ? JSON.parse(text) : (null as T);
    
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new RequestTimeoutError();
    }
    throw error;
  }
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
