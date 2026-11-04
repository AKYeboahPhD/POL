export const dynamic = 'force-dynamic';
import ExcelJS from 'exceljs';
import { db } from '@/lib/db';
import { toCsv } from '@/lib/csv';
const when = (d) => (d ? new Date(d).toLocaleString('en-GB', { timeZone: 'Africa/Accra' }) : '');
export async function GET(req) {
  const fmt = new URL(req.url).searchParams.get('format') === 'xlsx' ? 'xlsx' : 'csv';
  const { data } = await db.from('attendees').select('reg_code,full_name,phone,email,source,checked_in_at,sms_outbox(status)').order('created_at').limit(10000);
  const head = ['Reg code', 'Name', 'Mobile', 'Email', 'Type', 'Status', 'Checked in at (GMT)', 'SMS'];
  const rows = (data || []).map((a) => [a.reg_code, a.full_name, '+' + a.phone, a.email || '', a.source === 'walkin' ? 'Walk-in' : 'Preregistered', a.checked_in_at ? 'Checked in' : 'Not arrived', when(a.checked_in_at), a.sms_outbox?.[0]?.status || 'not sent']);
  const name = `pray-out-loud-attendees-${new Date().toISOString().slice(0, 10)}`;
  if (fmt === 'csv') return new Response(toCsv([head, ...rows]), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}.csv"` } });
  const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('Attendees');
  ws.addRow(head).font = { bold: true }; rows.forEach((r) => ws.addRow(r));
  ws.columns.forEach((c, i) => { c.width = [11, 28, 16, 28, 14, 13, 22, 12][i]; }); ws.views = [{ state: 'frozen', ySplit: 1 }];
  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${name}.xlsx"` } });
}
