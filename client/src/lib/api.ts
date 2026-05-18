import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ─── Attach token to every request ───────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Handle expired token ─────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users'),
  createUser: (data: { name: string; email: string; password: string; role: string }) =>
    api.post('/auth/users', data),
}

// ─── Tables ───────────────────────────────────────────────────────────────────
export const tablesApi = {
  getAll: () => api.get('/tables'),
  getOne: (id: string) => api.get(`/tables/${id}`),
  create: (data: { name: string; fields: any[] }) =>
    api.post('/tables', data),
  update: (id: string, name: string) =>
    api.put(`/tables/${id}`, { name }),
  delete: (id: string) => api.delete(`/tables/${id}`),
  addField: (tableId: string, field: any) =>
    api.post(`/tables/${tableId}/fields`, field),
  updateField: (tableId: string, fieldId: string, data: any) =>
    api.put(`/tables/${tableId}/fields/${fieldId}`, data),
  deleteField: (tableId: string, fieldId: string) =>
    api.delete(`/tables/${tableId}/fields/${fieldId}`),
}

// ─── Rows ─────────────────────────────────────────────────────────────────────
export const rowsApi = {
  getAll: (tableId: string) => api.get(`/tables/${tableId}/rows`),
  getOne: (tableId: string, rowId: string) =>
    api.get(`/tables/${tableId}/rows/${rowId}`),
  create: (tableId: string, data: Record<string, unknown>) =>
    api.post(`/tables/${tableId}/rows`, { data }),
  update: (tableId: string, rowId: string, data: Record<string, unknown>) =>
    api.put(`/tables/${tableId}/rows/${rowId}`, { data }),
  delete: (tableId: string, rowId: string) =>
    api.delete(`/tables/${tableId}/rows/${rowId}`),
}

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reportsApi = {
  getDashboard: () => api.get('/reports/dashboard'),
  getLowStock: () => api.get('/reports/low-stock'),
  getRowMovements: (rowId: string) => api.get(`/reports/movements/${rowId}`),
  search: (q: string) => api.get(`/reports/search?q=${encodeURIComponent(q)}`),
}

export default api