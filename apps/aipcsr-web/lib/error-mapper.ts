import { isAxiosError } from 'axios';

export const mapApiError = (error: unknown): string => {
  if (isAxiosError(error)) {
    if (!error.response) return 'The server is unreachable. Check your connection and try again.';
    const data: unknown = error.response.data;
    if (data && typeof data === 'object' && 'detail' in data) {
      const detail = data.detail;
      if (typeof detail === 'string') return detail;
      if (Array.isArray(detail)) return detail.map((item: unknown) => {
        if (item && typeof item === 'object' && 'msg' in item) return String(item.msg);
        return String(item);
      }).join('; ');
    }
    if (error.response.status === 401) return 'Please sign in again.';
    if (error.response.status === 403) return 'You do not have permission to perform this action.';
    if (error.response.status === 429) return 'Too many requests. Please wait and try again.';
    return `Request failed (${error.response.status}). Please try again.`;
  }
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
};
