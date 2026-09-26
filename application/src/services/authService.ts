import api, { logApiError } from './api';
import { clearSession, saveToken, saveUser } from './storage';
import type { User } from '../types';

export interface LoginResponse {
  token: string;
  user: User;
}

function logAuthError(action: string, err: unknown): void {
  logApiError(`${action} failed`, err);
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  try {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
    await saveToken(data.token);
    await saveUser(data.user);
    return data;
  } catch (err) {
    logAuthError('login', err);
    throw err;
  }
}

export async function register(
  name: string,
  email: string,
  password: string,
  role: string,
): Promise<LoginResponse> {
  try {
    const { data } = await api.post<LoginResponse>('/auth/register', {
      name,
      email,
      password,
      role,
    });
    await saveToken(data.token);
    await saveUser(data.user);
    return data;
  } catch (err) {
    logAuthError('register', err);
    throw err;
  }
}

export async function logout(): Promise<void> {
  await clearSession();
}
