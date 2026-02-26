import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

let authToken = null;
let adminToken = null;

export function setAuthToken(token) {
  authToken = token || null;
}

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

const adminApi = axios.create({
  baseURL: API_BASE_URL,
});

adminApi.interceptors.request.use((config) => {
  if (adminToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${adminToken}`;
  }
  return config;
});

/** Normalise FastAPI error detail (string or array of { msg } ) for display. */
export function getErrorMessage(err, fallback = 'Request failed') {
  const d = err.response?.data?.detail;
  if (d == null) return fallback;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) {
    const msgs = d.map((x) => x.msg ?? x.message).filter(Boolean);
    return msgs.length ? msgs.join('; ') : 'Validation error';
  }
  return String(d);
}

export async function fetchInventory() {
  const { data } = await api.get('/inventory');
  return data;
}

export async function addStock({ from_supplier, pipes }) {
  const { data } = await api.post('/inventory/add', { from_supplier, pipes });
  return data;
}

export async function deleteInventoryItem(id) {
  const { data } = await api.delete(`/inventory/${id}`);
  return data;
}

export async function bulkDeleteInventoryItems(ids) {
  const { data } = await api.post('/inventory/bulk-delete', { ids });
  return data;
}

export async function updateInventoryItem(id, payload) {
  const { data } = await api.put(`/inventory/${id}`, payload);
  return data;
}

export async function analyseOrder({ recipient, requirements }) {
  const { data } = await api.post('/orders/analyse', { recipient, requirements });
  return data;
}

export async function executeOrder({ recipient, fulfillments, remainder_decisions, analysis }) {
  const { data } = await api.post('/orders/execute', {
    recipient,
    fulfillments,
    remainder_decisions,
    analysis: analysis || [],
  });
  return data;
}

export async function fetchOrders({ startDate, endDate, page = 1, pageSize = 10 } = {}) {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  params.append('page', page.toString());
  params.append('page_size', pageSize.toString());
  const { data } = await api.get(`/orders?${params.toString()}`);
  return data;
}

export async function fetchStockActivity({ startDate, endDate, page = 1, pageSize = 10 } = {}) {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  params.append('page', page.toString());
  params.append('page_size', pageSize.toString());
  const { data } = await api.get(`/inventory/activity?${params.toString()}`);
  return data;
}

/** Submit a request for a new tenant; admin must approve before user can sign in. */
export async function requestTenantAccess({ email, tenant_name }) {
  const { data } = await api.post('/auth/request-tenant-access', {
    email,
    tenant_name: tenant_name || undefined,
  });
  return data;
}

export async function login({ email, password }) {
  const body = new URLSearchParams();
  body.append('username', email);
  body.append('password', password);
  body.append('grant_type', '');
  body.append('scope', '');
  body.append('client_id', '');
  body.append('client_secret', '');

  const { data } = await api.post('/auth/login', body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (data?.access_token) {
    setAuthToken(data.access_token);
    window.localStorage.setItem('auth_token', data.access_token);
  }
  return data;
}

export function loadStoredToken() {
  const token = window.localStorage.getItem('auth_token');
  if (token) {
    setAuthToken(token);
  }
}

export function logout() {
  setAuthToken(null);
  window.localStorage.removeItem('auth_token');
}

// Tenant user management
export async function fetchTenantUsers() {
  const { data } = await api.get('/auth/users');
  return data;
}

export async function createTenantUser({ email, password, role = 'user' }) {
  const { data } = await api.post('/auth/users', { email, password, role });
  return data;
}

export async function fetchSession() {
  const { data } = await api.get('/auth/me');
  return data;
}

export async function updateTenantUserRole(id, role) {
  const { data } = await api.patch(`/auth/users/${id}`, { role });
  return data;
}

export async function deleteTenantUser(id) {
  const { data } = await api.delete(`/auth/users/${id}`);
  return data;
}

// Global admin API
export function setAdminToken(token) {
  adminToken = token || null;
}

export function loadAdminStoredToken() {
  const token = window.localStorage.getItem('admin_auth_token');
  if (token) {
    adminToken = token;
  }
}

export function adminLogout() {
  adminToken = null;
  window.localStorage.removeItem('admin_auth_token');
}

export async function adminLogin({ email, password }) {
  const body = new URLSearchParams();
  body.append('username', email);
  body.append('password', password);
  body.append('grant_type', '');
  body.append('scope', '');
  body.append('client_id', '');
  body.append('client_secret', '');

  const { data } = await adminApi.post('/auth/admin-login', body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (data?.access_token) {
    adminToken = data.access_token;
    window.localStorage.setItem('admin_auth_token', data.access_token);
  }
  return data;
}

export async function adminFetchTenants() {
  const { data } = await adminApi.get('/admin/tenants');
  return data;
}

export async function adminCreateTenant({ tenant_name, email, password }) {
  const { data } = await adminApi.post('/admin/tenants', {
    tenant_name,
    email,
    password,
  });
  return data;
}

export async function adminFetchTenantStats(tenantId) {
  const { data } = await adminApi.get(`/admin/tenants/${tenantId}/stats`);
  return data;
}

export async function adminCreateTenantUser(tenantId, { email, password, role }) {
  const { data } = await adminApi.post(`/admin/tenants/${tenantId}/users`, {
    email,
    password,
    role,
  });
  return data;
}

export async function adminUpdateTenantStatus(tenantId, status) {
  const { data } = await adminApi.post(`/admin/tenants/${tenantId}/status`, { status });
  return data;
}

export async function adminUpdateTenant(tenantId, payload) {
  const { data } = await adminApi.put(`/admin/tenants/${tenantId}`, payload);
  return data;
}

export async function adminFetchTenantRequests(statusFilter = 'pending') {
  const { data } = await adminApi.get('/admin/tenant-requests', {
    params: statusFilter === 'all' ? { status_filter: 'all' } : {},
  });
  return data;
}

export async function adminApproveTenantRequest(requestId, { tenant_name, password }) {
  const { data } = await adminApi.post(`/admin/tenant-requests/${requestId}/approve`, {
    tenant_name,
    password,
  });
  return data;
}

export async function adminRejectTenantRequest(requestId) {
  const { data } = await adminApi.post(`/admin/tenant-requests/${requestId}/reject`);
  return data;
}
