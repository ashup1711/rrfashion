import axios, { AxiosError } from 'axios';
import type { ApiError, ApiErrorResponse } from '../types/api';
import { GUEST_TOKEN_KEY } from '../utils/guestConstants';
import { navigate } from '../utils/navigation';

function getApiUrl() {
  return localStorage.getItem('api_url') || window.__RUNTIME_ENV__?.API_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
}

// REQ-SEC-FE-003: ngrok-skip-browser-warning is a dev/tunnel-only workaround.
// Never send it on production traffic (info leak / smell).
const isDevHost =
  import.meta.env.DEV ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

const apiClient = axios.create({
  baseURL: getApiUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    ...(isDevHost ? { 'ngrok-skip-browser-warning': 'true' } : {}),
  },
  timeout: 15000,
});

// REQ-SEC-FE-001: attach the guest JWT to every storefront request.
// Never override an already-present Authorization (admin/customer flows use
// httpOnly cookies + withCredentials; this only covers the guest Bearer).
apiClient.interceptors.request.use((config) => {
  const guestToken = localStorage.getItem(GUEST_TOKEN_KEY);
  if (guestToken && !config.headers?.Authorization) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${guestToken}`;
  }
  return config;
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
    // For 401 errors with cookie auth, SPA-navigate to login (REQ-FE-RC-003)
    if (error.response?.status === 401) {
      const isAdminRoute = window.location.hash.startsWith('#/admin');
      navigate(isAdminRoute ? '/admin/login' : '/auth/login');
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
