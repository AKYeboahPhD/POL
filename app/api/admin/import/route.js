export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;
import { db } from '@/lib/db';
import { normalizePhone } from '@/lib/phone';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

// POST /api/admin/import  { rows: [{name, phone, email}], dryRun: boolean }
// Protected by middleware.js. Adds guests as 'preregistered'. Never checks anyone in or sends SMS.
export async function POST(req) {
  const body = await req.json().catch(() => null);
  const rows = Array.isArray(body?.rows) ? body.rows : null;
  if (!rows) return Response.json({ error: 'No rows received.' }, { status: 400, headers: NO_STORE });
  const dryRun = body.dryRun !== false;

  const errors = [];
  const seen = new Set();
  const clean = [];
  rows.forEach((r, i) => {
    const row = i + 2; // +1 header, +1 to be 1-based like Excel
    const name = String(r?.name ?? '').replace(/\s+/g, ' ').trim();
    const phone = normalizePhone(r?.phone);
    if (!name) return errors.push({ row, msg: 'Missing name.' });
    if (!phone) return errors.push({ row, msg: `Invalid phone number (${String(r?.phone ?? '').slice(0, 20)}).` });
    if (seen.has(phone)) return errors.push({ row, msg: 'Same phone number appears earlier in the file.' });
    seen.add(phone);
    clean.push({ full_name: name, phone, email: String(r?.email ?? '').trim() || null, source: 'preregistered' });
  });

  // Which numbers already exist?
  const existing = new Set();
  const phones = clean.map((c) => c.phone);
  for (let i = 0; i < phones.length; i += 200) {
    const { data, error } = await db.from('attendees').select('phone').in('phone', phones.slice(i, i + 200));
    if (error) return Response.json({ error: error.message }, { status: 500, headers: NO_STORE });
    (data || []).forEach((a) => existing.add(a.phone));
  }
  const fresh = clean.filter((c) => !existing.has(c.phone));
  const duplicates = clean.length - fresh.length;

  if (dryRun) return Response.json({ ready: fresh.length, duplicates, errors }, { headers: NO_STORE });

  let added = 0;
  for (let i = 0; i < fresh.length; i += 200) {
    const { data, error } = await db.from('attendees').upsert(fresh.slice(i, i + 200), { onConflict: 'phone', ignoreDuplicates: true }).select('id');
    if (error) return Response.json({ error: error.message, added }, { status: 500, headers: NO_STORE });
    added += data?.length || 0;
  }
  return Response.json({ ready: 0, added, duplicates, errors }, { headers: NO_STORE });
}
