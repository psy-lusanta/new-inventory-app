import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// ─── Attach token to every request ───────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Handle responses ─────────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? "";
    const status = error.response?.status;

    // Never redirect on auth endpoints — let the component handle errors
    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/logout") ||
      url.includes("/auth/me");

    // Only redirect to expired page on 401 from protected endpoints
    if (status === 401 && !isAuthEndpoint) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Prevent redirect if already on login page
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login?expired=true";
      }
    }

    return Promise.reject(error);
  },
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
  getUsers: () => api.get("/auth/users"),
  createUser: (data: {
    name: string;
    email: string;
    password: string;
    role: string;
  }) => api.post("/auth/users", data),
  resetPassword: (userId: string, password: string) =>
    api.patch(`/auth/users/${userId}/reset-password`, { password }),
  deleteUser: (userId: string) => api.delete(`/auth/users/${userId}`),
  changeOwnPassword: (currentPassword: string, newPassword: string) =>
    api.post("/auth/change-password", { currentPassword, newPassword }),
  updateProfile: (data: { name: string; email: string }) =>
    api.patch("/auth/profile", data),
};

// ─── Tables ───────────────────────────────────────────────────────────────────
export const tablesApi = {
  getAll: () => api.get("/tables"),
  getOne: (id: string) => api.get(`/tables/${id}`),
  create: (data: { name: string; fields: any[] }) => api.post("/tables", data),
  update: (id: string, name: string) => api.put(`/tables/${id}`, { name }),
  delete: (id: string) => api.delete(`/tables/${id}`),
  addField: (tableId: string, field: any) =>
    api.post(`/tables/${tableId}/fields`, field),
  updateField: (tableId: string, fieldId: string, data: any) =>
    api.put(`/tables/${tableId}/fields/${fieldId}`, data),
  deleteField: (tableId: string, fieldId: string) =>
    api.delete(`/tables/${tableId}/fields/${fieldId}`),
  reorderFields: (tableId: string, fieldIds: string[]) =>
    api.put(`/tables/${tableId}/fields/reorder`, { fieldIds }),
};

// ─── Rows ─────────────────────────────────────────────────────────────────────
export const rowsApi = {
  getAll: (
    tableId: string,
    page = 1,
    limit = 50,
    sortField?: string,
    sortDir?: "asc" | "desc",
  ) => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (sortField) params.set("sortField", sortField);
    if (sortDir) params.set("sortDir", sortDir);
    return api.get(`/tables/${tableId}/rows?${params.toString()}`);
  },
  getOne: (tableId: string, rowId: string) =>
    api.get(`/tables/${tableId}/rows/${rowId}`),
  create: (tableId: string, data: Record<string, unknown>) =>
    api.post(`/tables/${tableId}/rows`, { data }),
  update: (tableId: string, rowId: string, data: Record<string, unknown>) =>
    api.put(`/tables/${tableId}/rows/${rowId}`, { data }),
  delete: (tableId: string, rowId: string) =>
    api.delete(`/tables/${tableId}/rows/${rowId}`),
};

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reportsApi = {
  getDashboard: () => api.get("/reports/dashboard"),
  getLowStock: () => api.get("/reports/low-stock"),
  getRowMovements: (rowId: string) => api.get(`/reports/movements/${rowId}`),
  search: (q: string) => api.get(`/reports/search?q=${encodeURIComponent(q)}`),
  getMonthlyMovements: () => api.get("/reports/monthly-movements"),
  getDropdownStats: () => api.get("/reports/dropdown-stats"),
  getAssetTagStats: () => api.get("/reports/asset-tag-stats"),
  getCostStats: (year?: number) =>
    api.get(`/reports/cost-stats${year ? `?year=${year}` : ""}`),
  reorderFields: (tableId: string, fieldIds: string[]) =>
    api.put(`/tables/${tableId}/fields/reorder`, { fieldIds }),
};

// ─── Logs ─────────────────────────────────────────────────────────────────────
export const logsApi = {
  getLogs: (params?: {
    page?: number;
    limit?: number;
    action?: string;
    userId?: string;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.action) query.set("action", params.action);
    if (params?.userId) query.set("userId", params.userId);
    if (params?.search) query.set("search", params.search);
    return api.get(`/logs?${query.toString()}`);
  },
  getStats: () => api.get("/logs/stats"),
};

// ─── PAF ──────────────────────────────────────────────────────────────────────
export const pafApi = {
  getNextPafNo: () => api.get("/paf/next-paf-no"),
  getForms: () => api.get("/paf"),
  getForm: (id: string) => api.get(`/paf/${id}`),
  createForm: (data: any) => api.post("/paf", data),
  updateForm: (id: string, data: any) => api.put(`/paf/${id}`, data),
  deleteForm: (id: string) => api.delete(`/paf/${id}`),
};

export const costApi = {
  getStats: () => api.get("/costs/stats"),
  getEntries: (tableId: string) => api.get(`/costs/${tableId}`),
  createEntry: (tableId: string, data: any) =>
    api.post(`/costs/${tableId}`, data),
  updateEntry: (entryId: string, data: any) =>
    api.put(`/costs/entry/${entryId}`, data),
  deleteEntry: (entryId: string) => api.delete(`/costs/entry/${entryId}`),
};

// ─── Notifications ──────────────────────────────────────────────────────────
export const notificationsApi = {
  getAll: () => api.get("/notifications"),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch("/notifications/all/read"),
  delete: (id: string) => api.delete(`/notifications/${id}`),
};

export default api;
