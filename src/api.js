// Database layer. Registrations are inserted into a Supabase table through its REST API (no extra packages).
// To use another backend, only this file needs to change.
//
// Set these in a .env file next to package.json (see .env.example). They are public values, safe in the browser,
// because the table only allows inserts (see supabase/schema.sql).

const URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const dbConfigured = Boolean(URL && KEY);

export class ApiError extends Error {
  constructor(code, detail) {
    super(code);
    this.code = code; // 'duplicate' | 'not_configured' | 'network' | 'failed'
    this.detail = detail;
  }
}

export async function submitRegistration(row) {
  if (!dbConfigured) {
    // while developing without a database, show the payload and pretend it worked, so the form can be tested
    if (import.meta.env.DEV) {
      console.info('[registration] database not configured, would have sent:', row);
      return;
    }
    throw new ApiError('not_configured');
  }

  const headers = { apikey: KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
  // legacy anon keys are JWTs and go in Authorization too; the newer publishable keys are not JWTs and must not
  if (KEY.startsWith('eyJ')) headers.Authorization = `Bearer ${KEY}`;

  let res;
  try {
    res = await fetch(`${URL}/rest/v1/registrations`, { method: 'POST', headers, body: JSON.stringify(row) });
  } catch {
    throw new ApiError('network');
  }
  if (res.ok) return;

  const body = await res.json().catch(() => ({}));
  if (res.status === 409 || body.code === '23505') throw new ApiError('duplicate');
  throw new ApiError('failed', body.message || `HTTP ${res.status}`);
}
