import { supabase } from './supabase.js';

export const dbConfigured = Boolean(supabase);

// codes the form understands: duplicate | blocked | network | not_configured | failed
export class ApiError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
  }
}

export async function submitRegistration(row) {
  if (!supabase) {
    if (import.meta.env.DEV) {
      console.log('[dev] no database configured, registration not sent:', row);
      return;
    }
    throw new ApiError('not_configured');
  }

  const clean = {
    ...row,
    email: typeof row.email === 'string' ? row.email.trim().toLowerCase() : row.email,
    whatsapp: typeof row.whatsapp === 'string' ? row.whatsapp.replace(/[\s().-]/g, '') : row.whatsapp
  };

  let error;
  try {
    ({ error } = await supabase.from('registrations').insert(clean));
  } catch {
    throw new ApiError('network');
  }
  if (!error) return;

  // never swallow this: it's what tells you why rows don't show up in the Table Editor
  console.error('registration insert failed:', error);

  if (error.code === '23505') throw new ApiError('duplicate');
  if (/Competitors cannot/i.test(error.message || '')) throw new ApiError('blocked');
  if (/fetch|network/i.test(error.message || '')) throw new ApiError('network');
  throw new ApiError('failed', error.message);
}
