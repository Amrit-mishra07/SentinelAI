import { AxiosError } from "axios";

export const mapApiError = (error: unknown): string => {
  if (error instanceof AxiosError) {
    if (!error.response) {
      return "Network error: You appear to be offline or the server is unreachable.";
    }
    const status = error.response.status;
    
    if (status === 401) {
      return "Your session has expired. Please log in again.";
    }
    if (status === 403) {
      return "You do not have permission to perform this action.";
    }
    if (status === 429) {
      return "The server is currently busy processing too many requests. Please wait a moment.";
    }
    if (status >= 500) {
      return "Our servers encountered an unexpected error. The engineering team has been notified.";
    }
    
    // Check if the backend sent a specific detail message
    const data = error.response.data as { detail?: string | string[] };
    if (data?.detail) {
      return Array.isArray(data.detail) ? data.detail[0] : data.detail;
    }
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return "An unexpected error occurred.";
};
