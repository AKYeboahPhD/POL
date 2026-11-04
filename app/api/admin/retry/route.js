import { db } from '@/lib/db';
import { deliver } from '@/lib/sms';
export async function POST() {
  const { data } = await db.from('sms_outbox').select('*, attendees(phone)').in('status', ['failed', 'queued']).lt('attempts', 5).limit(100);
  for (const r of data || []) await deliver(r, r.attendees.phone);
  return Response.json({ retried: data?.length || 0 });
}
