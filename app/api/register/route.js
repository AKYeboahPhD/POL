import { db } from '@/lib/db';
import { normalizePhone } from '@/lib/phone';
import { checkIn } from '@/lib/checkin';
export async function POST(req) {
  const { name, phone, email, sms } = await req.json();
  const p = normalizePhone(phone);
  if (!name?.trim()) return Response.json({ error: 'Enter your full name.' }, { status: 400 });
  if (!p) return Response.json({ error: 'Enter a valid mobile number, e.g. 024 123 4567.' }, { status: 400 });
  const { data: a, error } = await db.from('attendees').insert({ full_name: name.trim(), phone: p, email: email?.trim() || null, source: 'walkin' }).select().single();
  if (error?.code === '23505') return Response.json({ error: 'This number is already registered. Use "Already registered?" to check in.' }, { status: 409 });
  if (error) return Response.json({ error: 'Could not register. Please see the welcome desk.' }, { status: 500 });
  return Response.json(await checkIn(a, sms));
}
