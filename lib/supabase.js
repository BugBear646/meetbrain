//Author: Aniket Jha
//URL: https://github.com/BugBear646/meetbrain

import { createClient } from '@supabase/supabase-js';

// Server-only client. Uses the service_role key, which bypasses RLS.
// Never import this from a client component.
export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}
