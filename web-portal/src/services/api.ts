import axios from 'axios'

/** Central client: replace mock-data consumers with services using this client once APIs are agreed. */
export const apiClient = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api', timeout: 10000 })

const tokenKey = 'minsos-auth-token'

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(tokenKey) ?? sessionStorage.getItem(tokenKey)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export { tokenKey }
