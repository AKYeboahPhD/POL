import { db } from '@/lib/db';
import { normalizePhone } from '@/lib/phone';
const hits = new Map(); // best-effort rate limit (per server instance)
export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for') || 'x'; const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60000);
  if (recent.length >= 10) return Response.json({ error: 'Too many tries. Please ask the welcome team.' }, { status: 429 });
  hits.set(ip, [...recent, now]);
  const phone = normalizePhone((await req.json()).phone);
  if (!phone) return Response.json({ error: 'Enter a valid mobile number, e.g. 024 123 4567.' }, { status: 400 });
  const { data: a } = await db.from('attendees').select('id,full_name,reg_code,phone,checked_in_at').eq('phone', phone).maybeSingle();
  if (!a) return Response.json({ error: 'No registration found. Try another number or join as a walk-in.' }, { status: 404 });
  // Privacy: only first name + last 4 digits go to the public page
  return Response.json({ id: a.id, firstName: a.full_name.split(' ')[0], reg_code: a.reg_code, tail: a.phone.slice(-4), checkedIn: !!a.checked_in_at });
}
