import { createClient } from '@supabase/supabase-js';
const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) console.error('[gather] MISSING ENV: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local, then restart npm run dev.');
else if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url.trim())) console.error('[gather] SUPABASE_URL looks wrong. It should look like https://abcdxyz.supabase.co (no /rest/v1, no quotes).');
export const db = createClient(url?.trim(), key?.trim(), { auth: { persistSession: false } });
