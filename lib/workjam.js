// WorkJam integration — UNVERIFIED. WorkJam has no public API docs (docs.workjam.com requires login;
// API access is partner/customer-gated). Endpoint paths are config, not guesses baked in: set them from
// WorkJam's partner docs. Auth assumed OAuth2 client-credentials; adjust once docs are available.
let cached = null;
export const wjConfigured = () => !!(process.env.WORKJAM_BASE_URL && process.env.WORKJAM_CLIENT_ID && process.env.WORKJAM_CLIENT_SECRET);
async function token() {
  if (cached && cached.exp > Date.now()) return cached.t;
  const url = process.env.WORKJAM_TOKEN_URL || `${process.env.WORKJAM_BASE_URL}/oauth/token`;
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: process.env.WORKJAM_CLIENT_ID, client_secret: process.env.WORKJAM_CLIENT_SECRET }) });
  if (!r.ok) throw new Error(`WorkJam token HTTP ${r.status}`);
  const d = await r.json(); cached = { t: d.access_token, exp: Date.now() + ((d.expires_in || 300) - 30) * 1000 }; return cached.t;
}
export async function wjFetch(pathEnv, opts = {}) {
  const p = process.env[pathEnv]; if (!p) throw new Error(`${pathEnv} not set`);
  const r = await fetch(process.env.WORKJAM_BASE_URL + p, { ...opts, headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`WorkJam HTTP ${r.status}`);
  return d;
}
