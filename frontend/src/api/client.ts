import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiError, ApiErrorResponse } from '../types/api';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Track if we're already refreshing to avoid infinite loops
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor — attach the best available token (priority: auth_token > guest_token)
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const authToken = localStorage.getItem('auth_token');
    const guestToken = localStorage.getItem('guest_token');

    let token: string | null = null;
    if (authToken) {
      token = authToken;
    } else if (guestToken) {
      token = guestToken;
    }

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // NO MORE guestSessionId query param — guest users authenticate via Bearer token
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor — unwrap envelope, handle 401 refresh, normalize errors
apiClient.interceptors.response.use(
  (response) => {
    // Unwrap { data, timestamp } envelope from TransformInterceptor
    // Also handle { success: true, data: T } wrapper
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
      // Old TransformInterceptor format: { data, timestamp }
      response.data = (response.data as { data: unknown }).data;
    }
    return response;
  },
  async (error: AxiosError<ApiErrorResponse | ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 — try token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const refreshUrl = originalRequest.url?.startsWith('/admin')
          ? '/admin/auth/refresh'
          : '/auth/refresh';

        const { data: refreshData } = await axios.post(
          `${apiClient.defaults.baseURL}${refreshUrl}`,
          { refreshToken },
        );

        // Unwrap the response
        const tokens = refreshData?.data || refreshData;
        const newToken = tokens.accessToken;
        const newRefreshToken = tokens.refreshToken;

        localStorage.setItem('auth_token', newToken);
        if (newRefreshToken) {
          localStorage.setItem('refresh_token', newRefreshToken);
        }

        processQueue(null, newToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');

        // Redirect to login (customer or admin) via hash router
        const isAdminRoute = window.location.hash.startsWith('#/admin');
        window.location.href = isAdminRoute ? '/rrfashion/#/admin/login' : '/rrfashion/#/auth/login';

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Transform structured error from backend
    const errorData = error.response?.data;
    if (errorData && typeof errorData === 'object' && 'error' in errorData) {
      const structuredError = errorData as ApiErrorResponse;
      const errMsg = structuredError.error?.message || 'An error occurred';
      return Promise.reject(new Error(errMsg));
    }

    // Fallback for plain errors
    const apiErr = errorData as ApiError | undefined;
    const message = apiErr?.message || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  },
);

export { apiClient };
export default apiClient;
