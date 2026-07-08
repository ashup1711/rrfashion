import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

function getAdminApiUrl() {
  return localStorage.getItem('api_url') || window.__RUNTIME_ENV__?.API_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
}

const adminClient = axios.create({
  headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
  timeout: 15000,
});

adminClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config.baseURL = getAdminApiUrl();
    const token = localStorage.getItem('admin_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

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
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_refresh_token');
      window.location.href = '/rrfashion/#/admin/login';
    }
    return Promise.reject(error);
  },
);

export { adminClient };
export default adminClient;
