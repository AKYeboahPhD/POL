import { db } from '@/lib/db';
import { normalizePhone } from '@/lib/phone';
// POST { rows: [{name, phone, email}], dryRun }  -> validates, skips duplicates, optionally inserts as "preregistered"
export async function POST(req) {
  const { rows = [], dryRun = true } = await req.json();
  if (rows.length > 5000) return Response.json({ error: 'Max 5,000 rows per import.' }, { status: 400 });
  const errors = [], seen = new Set(), ready = [];
  rows.forEach((r, i) => {
    const n = i + 2, name = String(r.name || '').trim(), phone = normalizePhone(r.phone);
    if (name.length < 2) return errors.push({ row: n, msg: 'Full name is missing.' });
    if (!phone) return errors.push({ row: n, msg: `Invalid mobile number "${r.phone || ''}".` });
    if (seen.has(phone)) return errors.push({ row: n, msg: 'Repeated number in this file (skipped).', dup: true });
    seen.add(phone); ready.push({ full_name: name, phone, email: String(r.email || '').trim() || null, source: 'preregistered' });
  });
  const existing = new Set();
  for (let i = 0; i < ready.length; i += 200) {
    const { data } = await db.from('attendees').select('phone').in('phone', ready.slice(i, i + 200).map((x) => x.phone));
    (data || []).forEach((x) => existing.add(x.phone));
  }
  const fresh = ready.filter((x) => !existing.has(x.phone));
  let added = 0;
  if (!dryRun) for (let i = 0; i < fresh.length; i += 500) {
    const { error } = await db.from('attendees').insert(fresh.slice(i, i + 500));
    if (error) return Response.json({ error: 'Import stopped: ' + error.message, added }, { status: 500 });
    added += Math.min(500, fresh.length - i);
  }
  return Response.json({ total: rows.length, ready: fresh.length, duplicates: existing.size, errors, added });
}
