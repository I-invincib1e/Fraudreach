const BASE = '/api';

export async function fetchJSON(url, options = {}) {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  pincode: {
    consensus: (pin) => fetchJSON(`/pincode/${pin}/consensus`),
    all: () => fetchJSON('/pincodes/all'),
    highRisk: () => fetchJSON('/pincodes/high-risk'),
    search: (q) => fetchJSON(`/pincodes/search?q=${q}`),
  },
  ivr: {
    trigger: (body) => fetchJSON('/ivr/trigger', { method: 'POST', body: JSON.stringify(body) }),
    calls: () => fetchJSON('/ivr/calls'),
  },
  whatsapp: {
    send: (body) => fetchJSON('/whatsapp/send', { method: 'POST', body: JSON.stringify(body) }),
    messages: () => fetchJSON('/whatsapp/messages'),
  },
  review: {
    list: () => fetchJSON('/manual-review'),
    stats: () => fetchJSON('/manual-review/stats'),
    resolve: (id, body) => fetchJSON(`/manual-review/${id}/resolve`, { method: 'POST', body: JSON.stringify(body) }),
  },
  shopify: {
    orders: () => fetchJSON('/shopify/orders'),
    simulate: (body) => fetchJSON('/shopify/simulate-order', { method: 'POST', body: JSON.stringify(body) }),
  },
  dashboard: {
    summary: () => fetchJSON('/dashboard/summary'),
  },
  order: {
    verify: (body) => fetchJSON('/order/verify', { method: 'POST', body: JSON.stringify(body) }),
  },
};
