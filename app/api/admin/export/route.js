export const dynamic = 'force-dynamic';
import ExcelJS from 'exceljs';
import { db } from '@/lib/db';
import { fetchAll } from '@/lib/fetchAll';
import { toCsv } from '@/lib/csv';
import { HEAD, attendeeRows, latestSms } from '@/lib/exports';

// GET /api/admin/export?scope=checkins|all&format=csv|xlsx   (defaults: checkins, csv)
export async function GET(req) {
  const q = new URL(req.url).searchParams;
  const fmt = q.get('format') === 'xlsx' ? 'xlsx' : 'csv';
  const scope = q.get('scope') === 'all' ? 'all' : 'checkins';

  const a = await fetchAll(() => db.from('attendees').select('id,reg_code,full_name,phone,email,source,checked_in_at,created_at').order('created_at').order('id'));
  if (a.error) return Response.json({ error: a.error.message }, { status: 500 });
  const s = await fetchAll(() => db.from('sms_outbox').select('attendee_id,status,updated_at').order('updated_at', { ascending: false }).order('id'));

  const rows = attendeeRows(a.data, latestSms(s.data), scope);
  const name = `pray-out-loud-${scope === 'all' ? 'all-attendees' : 'checkins'}-${new Date().toISOString().slice(0, 10)}`;
  const nocache = { 'Cache-Control': 'no-store' };

  if (fmt === 'csv') return new Response(toCsv([HEAD, ...rows]), { headers: { ...nocache, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}.csv"` } });

  const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet(scope === 'all' ? 'Attendees' : 'Check-ins');
  ws.addRow(HEAD).font = { bold: true }; rows.forEach((r) => ws.addRow(r));
  ws.columns.forEach((c, i) => { c.width = [6, 11, 28, 18, 28, 14, 13, 14, 20, 16][i]; }); ws.views = [{ state: 'frozen', ySplit: 1 }];
  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf, { headers: { ...nocache, 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${name}.xlsx"` } });
}
