import axios, { AxiosError } from 'axios';

function getAdminApiUrl() {
  return localStorage.getItem('api_url') || window.__RUNTIME_ENV__?.API_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
}

const adminClient = axios.create({
  baseURL: getAdminApiUrl(),
  withCredentials: true,
  headers: { 'ngrok-skip-browser-warning': 'true' },
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
      window.location.href = '/rrfashion/#/admin/login';
    }
    const errorData = error.response?.data as { error?: { message?: string } } | undefined;
    const message = errorData?.error?.message || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  },
);

export { adminClient };
export default adminClient;
