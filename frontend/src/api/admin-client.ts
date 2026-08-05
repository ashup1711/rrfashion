import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { navigate } from '../utils/navigation';

function getAdminApiUrl() {
  return localStorage.getItem('api_url') || window.__RUNTIME_ENV__?.API_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
}

// REQ-SEC-FE-003: ngrok-skip-browser-warning is a dev/tunnel-only workaround.
// Never send it on production traffic.
const isDevHost =
  import.meta.env.DEV ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

const adminClient = axios.create({
  baseURL: getAdminApiUrl(),
  withCredentials: true,
  headers: { ...(isDevHost ? { 'ngrok-skip-browser-warning': 'true' } : {}) },
  timeout: 15000,
});

// ── Auto-refresh queue for admin 401s ────────────────────────────────
// When the admin access token expires the interceptor tries
// POST /admin/auth/refresh (cookie-based) once. Concurrent requests
// that arrive while the refresh is in-flight are queued and retried
// after the refresh completes. If the refresh itself fails the user
// is redirected to /admin/login.
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (err: unknown) => void }> = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

adminClient.interceptors.response.use(
  (response) => {
    // Unwrap { success: true, data: T, timestamp } envelope from TransformInterceptor
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
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Auto-refresh: on 401, try admin_refresh_token cookie before navigating to login
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue concurrent requests while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => adminClient(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try refresh — admin_refresh_token cookie is sent automatically
        await adminClient.post('/admin/auth/refresh');
        processQueue(null);
        return adminClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // Refresh failed — navigate to admin login
        navigate('/admin/login');
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    const errorData = error.response?.data as { error?: { message?: string } } | undefined;
    const message = errorData?.error?.message || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  },
);

export { adminClient };
export default adminClient;
