import { db } from '@/lib/db';
export async function PATCH(req) {
  const { id, status } = await req.json();
  if (!['approved', 'rejected', 'pending'].includes(status)) return Response.json({ error: 'bad status' }, { status: 400 });
  await db.from('testimonies').update({ status }).eq('id', id);
  return Response.json({ ok: true });
}
