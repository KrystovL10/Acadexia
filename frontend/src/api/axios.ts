import axios, { type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth.store';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: attach access token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Track whether a token refresh is in progress to avoid duplicate refreshes
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (config: InternalAxiosRequestConfig) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else if (token) {
      resolve({ headers: { Authorization: `Bearer ${token}` } } as InternalAxiosRequestConfig);
    }
  });
  failedQueue = [];
}

// Response interceptor: handle 401 (refresh) and 403 (first-login)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 403 with requiresPasswordChange → redirect to change-password
    if (error.response?.status === 403) {
      const data = error.response.data;
      if (data?.data?.requiresPasswordChange === true) {
        window.location.href = '/change-password';
        return Promise.reject(error);
      }
    }

    // 401 → attempt token refresh (only once per request)
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't try to refresh if the failing request was itself a refresh or login
      const url = originalRequest.url || '';
      if (url.includes('/auth/refresh') || url.includes('/auth/login')) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request until the refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((config) => {
          originalRequest.headers = (config as InternalAxiosRequestConfig).headers;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const response = await api.post('/v1/auth/refresh', { refreshToken });
        const loginResponse = response.data.data;
        useAuthStore.getState().login(loginResponse);

        const newToken = loginResponse.accessToken;
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
