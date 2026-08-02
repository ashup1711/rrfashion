import axios, { AxiosError } from 'axios';
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
      // REQ-FE-RC-003: SPA navigation via global navigator, no hard page load
      navigate('/admin/login');
    }
    const errorData = error.response?.data as { error?: { message?: string } } | undefined;
    const message = errorData?.error?.message || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  },
);

export { adminClient };
export default adminClient;
