export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';

const STATUSES = ['pending', 'approved', 'rejected'];

// PATCH /api/admin/testimony  { id, status: 'pending' | 'approved' | 'rejected' }
// Protected by middleware.js (admin login). Saves the moderation decision in the database.
export async function PATCH(req) {
  const b = await req.json().catch(() => null);
  const id = b?.id, status = b?.status;
  if (!id || typeof id !== 'string' || !STATUSES.includes(status)) return Response.json({ error: 'Invalid request.' }, { status: 400 });

  const { data, error } = await db.from('testimonies').update({ status }).eq('id', id).select('id,status').maybeSingle();
  if (error) { console.error('[gather] testimony status update failed:', error); return Response.json({ error: 'Could not update the testimony.' }, { status: 500 }); }
  if (!data) return Response.json({ error: 'Testimony not found.' }, { status: 404 });
  return Response.json({ ok: true, id: data.id, status: data.status });
}
