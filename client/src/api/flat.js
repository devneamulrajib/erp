const BASE_URL = '/api/flat';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export async function getFlats(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  ).toString();
  const res = await fetch(`${BASE_URL}${query ? `?${query}` : ''}`, {
    headers: authHeaders(),
  });
  return handle(res);
}

export async function getNextFlatCode() {
  const res = await fetch(`${BASE_URL}/next-code`, { headers: authHeaders() });
  return handle(res);
}

export async function createFlat(payload) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function updateFlat(id, payload) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function deleteFlat(id) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handle(res);
}