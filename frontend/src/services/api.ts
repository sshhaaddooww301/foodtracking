/**
 * Centralized API client — all requests go through here.
 * Never make raw fetch/axios calls in components.
 */
import axios, { AxiosError } from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// Attach JWT token to every request
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — clear tokens and redirect to login
apiClient.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    if (err.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post("/auth/login", { email, password }),
  refresh: (refresh_token: string) =>
    apiClient.post("/auth/refresh", { refresh_token }),
  me: () => apiClient.get("/auth/me"),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  getStats: () => apiClient.get("/dashboard/stats"),
};

// ── Organizations ─────────────────────────────────────────────────────────────
export const organizationsApi = {
  list: (params?: Record<string, any>) => apiClient.get("/organizations", { params }),
  get: (id: string) => apiClient.get(`/organizations/${id}`),
  create: (data: any) => apiClient.post("/organizations", data),
  update: (id: string, data: any) => apiClient.patch(`/organizations/${id}`, data),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: (params?: Record<string, any>) => apiClient.get("/users", { params }),
  create: (data: any) => apiClient.post("/users", data),
  update: (id: string, data: any) => apiClient.patch(`/users/${id}`, data),
};

// ── Products ──────────────────────────────────────────────────────────────────
export const productsApi = {
  list: (params?: Record<string, any>) => apiClient.get("/products", { params }),
  get: (id: string) => apiClient.get(`/products/${id}`),
  create: (data: any) => apiClient.post("/products", data),
  update: (id: string, data: any) => apiClient.patch(`/products/${id}`, data),
  delete: (id: string) => apiClient.delete(`/products/${id}`),
};

// ── Batches ───────────────────────────────────────────────────────────────────
export const batchesApi = {
  list: (params?: Record<string, any>) => apiClient.get("/batches", { params }),
  get: (id: string) => apiClient.get(`/batches/${id}`),
  create: (data: any) => apiClient.post("/batches", data),
  generatePackages: (batchId: string) => apiClient.post(`/batches/${batchId}/generate-packages`),
  getPackages: (batchId: string, params?: any) => apiClient.get(`/batches/${batchId}/packages`, { params }),
};

// ── Packages ──────────────────────────────────────────────────────────────────
export const packagesApi = {
  list: (params?: Record<string, any>) => apiClient.get("/packages", { params }),
  getDetail: (id: string) => apiClient.get(`/packages/${id}/detail`),
  getQR: (packageCode: string) => apiClient.get(`/packages/${packageCode}/qr`),
};

// ── Shipments ─────────────────────────────────────────────────────────────────
export const shipmentsApi = {
  list: (params?: Record<string, any>) => apiClient.get("/shipments", { params }),
  get: (id: string) => apiClient.get(`/shipments/${id}`),
  create: (data: any) => apiClient.post("/shipments", data),
  updateStatus: (id: string, status: string) => apiClient.post(`/shipments/${id}/status`, null, { params: { new_status: status } }),
  recordHandover: (data: any) => apiClient.post("/shipments/handover", data),
  getJourney: (id: string) => apiClient.get(`/shipments/${id}/journey`),
};

// ── IoT ───────────────────────────────────────────────────────────────────────
export const iotApi = {
  getDevices: (params?: any) => apiClient.get("/iot/devices", { params }),
  getReadings: (params?: any) => apiClient.get("/iot/readings", { params }),
  controlSimulator: (data: any) => apiClient.post("/iot/simulator/control", data),
};

// ── Consumer ──────────────────────────────────────────────────────────────────
export const consumerApi = {
  verify: (identifier: string) => apiClient.get(`/consumer/verify/${identifier}`),
  verifyPost: (identifier: string) => apiClient.post("/consumer/verify", { identifier }),
};

// ── Fraud ─────────────────────────────────────────────────────────────────────
export const fraudApi = {
  list: (params?: any) => apiClient.get("/fraud", { params }),
  resolve: (id: string, data: any) => apiClient.post(`/fraud/${id}/resolve`, data),
};

// ── Documents ─────────────────────────────────────────────────────────────────
export const documentsApi = {
  list: (params?: any) => apiClient.get("/documents", { params }),
  upload: (formData: FormData) => apiClient.post("/documents", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
};

// ── Recalls ───────────────────────────────────────────────────────────────────
export const recallsApi = {
  list: (params?: any) => apiClient.get("/recalls", { params }),
  create: (data: any) => apiClient.post("/recalls", data),
};

// ── Quarantine ────────────────────────────────────────────────────────────────
export const quarantineApi = {
  list: (params?: any) => apiClient.get("/quarantine", { params }),
  release: (packageId: string, reason: string) =>
    apiClient.post(`/quarantine/${packageId}/release`, { release_reason: reason }),
};

// ── Blockchain ────────────────────────────────────────────────────────────────
export const blockchainApi = {
  getHealth: () => apiClient.get("/blockchain/health"),
  getTransactions: (params?: any) => apiClient.get("/blockchain/transactions", { params }),
};

// ── Oracle ────────────────────────────────────────────────────────────────────
export const oracleApi = {
  list: () => apiClient.get("/oracles"),
};

// ── Audit ─────────────────────────────────────────────────────────────────────
export const auditApi = {
  list: (params?: any) => apiClient.get("/audit", { params }),
};
