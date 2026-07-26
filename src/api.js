// Slate's /api rewrite (catalyst-web-config.json) isn't being applied in production,
// so call the AppSail backend directly - already proven CORS-safe from this frontend.
const API_BASE = "https://test-50044291949.development.catalystappsail.in";

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function askQuestion(query) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
