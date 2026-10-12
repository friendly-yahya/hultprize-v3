import { supabase } from './supabase.js';

const GENERAL = ['university', 'faculty', 'degree', 'semester', 'field_of_study', 'full_name', 'whatsapp'];
const clean = (email) => email.trim().toLowerCase();

// ---- email confirmation (6-digit code, no redirect) ----
export const sendCode = (email) =>
  supabase.auth.signInWithOtp({ email: clean(email), options: { shouldCreateUser: true } });

export const verifyCode = (email, token) =>
  supabase.auth.verifyOtp({ email: clean(email), token: token.trim(), type: 'email' });

export const signOut = () => supabase.auth.signOut();

// ---- load my rows (also claims old pre-auth rows with the same email) ----
export async function loadMine() {
  await supabase.rpc('claim_registrations');
  const { data, error } = await supabase
    .from('registrations')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// ---- rules ----
// organizer -> may register as both. competitor-only -> competitor only. nothing yet -> either.
export function allowedTracks(rows) {
  const has = (t) => rows.some((r) => r.track === t);
  return has('competitor') && !has('organizer') ? ['competitor'] : ['competitor', 'organizer'];
}

// ---- prefill ----
// general intake comes from any earlier row (organizer data reused for competitor and vice versa);
// track-specific details only from a row of the same track.
export function prefill(track, rows) {
  const same = rows.find((r) => r.track === track);
  const any = same ?? rows[0];
  if (!any) return null;
  return {
    general: Object.fromEntries(GENERAL.map((k) => [k, any[k]])),
    details: same?.details ?? {},
    alreadyRegistered: Boolean(same)
  };
}

// ---- save (insert, or update if they already have a row for this track) ----
export async function save(track, general, details) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Confirm your email first.');

  const row = { ...general, details, track, email: user.email };

  const { data: existing, error: findErr } = await supabase
    .from('registrations').select('id').eq('track', track).maybeSingle();
  if (findErr) throw findErr;

  const { error } = existing
    ? await supabase.from('registrations').update(row).eq('id', existing.id)
    : await supabase.from('registrations').insert({ ...row, user_id: user.id });

  // never swallow this: a silent catch is why "I filled the form and nothing showed up"
  if (error) throw error;
}
