import axios, { AxiosError } from 'axios';
import type { ApiError, ApiErrorResponse } from '../types/api';

function getApiUrl() {
  return localStorage.getItem('api_url') || window.__RUNTIME_ENV__?.API_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
}

const apiClient = axios.create({
  baseURL: getApiUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  timeout: 15000,
});

// Response interceptor — only unwrap envelope and normalize errors
apiClient.interceptors.response.use(
  (response) => {
    // Unwrap { data, timestamp } envelope from TransformInterceptor
    if (
      response.data &&
      typeof response.data === 'object' &&
      'data' in response.data &&
      'success' in response.data
    ) {
      const wrapped = response.data as { success: boolean; data: unknown };
      if (wrapped.success) {
        response.data = wrapped.data;
      }
    } else if (
      response.data &&
      typeof response.data === 'object' &&
      'data' in response.data &&
      'timestamp' in response.data
    ) {
      response.data = (response.data as { data: unknown }).data;
    }
    return response;
  },
  async (error: AxiosError<ApiErrorResponse | ApiError>) => {
    // For 401 errors with cookie auth, redirect to login
    if (error.response?.status === 401) {
      const isAdminRoute = window.location.hash.startsWith('#/admin');
      window.location.href = isAdminRoute ? '/rrfashion/#/admin/login' : '/rrfashion/#/auth/login';
      return Promise.reject(error);
    }

    // Transform structured error from backend
    const errorData = error.response?.data;
    if (errorData && typeof errorData === 'object' && 'error' in errorData) {
      const structuredError = errorData as ApiErrorResponse;
      const errMsg = structuredError.error?.message || 'An error occurred';
      return Promise.reject(new Error(errMsg));
    }

    const apiErr = errorData as ApiError | undefined;
    const message = apiErr?.message || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  },
);

export { apiClient };
export default apiClient;
