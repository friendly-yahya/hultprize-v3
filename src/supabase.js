import { createClient } from '@supabase/supabase-js';

// .env.local in the project root (must exist when you run `npm run deploy`, Vite bakes these in at build time):
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=eyJ...   (the anon / publishable key, never the service_role key)
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// createClient() THROWS on an empty url, which white-screens the whole site at load.
// So: no env vars -> no client, and the form shows a clear error instead.
export const supabase =
  url && key
    ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    : null;

if (!supabase) console.error('Supabase env vars missing: add .env.local and redeploy');
