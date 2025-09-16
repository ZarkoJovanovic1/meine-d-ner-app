const BASE = import.meta.env.VITE_API_URL;

export async function fetchDoener() {
  const res = await fetch(`${BASE}/api/doener`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function listDoener() {
  const r = await fetch(`${BASE}/api/doener`);
  if (!r.ok) throw new Error(`GET failed ${r.status}`);
  return r.json();
}

// POST
export async function createDoener({ name, location, lat, lng, image, ratings = [] }) {
  const r = await fetch(`${BASE}/api/doener`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      location,
      coordinates: { lat, lng },
      image,
      ratings
    })
  });
  if (!r.ok) throw new Error(`POST failed ${r.status}`);
  return r.json();
}

// PUT
export async function updateDoener(id, { name, location, lat, lng, image, ratings }) {
  const r = await fetch(`${BASE}/api/doener/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      location,
      coordinates: { lat, lng },
      image,
      ...(typeof ratings !== "undefined" ? { ratings } : {}) // nur senden, wenn vorhanden
    })
  });
  if (!r.ok) throw new Error(`PUT failed ${r.status}`);
  return r.json();
}

// RATE (neu)
export async function rateDoener(id, stars) {
  const r = await fetch(`${BASE}/api/doener/${id}/rate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stars }) // wichtig: Feldname heißt "stars"
  });
  if (!r.ok) throw new Error(`RATE failed ${r.status}`);
  return r.json();
}

// DELETE
export async function deleteDoener(id) {
  const r = await fetch(`${BASE}/api/doener/${id}`, { method: "DELETE" });
  if (!r.ok && r.status !== 204) throw new Error(`DELETE failed ${r.status}`);
  return true;
}

export async function addComment(id, { user, text }) {
  const r = await fetch(`${BASE}/api/doener/${id}/comment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user, text })
  });
  if (!r.ok) throw new Error(`COMMENT failed ${r.status}`);
  return r.json();
}