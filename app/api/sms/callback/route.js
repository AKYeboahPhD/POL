import { db } from '@/lib/db';
// Arkesel delivery report. Verify the exact payload field names in your Arkesel dashboard/docs and adjust below.
export async function POST(req) {
  if (new URL(req.url).searchParams.get('token') !== process.env.CALLBACK_TOKEN) return new Response('no', { status: 401 });
  const b = await req.json().catch(() => ({}));
  const id = b.id || b.message_id || b.messageId; const s = String(b.status || '').toLowerCase();
  if (id) await db.from('sms_outbox').update({ status: /deliver/.test(s) ? 'delivered' : /fail|reject|undeliv|expire/.test(s) ? 'failed' : 'sent', updated_at: new Date() }).eq('provider_id', id);
  return Response.json({ ok: true });
}
