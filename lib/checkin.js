import { db } from './db';
import { deliver, welcomeText } from './sms';
export async function checkIn(a, wantSms) {
  // Conditional update = no double check-in even if two volunteers tap at once
  const { data } = await db.from('attendees').update({ checked_in_at: new Date().toISOString() }).eq('id', a.id).is('checked_in_at', null).select().maybeSingle();
  const row = data || a;
  if (data && wantSms) {
    const { data: o } = await db.from('sms_outbox').insert({ attendee_id: a.id, message: welcomeText(a.full_name) }).select().single();
    await deliver(o, a.phone);
  }
  return { name: row.full_name, reg_code: row.reg_code, tail: row.phone.slice(-4), at: row.checked_in_at, already: !data, sms: !!wantSms };
}
