import axios from 'axios'
import { apiClient } from './api'
import type { Role, User } from '../types'

interface AuthResponse {
  token: string
  user: { id: string; name: string; email: string; role: Role }
}

function toUser(response: AuthResponse): { token: string; user: User } {
  return { token: response.token, user: response.user }
}

export const authService = {
  async login(email: string, password: string) {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', { email, password })
    return toUser(data)
  },
  async register(name: string, email: string, password: string, role?: string) {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', { name, email, password, role })
    return toUser(data)
  }
}

export function authErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error))
    return error.response?.data?.message ?? 'Unable to contact the authentication service.'
  return 'Something went wrong. Please try again.'
}
