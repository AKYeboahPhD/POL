// Always write/read fresh data: never cache this route.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { db } from '@/lib/db';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };
const STATUSES = ['pending', 'approved', 'rejected'];

// PATCH /api/admin/testimony  { id: uuid, status: 'pending' | 'approved' | 'rejected' }
// Protected by middleware.js (matcher covers /api/admin/*).
export async function PATCH(req) {
  let payload;
  try { payload = await req.json(); } catch { return Response.json({ error: 'Invalid request.' }, { status: 400, headers: NO_STORE }); }

  const id = typeof payload?.id === 'string' ? payload.id : '';
  const status = payload?.status;
  if (!id) return Response.json({ error: 'Missing testimony id.' }, { status: 400, headers: NO_STORE });
  if (!STATUSES.includes(status)) return Response.json({ error: 'Invalid status.' }, { status: 400, headers: NO_STORE });

  try {
    const { data, error } = await db.from('testimonies').update({ status }).eq('id', id).select('id,status');
    if (error) throw new Error(error.message);
    if (!data || !data.length) return Response.json({ error: 'Testimony not found.' }, { status: 404, headers: NO_STORE });
    return Response.json({ ok: true, testimony: data[0] }, { headers: NO_STORE });
  } catch (e) {
    console.error('[gather] testimony moderation failed:', e);
    return Response.json({ error: 'Could not update the testimony. Please try again.' }, { status: 500, headers: NO_STORE });
  }
}
