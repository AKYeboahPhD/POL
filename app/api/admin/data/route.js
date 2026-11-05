// Always read fresh data: never cache this route.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
import { db } from '@/lib/db';
import { fetchAll } from '@/lib/fetchAll';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

export async function GET() {
  const a = await fetchAll(() => db.from('attendees')
    .select('id,full_name,phone,email,reg_code,source,checked_in_at,created_at').order('created_at', { ascending: false }).order('id'));
  if (a.error) { console.error('[gather] admin attendees failed:', a.error); return Response.json({ error: a.error.message }, { status: 500, headers: NO_STORE }); }
  const attendees = a.data;

  // SMS status is fetched separately and joined here (no database relationship needed)
  const s = await fetchAll(() => db.from('sms_outbox').select('attendee_id,status,error,updated_at').order('updated_at', { ascending: false }).order('id'));
  if (s.error) console.error('[gather] admin sms failed:', s.error);
  const latest = new Map();
  s.data.forEach((x) => { if (!latest.has(x.attendee_id)) latest.set(x.attendee_id, { status: x.status, error: x.error }); });
  attendees.forEach((x) => { x.sms_outbox = latest.has(x.id) ? [latest.get(x.id)] : []; });

  const t = await fetchAll(() => db.from('testimonies').select('*').order('created_at', { ascending: false }).order('id'));
  if (t.error) console.error('[gather] admin testimonies failed:', t.error);
  return Response.json({ attendees, testimonies: t.data, serverTime: Date.now() }, { headers: NO_STORE });
}
