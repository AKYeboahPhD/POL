export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';
export async function GET() {
  const { data: attendees } = await db.from('attendees').select('id,full_name,phone,email,reg_code,source,checked_in_at,created_at,sms_outbox(status,error)').order('created_at', { ascending: false }).limit(5000);
  const { data: testimonies } = await db.from('testimonies').select('*').order('created_at', { ascending: false }).limit(500);
  return Response.json({ attendees: attendees || [], testimonies: testimonies || [] });
}
