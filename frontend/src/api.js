const BASE = import.meta.env.VITE_API_URL;

export async function fetchDoener() {
  const res = await fetch(`${BASE}/api/doener`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}
