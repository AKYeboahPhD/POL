'use client';
import { useEffect, useMemo, useState } from 'react';
import { parseCsv } from '@/lib/csv';

const TZ = 'Africa/Accra';
const hhmm = (d) => new Date(d).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const dt = (d) => new Date(d).toLocaleString('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const minsOf = (d) => { const t = new Date(new Date(d).toLocaleString('en-US', { timeZone: TZ })); return t.getHours() * 60 + t.getMinutes(); };
const lab = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const smsOf = (a) => a.sms_outbox?.[0]?.status || 'none';
const cls = { delivered: '', sent: '', queued: ' amber', failed: ' red', none: '' };
const initials = (n) => n.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
const F0 = { q: '', status: 'all', type: 'all', sms: 'all', slot: null };
const ICON = { overview: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>,
  attendees: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  testimonies: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  import: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></> };
const Ico = ({ n }) => <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">{ICON[n]}</svg>;
const post = (u, b, m = 'POST') => fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });

export default function Admin() {
  const [d, setD] = useState(null); const [tab, setTab] = useState('overview'); const [f, setF] = useState(F0); const [lim, setLim] = useState(100);
  const [sel, setSel] = useState(null); const [order, setOrder] = useState('recent'); const [gran, setGran] = useState(30);
  const [msg, setMsg] = useState(''); const [tf, setTf] = useState('pending'); const [busy, setBusy] = useState(false);
  const [imp, setImp] = useState(null); const [impRows, setImpRows] = useState([]);

  const load = async () => { const r = await fetch('/api/admin/data'); if (r.ok) setD(await r.json()); };
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);
  const A = d?.attendees || [];
  const upd = (p) => { setF({ ...f, ...p }); setLim(100); };
  const go = (p) => { setF({ ...F0, ...p }); setLim(100); setSel(null); setTab('attendees'); };

  const stats = useMemo(() => { const c = A.filter((a) => a.checked_in_at), sms = { delivered: 0, sent: 0, queued: 0, failed: 0, none: 0 }; c.forEach((a) => { sms[smsOf(a)]++; }); return { total: A.length, checked: c.length, walkins: A.filter((a) => a.source === 'walkin').length, sms }; }, [A]);
  const buckets = useMemo(() => {
    const m = new Map(); A.filter((a) => a.checked_in_at).forEach((a) => { const b = Math.floor(minsOf(a.checked_in_at) / gran) * gran; const o = m.get(b) || { pre: 0, walk: 0 }; a.source === 'walkin' ? o.walk++ : o.pre++; m.set(b, o); });
    if (!m.size) return []; const ks = [...m.keys()], out = []; for (let b = Math.min(...ks); b <= Math.max(...ks); b += gran) out.push({ b, ...(m.get(b) || { pre: 0, walk: 0 }) }); return out;
  }, [A, gran]);
  const peak = buckets.reduce((x, y) => (y.pre + y.walk > (x.pre + x.walk || 0) ? y : x), {}); const maxB = Math.max(1, ...buckets.map((x) => x.pre + x.walk));

  const rows = useMemo(() => {
    const q = f.q.trim().toLowerCase().replace(/\s+/g, '');
    const r = A.filter((a) => (!q || (a.full_name + a.phone + a.reg_code).toLowerCase().replace(/\s+/g, '').includes(q)) && (f.status === 'all' || (f.status === 'in') === !!a.checked_in_at)
      && (f.type === 'all' || (f.type === 'walkin') === (a.source === 'walkin')) && (f.sms === 'all' || smsOf(a) === f.sms)
      && (!f.slot || (a.checked_in_at && Math.floor(minsOf(a.checked_in_at) / f.slot.g) * f.slot.g === f.slot.b)));
    return order === 'name' ? r.sort((x, y) => x.full_name.localeCompare(y.full_name)) : r.sort((x, y) => (y.checked_in_at || '').localeCompare(x.checked_in_at || '') || y.created_at.localeCompare(x.created_at));
  }, [A, f, order]);
  const cur = A.find((a) => a.id === sel);

  const checkInNow = async (a) => { setBusy(true); await post('/api/admin/checkin', { id: a.id }); await load(); setBusy(false); };
  const retry = async () => { const r = await (await post('/api/admin/retry', {})).json(); setMsg(`Retried ${r.retried} message(s).`); load(); };
  const mod = async (id, status) => { await post('/api/admin/testimony', { id, status }, 'PATCH'); load(); };
  const pick = async (file) => {
    if (!file) return; setImp(null); const t = parseCsv(await file.text()); if (t.length < 2) return setImp({ error: 'The file has no rows.' });
    const h = t[0].map((x) => x.toLowerCase().replace(/[^a-z]/g, '')); const ix = (re) => h.findIndex((x) => re.test(x)); const n = ix(/name/), p = ix(/phone|mobile|number|tel|contact/), e = ix(/mail/);
    if (n < 0 || p < 0) return setImp({ error: 'Could not find name and phone columns. Use the template headers: full_name, phone, email.' });
    const rs = t.slice(1).map((r) => ({ name: r[n], phone: r[p], email: e >= 0 ? r[e] : '' })); setImpRows(rs); setImp(await (await post('/api/admin/import', { rows: rs, dryRun: true })).json());
  };
  const doImport = async () => { setBusy(true); const r = await (await post('/api/admin/import', { rows: impRows, dryRun: false })).json(); setBusy(false); setImp({ ...r, done: true }); load(); };
  const template = 'data:text/csv;charset=utf-8,' + encodeURIComponent('full_name,phone,email\nAma Mensah,0241234567,ama@example.com\nKofi Boateng,0551234567,\n');

  if (!d) return <main className="wrap"><p className="mut">Loading…</p></main>;
  const pct = stats.total ? Math.round((stats.checked / stats.total) * 1000) / 10 : 0;
  const TABS = [['overview', 'Overview'], ['attendees', `Attendees (${stats.total})`], ['testimonies', `Testimonies (${d.testimonies.length})`], ['import', 'Import']];
  const tw = d.testimonies.filter((t) => tf === 'all' || t.status === tf);
  const filtered = f.q || f.status !== 'all' || f.type !== 'all' || f.sms !== 'all' || f.slot;

  return (
    <div className="ad">
      <aside className="ad-rail">
        <div className="ad-av" style={{ borderRadius: 12, marginBottom: 8 }}>🌱</div>
        {TABS.map(([id, t]) => <button key={id} title={t} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}><Ico n={id} /></button>)}
      </aside>
      <div className="ad-main">
        <div className="ad-top">
          {TABS.map(([id, t]) => <button key={id} className={'t' + (tab === id ? ' on' : '')} onClick={() => setTab(id)}>{t}</button>)}
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}><a className="ad-btn" href="/api/admin/export?format=csv">CSV</a><a className="ad-btn pri" href="/api/admin/export?format=xlsx">Export Excel</a></span>
        </div>
        <div className={'ad-body' + (tab === 'attendees' && sel ? ' has-sel' : '')}>

          {tab === 'overview' && <div className="ad-pane">
            <h1 style={{ marginTop: 0 }}>Pray Out Loud 2026</h1>
            <div className="stats">
              {[['Total attendees', stats.total, {}], ['Checked in', `${stats.checked} (${pct}%)`, { status: 'in' }], ['Not yet arrived', stats.total - stats.checked, { status: 'out' }], ['Walk-ins', stats.walkins, { type: 'walkin' }]].map(([k, v, p]) =>
                <button key={k} className="card" style={{ textAlign: 'left', margin: 0, cursor: 'pointer', fontWeight: 400 }} onClick={() => go(p)}><span className="mut">{k}</span><div className="big">{v}</div><span className="mut">View list</span></button>)}
            </div>
            <section className="card"><div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}><div><h2>Arrivals over time</h2><p className="mut">Click a bar to see who arrived then. {peak.b !== undefined && `Peak ${lab(peak.b)} · ${peak.pre + peak.walk}`}</p></div>
              <div>{[15, 30, 60].map((g) => <button key={g} className={'sm' + (gran === g ? ' pri' : '')} onClick={() => setGran(g)}>{g} min</button>)}</div></div>
              {buckets.length === 0 ? <p className="mut" style={{ marginTop: 14 }}>No check-ins yet.</p> :
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 190, marginTop: 16, overflowX: 'auto' }}>
                  {buckets.map((x) => <div key={x.b} onClick={() => go({ slot: { b: x.b, g: gran } })} title={`${lab(x.b)}: ${x.pre + x.walk} check-ins (${x.pre} preregistered, ${x.walk} walk-ins)`} style={{ flex: '1 0 34px', textAlign: 'center', fontSize: 12, cursor: 'pointer' }}>
                    <div>{x.pre + x.walk || ''}</div>
                    <div style={{ height: ((x.pre + x.walk) / maxB) * 140, display: 'flex', flexDirection: 'column-reverse', borderRadius: '6px 6px 0 0', overflow: 'hidden' }}><div style={{ flex: x.pre, background: 'var(--g)' }} /><div style={{ flex: x.walk, background: '#8fbfb4' }} /></div>
                    <span className="mut">{lab(x.b)}</span></div>)}
                </div>}
              <p className="mut" style={{ marginTop: 8 }}><span style={{ color: 'var(--g)' }}>■</span> Preregistered &nbsp;<span style={{ color: '#8fbfb4' }}>■</span> Walk-ins</p></section>
            <div className="grid" style={{ marginTop: 18 }}>
              <section className="card"><h2>Attendance</h2><div className="big">{pct}% <span className="mut" style={{ fontSize: 14 }}>have arrived</span></div>
                <div style={{ height: 10, background: 'var(--line)', borderRadius: 9, overflow: 'hidden', margin: '10px 0' }}><div style={{ width: pct + '%', height: '100%', background: 'var(--g)' }} /></div><p className="mut">{stats.total - stats.checked} still expected</p></section>
              <section className="card"><h2>Confirmation SMS</h2>
                <p>{['delivered', 'sent', 'queued', 'failed'].map((s) => <button key={s} className={'pill' + cls[s]} style={{ border: 0, width: 'auto', margin: '0 6px 6px 0', cursor: 'pointer' }} onClick={() => go({ sms: s })}>{stats.sms[s]} {s}</button>)}</p>
                {(stats.sms.failed > 0 || stats.sms.queued > 0) && <button className="sm" onClick={retry}>Retry failed and queued</button>} <span className="mut">{msg}</span></section>
            </div></div>}

          {tab === 'attendees' && <>
            <div className="ad-list">
              <div className="mut" style={{ letterSpacing: '.08em', fontSize: 11 }}>ATTENDEES · {rows.length} OF {stats.total}</div>
              <input style={{ marginTop: 8 }} placeholder="Search name, mobile or reg code" value={f.q} onChange={(e) => upd({ q: e.target.value })} />
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <select className="ad-sel" value={f.status} onChange={(e) => upd({ status: e.target.value })}><option value="all">All status</option><option value="in">Checked in</option><option value="out">Not arrived</option></select>
                <select className="ad-sel" value={f.type} onChange={(e) => upd({ type: e.target.value })}><option value="all">All types</option><option value="pre">Preregistered</option><option value="walkin">Walk-in</option></select></div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <select className="ad-sel" value={f.sms} onChange={(e) => upd({ sms: e.target.value })}><option value="all">All SMS</option><option value="delivered">Delivered</option><option value="sent">Sent</option><option value="queued">Queued</option><option value="failed">Failed</option><option value="none">Not sent</option></select>
                <select className="ad-sel" value={order} onChange={(e) => setOrder(e.target.value)}><option value="recent">Latest first</option><option value="name">Name A–Z</option></select></div>
              {f.slot && <p className="mut" style={{ marginTop: 8 }}>Arrivals {lab(f.slot.b)}–{lab(f.slot.b + f.slot.g)}</p>}
              {filtered && <button className="sm" style={{ marginTop: 8 }} onClick={() => { setF(F0); setLim(100); }}>Clear filters</button>}
              {rows.slice(0, lim).map((a) => <button key={a.id} className={'ad-gc' + (sel === a.id ? ' sel' : '')} onClick={() => setSel(a.id)}>
                <div style={{ fontWeight: 600 }}>{a.full_name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}><span className={'pill' + (a.checked_in_at ? '' : ' amber')}>{a.checked_in_at ? 'Checked in' : 'Not arrived'}</span><span className="mut">{a.source === 'walkin' ? 'Walk-in' : 'Preregistered'}</span><span className="mut" style={{ marginLeft: 'auto' }}>{a.checked_in_at ? hhmm(a.checked_in_at) : ''}</span></div></button>)}
              {rows.length === 0 && <p className="mut" style={{ marginTop: 14 }}>No attendees match.</p>}
              {rows.length > lim && <button onClick={() => setLim(lim + 100)}>Show more</button>}
            </div>
            <div className="ad-pane det">
              {!cur ? <div style={{ textAlign: 'center', marginTop: 60 }}><h2>Select a guest</h2><p className="mut">Choose someone from the list to see their check-in and SMS details.</p></div> : <>
                <button className="sm ad-back" onClick={() => setSel(null)} style={{ marginBottom: 12 }}>← Back to list</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div className="ad-av">{initials(cur.full_name)}</div>
                  <div><h1 style={{ margin: 0, fontSize: 26 }}>{cur.full_name}</h1><span className="mut">+{cur.phone} · {cur.reg_code}</span></div>
                  <div style={{ marginLeft: 'auto' }}>{!cur.checked_in_at ? <button className="pri" style={{ margin: 0 }} disabled={busy} onClick={() => checkInNow(cur)}>Check in and send SMS</button> : <span className="pill">Checked in {hhmm(cur.checked_in_at)}</span>}</div></div>
                <table className="tbl" style={{ marginTop: 22 }}><tbody>
                  {[['Status', cur.checked_in_at ? 'Checked in · ' + dt(cur.checked_in_at) : 'Not arrived'], ['Type', cur.source === 'walkin' ? 'Walk-in' : 'Preregistered'], ['Mobile', '+' + cur.phone], ['Email', cur.email || '—'], ['Added', dt(cur.created_at)]].map(([k, v]) => <tr key={k}><td className="mut" style={{ width: 130 }}>{k}</td><td>{v}</td></tr>)}
                  <tr><td className="mut">Confirmation SMS</td><td>{cur.checked_in_at ? <><span className={'pill' + cls[smsOf(cur)]}>{smsOf(cur) === 'none' ? 'not sent' : smsOf(cur)}</span>{cur.sms_outbox?.[0]?.error && <div className="err">{cur.sms_outbox[0].error}</div>}{smsOf(cur) === 'failed' && <div><button className="sm" style={{ marginTop: 8 }} onClick={retry}>Retry failed SMS</button> <span className="mut">{msg}</span></div>}</> : <span className="mut">Sent automatically on check-in</span>}</td></tr>
                </tbody></table></>}
            </div></>}

          {tab === 'testimonies' && <div className="ad-pane"><h1 style={{ marginTop: 0 }}>Anonymous testimonies</h1>
            <p style={{ margin: '8px 0' }}>{['pending', 'approved', 'rejected', 'all'].map((s) => <button key={s} className={'sm' + (tf === s ? ' pri' : '')} onClick={() => setTf(s)}>{s} {s === 'all' ? d.testimonies.length : d.testimonies.filter((t) => t.status === s).length}</button>)}</p>
            {tw.length === 0 && <p className="mut">Nothing here.</p>}
            {tw.map((t) => <div key={t.id} className="card" style={{ marginTop: 12 }}><p>{t.body}</p><p className="mut">{t.theme || 'No theme'} · <span className={'pill' + (t.status === 'pending' ? ' amber' : t.status === 'rejected' ? ' red' : '')}>{t.status}</span></p>
              <button className="sm pri" onClick={() => mod(t.id, 'approved')}>Approve</button><button className="sm" onClick={() => mod(t.id, 'rejected')}>Reject</button></div>)}</div>}

          {tab === 'import' && <div className="ad-pane"><h1 style={{ marginTop: 0 }}>Import preregistered guests</h1>
            <section className="card"><p className="mut">Upload a CSV with full_name, phone and email columns (in Excel: File → Save As → CSV). Existing numbers are skipped, and nobody is checked in or texted by importing. <a href={template} download="guest-template.csv" style={{ color: 'var(--g)', fontWeight: 600 }}>Download template</a></p>
              <input type="file" accept=".csv,text/csv" style={{ marginTop: 12 }} onChange={(e) => pick(e.target.files[0])} />
              {imp?.error && <p className="err">{imp.error}</p>}
              {imp && !imp.error && <div className="found"><p><span className="pill">{imp.done ? imp.added : imp.ready} {imp.done ? 'added' : 'ready to add'}</span> <span className="pill amber">{imp.duplicates} already registered</span> <span className="pill red">{imp.errors.length} problems</span></p>
                {imp.errors.slice(0, 15).map((e, i) => <p key={i} className="err">Row {e.row}: {e.msg}</p>)}{imp.errors.length > 15 && <p className="mut">…and {imp.errors.length - 15} more.</p>}
                {!imp.done && imp.ready > 0 && <button className="pri" disabled={busy} onClick={doImport}>Import {imp.ready} guests</button>}{imp.done && <p>Done. Guests are now in the Attendees list.</p>}</div>}</section></div>}
        </div>
      </div>
    </div>);
}
