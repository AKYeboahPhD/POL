export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';
import { fetchAll } from '@/lib/fetchAll';
import { EVENT } from '@/lib/event';
import { buildTestimonyPdf } from '@/lib/testimonyPdf';

// GET /api/admin/testimonies/pdf?status=approved|pending|rejected|all&theme=<name>|none|all&q=<text>&order=newest|oldest
export async function GET(req) {
  const url = new URL(req.url); const p = url.searchParams;
  const status = ['approved', 'pending', 'rejected'].includes(p.get('status')) ? p.get('status') : 'all';
  const theme = p.get('theme') || 'all'; const q = (p.get('q') || '').trim().toLowerCase(); const order = p.get('order') === 'oldest' ? 'oldest' : 'newest';

  const r = await fetchAll(() => db.from('testimonies').select('id,body,theme,status,created_at').order('created_at', { ascending: false }).order('id'));
  if (r.error) return Response.json({ error: r.error.message }, { status: 500 });

  let items = r.data.filter((t) => (status === 'all' || t.status === status)
    && (theme === 'all' || (theme === 'none' ? !t.theme : t.theme === theme)) && (!q || t.body.toLowerCase().includes(q)));
  if (order === 'oldest') items = items.reverse();

  // Brand logo on the cover (optional: the PDF still builds without it).
  let logoPng = null;
  try { const lr = await fetch(new URL('/pol-logo.png', url.origin), { signal: AbortSignal.timeout(4000) }); if (lr.ok) logoPng = new Uint8Array(await lr.arrayBuffer()); } catch {}

  const label = [status === 'all' ? 'All statuses' : status[0].toUpperCase() + status.slice(1), theme !== 'all' ? (theme === 'none' ? 'No theme' : theme) : null, q ? `Search: "${q}"` : null].filter(Boolean).join(' · ');
  const pdf = await buildTestimonyPdf(items, { eventName: EVENT.name, theme: EVENT.theme, filterLabel: label, logoPng });
  const name = `pray-out-loud-testimonies-${status}-${new Date().toISOString().slice(0, 10)}.pdf`;
  return new Response(pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' } });
}
