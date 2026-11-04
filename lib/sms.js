import { db } from './db';
import { EVENT } from './event';
export const welcomeText = (name) =>
  `Hi ${name.split(' ')[0]}, you're checked in for ${EVENT.name}! Head to the main auditorium. Share a testimony anonymously: ${process.env.APP_URL}/share`;

async function arkesel(phone, message) {
  if (process.env.SMS_DRY_RUN === 'true') return 'dry-run';
  const r = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
    method: 'POST',
    headers: { 'api-key': process.env.ARKESEL_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender: process.env.ARKESEL_SENDER_ID, message, recipients: [phone],
      callback_url: `${process.env.APP_URL}/api/sms/callback?token=${process.env.CALLBACK_TOKEN}` }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.status !== 'success') throw new Error(j.message || `Arkesel ${r.status}`);
  return j.data?.[0]?.id ?? null;
}

// Never throws: a failed SMS must not affect check-in. Result is stored for retry.
export async function deliver(row, phone) {
  try {
    const id = await arkesel(phone, row.message);
    await db.from('sms_outbox').update({ status: 'sent', provider_id: id, error: null, attempts: (row.attempts || 0) + 1, updated_at: new Date() }).eq('id', row.id);
  } catch (e) {
    await db.from('sms_outbox').update({ status: 'failed', error: String(e.message).slice(0, 200), attempts: (row.attempts || 0) + 1, updated_at: new Date() }).eq('id', row.id);
  }
}
