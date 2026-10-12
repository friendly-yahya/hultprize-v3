import { supabase } from './supabase.js';

const KEY = 'hult_registration_v1';

// ---- prefill lives on the visitor's own device only (nobody can look up anybody else's data) ----
export function loadLocal(track) {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { email: s.email ?? '', general: s.general ?? null, details: s.details?.[track] ?? null, done: s.done ?? [] };
  } catch {
    return { email: '', general: null, details: null, done: [] };
  }
}

function saveLocal(track, email, general, details) {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}');
    localStorage.setItem(KEY, JSON.stringify({
      email, general,
      details: { ...(s.details ?? {}), [track]: details },
      done: [...new Set([...(s.done ?? []), track])]
    }));
  } catch { /* storage blocked: prefill just won't work */ }
}

export class RegistrationError extends Error {
  constructor(kind, message) { super(message); this.kind = kind; } // kind: 'blocked' | 'duplicate' | 'other'
}

export async function submit(track, email, general, details) {
  const row = { ...general, email, details, track };
  const { error } = await supabase.from('registrations').insert(row);

  if (error) {
    // never swallow this: a silent catch is why "I filled the form and nothing showed up"
    if (error.message?.includes('Competitors cannot')) throw new RegistrationError('blocked', error.message);
    if (error.code === '23505') throw new RegistrationError('duplicate', 'This email is already registered for this track.');
    throw new RegistrationError('other', error.message || 'Could not save. Try again.');
  }
  saveLocal(track, email, general, details);
}
