import { createClient } from '@supabase/supabase-js';

// .env.local (must exist when you run `npm run deploy`, Vite bakes these in at build time):
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=eyJ...   (the anon / publishable key, never the service_role key)
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  // a missing env var at build time is the classic "form submits, nothing arrives" bug
  console.error('Supabase env vars missing: rebuild with .env.local in place');
}

// no logins on this site, so no sessions
export const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
