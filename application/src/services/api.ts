import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToken } from './storage';

/** Minimal event emitter for auth state changes (avoids circular imports). */
type AuthEventName = 'unauthorized';
type Listener = () => void;

function createAuthEvents() {
  const listeners = new Map<AuthEventName, Set<Listener>>();
  return {
    on(event: AuthEventName, cb: Listener) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(cb);
      return () => listeners.get(event)?.delete(cb);
    },
    emit(event: AuthEventName) {
      listeners.get(event)?.forEach((cb) => cb());
    },
  };
}

export const authEvents = createAuthEvents();

/** Gets the backend URL configured by Expo at bundle time. */
function resolveApiBaseUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (!configuredUrl) {
    if (__DEV__) {
      console.warn(
        '[api] EXPO_PUBLIC_API_URL is not configured. Add it to application/.env and restart Expo.',
      );
    }
    return '';
  }

  return configuredUrl.replace(/\/$/, '');
}

export function formatApiError(error: unknown): Record<string, unknown> {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error
      ? { message: error.message, name: error.name }
      : { error };
  }

  const axiosError = error as AxiosError;
  const isNetworkError =
    axiosError.code === 'ERR_NETWORK' ||
    (!axiosError.response && Boolean(axiosError.request));
  const url = axiosError.config?.baseURL
    ? `${axiosError.config.baseURL}${axiosError.config.url ?? ''}`
    : axiosError.config?.url;

  return {
    message: axiosError.message,
    code: axiosError.code,
    isNetworkError,
    status: axiosError.response?.status,
    data: axiosError.response?.data,
    method: axiosError.config?.method?.toUpperCase(),
    url,
    timeout: axiosError.config?.timeout,
    networkHint: isNetworkError
      ? `Cannot reach ${url ?? API_BASE_URL}. Start the backend and ensure the phone is on the same Wi-Fi network.`
      : undefined,
  };
}

export function logApiError(context: string, error: unknown): void {
  const details = formatApiError(error);

  if (details.isNetworkError === true) {
    console.error(
      `[api] ${context}: Backend unavailable. Cannot connect to ${API_BASE_URL || 'EXPO_PUBLIC_API_URL'}. ` +
        'Start the backend and, on a physical device, ensure the phone and computer use the same Wi-Fi network.',
    );
    return;
  }

  console.error(`[api] ${context}:`, details);
}

export const API_BASE_URL = resolveApiBaseUrl();

if (__DEV__) {
  console.log('[api] Using base URL:', API_BASE_URL);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // React Native's FormData sometimes fails the standard 'instanceof FormData' check.
  // Checking for '_parts' ensures we correctly identify it in React Native.
  const isFormData = config.data instanceof FormData || (config.data && config.data._parts);

  if (isFormData) {
    if (config.headers) {
      // Axios docs strictly advise AGAINST setting Content-Type for FormData in React Native.
      // We must delete the default 'application/json' header so React Native can automatically
      // generate the 'multipart/form-data' header with the required boundary string.
      delete config.headers['Content-Type'];
      
      // Support for Axios v1+ which uses AxiosHeaders instances
      if (typeof config.headers.delete === 'function') {
        config.headers.delete('Content-Type');
      }
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    logApiError('Request failed', error);

    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['minsos_token', 'minsos_user', 'minsos_selected_mine']);
      authEvents.emit('unauthorized');
    }
    return Promise.reject(error);
  },
);

export default api;
