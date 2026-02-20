import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
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
