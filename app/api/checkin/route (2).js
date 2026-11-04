import { db } from '@/lib/db';
import { normalizePhone } from '@/lib/phone';
import { checkIn } from '@/lib/checkin';

const hits = new Map(); // best-effort rate limit (per server instance)

// One endpoint for everyone: registered or not. Name + phone in, check-in + SMS out.
export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for') || 'x'; const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60000);
  if (recent.length >= 20) return Response.json({ error: 'Too many tries. Please ask the welcome team.' }, { status: 429 });
  hits.set(ip, [...recent, now]);

  try {
  const { name, phone } = await req.json();
  const p = normalizePhone(phone);
  if (!name?.trim() || name.trim().length < 2) return Response.json({ error: 'Enter your full name.' }, { status: 400 });
  if (!p) return Response.json({ error: 'Enter a valid mobile number, e.g. 024 123 4567.' }, { status: 400 });

  let { data: a, error: e1 } = await db.from('attendees').select('*').eq('phone', p).maybeSingle();
  if (e1) throw new Error('Database read failed: ' + e1.message + ' (did schema.sql run? is the secret key correct?)');
  if (!a) {
    const ins = await db.from('attendees').insert({ full_name: name.trim(), phone: p, source: 'walkin' }).select().single();
    if (ins.error?.code === '23505') ({ data: a } = await db.from('attendees').select('*').eq('phone', p).maybeSingle()); // two taps at once
    else if (ins.error) throw new Error('Database insert failed: ' + ins.error.message);
    else a = ins.data;
  }
  // Already checked in -> no second SMS. New check-in -> SMS with the testimony link.
  return Response.json(await checkIn(a, true));
  } catch (e) {
    console.error('[gather] check-in failed:', e);
    return Response.json({ error: 'Something went wrong on our side. Please see the welcome desk.' }, { status: 500 });
  }
}
