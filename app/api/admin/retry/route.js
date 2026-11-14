export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;
import { db } from '@/lib/db';
import { deliver } from '@/lib/sms';

// POST /api/admin/retry — resend every SMS that is 'failed' or 'queued'.
// Protected by middleware.js (matcher covers /api/admin/*).
// Sends up to 200 per click, 10 at a time. Click again if more remain.
export async function POST() {
  const { data: rows, error } = await db
    .from('sms_outbox')
    .select('id,message,attempts,attendees(phone)')
    .in('status', ['failed', 'queued'])
    .order('updated_at', { ascending: true })
    .limit(200);
  if (error) return Response.json({ error: error.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });

  const todo = (rows || []).filter((r) => r.attendees?.phone);
  for (let i = 0; i < todo.length; i += 10) {
    await Promise.all(todo.slice(i, i + 10).map((r) => deliver(r, r.attendees.phone)));
  }

  // Report how they ended up
  const ids = todo.map((r) => r.id);
  let sent = 0, failed = 0;
  if (ids.length) {
    const { data: after } = await db.from('sms_outbox').select('status').in('id', ids);
    for (const a of after || []) a.status === 'failed' ? failed++ : sent++;
  }
  return Response.json({ retried: todo.length, sent, failed }, { headers: { 'Cache-Control': 'no-store' } });
}
