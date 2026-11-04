import { db } from '@/lib/db';
export async function POST(req) {
  const { body, theme, consent } = await req.json();
  if (!body?.trim() || body.length > 2000 || !consent) return Response.json({ error: 'Write your testimony and confirm consent.' }, { status: 400 });
  // Intentionally stores nothing else: no IP, phone, or attendee link.
  await db.from('testimonies').insert({ body: body.trim(), theme: ['Answered prayer', 'Gratitude', 'Breakthrough'].includes(theme) ? theme : null });
  return Response.json({ ok: true });
}
