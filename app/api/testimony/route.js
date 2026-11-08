export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';

const MIN = 15, MAX = 2000;
const hits = new Map(); // best-effort rate limit (per server instance)

// POST /api/testimony  { body: string, consent: true }
// Anonymous by design: no name, phone or attendee id is stored. Saved as "pending" until an admin approves it.
export async function POST(req) {
  const ip = (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim(); const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60000);
  if (recent.length >= 6) return Response.json({ error: 'Too many submissions. Please wait a minute and try again.' }, { status: 429 });
  hits.set(ip, [...recent, now]);

  let payload;
  try { payload = await req.json(); } catch { return Response.json({ error: 'Invalid request. Please try again.' }, { status: 400 }); }

  const body = typeof payload?.body === 'string' ? payload.body.trim() : '';
  if (payload?.consent !== true) return Response.json({ error: 'Please tick the box to confirm you are happy for your testimony to be shared.' }, { status: 400 });
  if (body.length < MIN) return Response.json({ error: 'Please add a little more to your testimony.' }, { status: 400 });
  if (body.length > MAX) return Response.json({ error: `Your testimony is too long. Please keep it under ${MAX.toLocaleString()} characters.` }, { status: 400 });

  try {
    const { error } = await db.from('testimonies').insert({ body });
    if (error) throw new Error(error.message);
    return Response.json({ ok: true });
  } catch (e) {
    console.error('[gather] testimony failed:', e);
    return Response.json({ error: 'Something went wrong on our side. Please try again in a moment.' }, { status: 500 });
  }
}
