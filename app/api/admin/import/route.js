export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;
import { db } from '@/lib/db';
import { normalizePhone } from '@/lib/phone';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

// A person on the list counts as "showed up" only when the phone number matches AND at least one name word is shared.
const words = (s) => new Set(String(s || '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((w) => w.length > 1));
const shareName = (a, b) => { const x = words(a), y = words(b); for (const w of x) if (y.has(w)) return true; return false; };

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
  const existing = new Map(); // phone -> source
  const phones = clean.map((c) => c.phone);
  for (let i = 0; i < phones.length; i += 200) {
    const { data, error } = await db.from('attendees').select('phone,source,full_name').in('phone', phones.slice(i, i + 200));
    if (error) return Response.json({ error: error.message }, { status: 500, headers: NO_STORE });
    (data || []).forEach((a) => existing.set(a.phone, { source: a.source, name: a.full_name }));
  }
  const fresh = clean.filter((c) => !existing.has(c.phone));
  // On the list AND already in the system as a walk-in (they registered at the door with the same number):
  // they were expected, so re-label them as pre-registered. This is how 'registered & showed up' is counted.
  const matchPhones = clean.filter((c) => existing.get(c.phone)?.source === 'walkin' && shareName(c.full_name, existing.get(c.phone).name)).map((c) => c.phone);
  // Same phone number came in under a completely different name: left as a walk-in (one record per phone number).
  const conflicts = clean.filter((c) => existing.get(c.phone)?.source === 'walkin' && !shareName(c.full_name, existing.get(c.phone).name));
  const duplicates = clean.length - fresh.length - matchPhones.length - conflicts.length;
  const conflictRows = conflicts.slice(0, 10).map((c) => ({ listed: c.full_name, cameAs: existing.get(c.phone).name }));

  if (dryRun) return Response.json({ ready: fresh.length + matchPhones.length, matched: matchPhones.length, conflicts: conflicts.length, conflictRows, duplicates, errors }, { headers: NO_STORE });

  let matched = 0;
  for (let i = 0; i < matchPhones.length; i += 200) {
    const { data, error } = await db.from('attendees').update({ source: 'preregistered' }).in('phone', matchPhones.slice(i, i + 200)).eq('source', 'walkin').select('id');
    if (error) return Response.json({ error: error.message }, { status: 500, headers: NO_STORE });
    matched += data?.length || 0;
  }

  let added = 0;
  for (let i = 0; i < fresh.length; i += 200) {
    const { data, error } = await db.from('attendees').upsert(fresh.slice(i, i + 200), { onConflict: 'phone', ignoreDuplicates: true }).select('id');
    if (error) return Response.json({ error: error.message, added, matched }, { status: 500, headers: NO_STORE });
    added += data?.length || 0;
  }
  return Response.json({ ready: 0, added, matched, conflicts: conflicts.length, conflictRows, duplicates, errors }, { headers: NO_STORE });
}
