const BASE = import.meta.env.VITE_API_URL;

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${msg || res.statusText}`);
  }
  return res.status === 204 ? null : res.json();
}

export async function createDoener(payload) {
  return jsonFetch(`${BASE}/api/doener`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateDoener(id, payload) {
  return jsonFetch(`${BASE}/api/doener/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteDoener(id) {
  return jsonFetch(`${BASE}/api/doener/${id}`, { method: "DELETE" });
}

export async function rateDoener(id, value) {
  return jsonFetch(`${BASE}/api/doener/${id}/rate`, {
    method: "POST",
    body: JSON.stringify({ value }),
  });
}

export async function addComment(id, { user, text }) {
  return jsonFetch(`${BASE}/api/doener/${id}/comment`, {
    method: "POST",
    body: JSON.stringify({ user, text }),
  });
}

export async function deleteComment(id, commentId) {
  // Admin-Header bleibt, da Fake-Auth
  return jsonFetch(`${BASE}/api/doener/${id}/comment/${commentId}`, {
    method: "DELETE",
    headers: { "x-user": "admin" },
  });
}

export { jsonFetch, BASE };
