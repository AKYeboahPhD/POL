import { db } from '@/lib/db';
import { checkIn } from '@/lib/checkin';
// Staff check-in from the admin (also sends the welcome SMS).
export async function POST(req) {
  const { id } = await req.json();
  const { data: a } = await db.from('attendees').select('*').eq('id', id).maybeSingle();
  if (!a) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(await checkIn(a, true));
}
