'use client';
import { useMemo, useState } from 'react';
import AnimatedContent from '@/components/AnimatedContent';
import { ArrivalsChart, Donut, HBars, Spark, Ring, useCountUp, COLORS } from '@/components/admin/charts';
import { EVENT } from '@/lib/event';
import { hhmm, dt, lab, smsOf, initials, arrivalBuckets, recentPace, insights } from '@/lib/adminStats';

const SMS_LABEL = { delivered: 'Delivered', sent: 'Sent', queued: 'Queued', failed: 'Failed', none: 'Not sent' };
const SMS_TONE = { delivered: 'green', sent: 'green', queued: 'amber', failed: 'red', none: '' };
const Num = ({ v, suffix = '' }) => { const n = useCountUp(v); return <>{n}{suffix}</>; };
const Pill = ({ tone = '', children }) => <span className={'adm-pill ' + tone}>{children}</span>;
// Dashboard entrance animation (AnimatedContent template settings)
const AN = (p) => <AnimatedContent distance={100} direction="vertical" duration={0.8} ease="power3.out" blur={0} threshold={0.1} {...p} />;
const pdfUrl = (t) => `/api/admin/testimonies/pdf?status=${t.status}&theme=${encodeURIComponent(t.theme)}&q=${encodeURIComponent(t.q || '')}&order=${t.order}`;
const Ic = ({ d, s = 18 }) => <svg viewBox="0 0 24 24" width={s} height={s} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
const DL = <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>;

/* ============ shared: arrivals chart with controls ============ */
function ArrivalsPanel({ A, go, height = 270, title = 'Arrivals over time' }) {
  const [gran, setGran] = useState(30); const [mode, setMode] = useState('bars'); const [show, setShow] = useState({ pre: true, walk: true }); const [sel, setSel] = useState(null);
  const data = useMemo(() => arrivalBuckets(A, gran), [A, gran]);
  const peak = data.reduce((x, y) => (y.total > (x.total || 0) ? y : x), {});
  const cur = data.find((d) => d.b === sel?.b);
  return (
    <section className="adm-card">
      <div className="adm-h"><div><h2>{title}</h2><p className="adm-sub">{peak.total ? `Peak ${peak.label} · ${peak.total} check-ins` : 'Live: updates as guests check in'}</p></div>
        <div className="adm-ctl">
          <div className="adm-seg" role="group" aria-label="Chart view">{[['bars', 'Per slot'], ['cum', 'Cumulative']].map(([k, l]) => <button key={k} className={mode === k ? 'on' : ''} onClick={() => setMode(k)}>{l}</button>)}</div>
          <div className="adm-seg" role="group" aria-label="Slot length">{[15, 30, 60].map((g) => <button key={g} className={gran === g ? 'on' : ''} onClick={() => { setGran(g); setSel(null); }}>{g} min</button>)}</div>
        </div></div>
      <ArrivalsChart data={data} mode={mode} show={show} height={height} selected={sel?.b ?? null} onSelect={setSel} />
      <div className="adm-legendrow">
        {[['pre', 'Preregistered'], ['walk', 'Walk-ins']].map(([k, l]) => <button key={k} aria-pressed={show[k]} className={'adm-key' + (show[k] ? '' : ' off')} onClick={() => setShow({ ...show, [k]: !show[k] })}><i style={{ background: COLORS[k] }} />{l}</button>)}
        <span className="adm-sub" style={{ marginLeft: 'auto' }}>{cur ? '' : 'Hover for details · click a slot to pin it'}</span>
      </div>
      {cur && <div className="adm-pin"><span><b>{cur.label}–{cur.end}</b> · {cur.total} check-in{cur.total === 1 ? '' : 's'} <span className="adm-sub">({cur.pre} preregistered · {cur.walk} walk-ins)</span></span>
        <button className="adm-btn sm pri" onClick={() => go('attendees', { slot: { b: cur.b, g: cur.g } })}>View these guests</button></div>}
    </section>);
}

/* ============ OVERVIEW ============ */
export function Overview(c) {
  const { A, T, S, TS, go, retry, msg, open } = c;
  const recent = useMemo(() => A.filter((a) => a.checked_in_at).sort((x, y) => y.checked_in_at.localeCompare(x.checked_in_at)).slice(0, 8), [A]);
  const kpis = [
    { k: 'Checked in', v: S.checked, sub: `of ${S.total} registered`, ring: S.pct, tone: COLORS.pre, p: { status: 'in' } },
    { k: 'Not yet arrived', v: S.notArrived, sub: S.total ? `${Math.round((100 - S.pct) * 10) / 10}% still expected` : 'No guests yet', tone: COLORS.out, p: { status: 'out' } },
    { k: 'Walk-ins', v: S.walkinsIn, sub: S.checked ? `${S.walkShare}% of arrivals` : 'Registered at the door', tone: COLORS.walk, p: { type: 'walkin', status: 'in' } },
    { k: 'Testimonies', v: TS.total, sub: TS.status.pending ? `${TS.status.pending} waiting for review` : 'All reviewed', tone: '#7a4a1e', tab: 'testimonies', p: { status: TS.status.pending ? 'pending' : 'all' } },
  ];
  const attention = [
    TS.status.pending > 0 && { t: `${TS.status.pending} testimon${TS.status.pending === 1 ? 'y' : 'ies'} waiting for review`, b: 'Review', fn: () => go('testimonies', { status: 'pending' }) },
    S.sms.failed > 0 && { t: `${S.sms.failed} confirmation SMS failed`, b: 'Retry', fn: retry },
    S.sms.queued > 0 && { t: `${S.sms.queued} SMS still queued`, b: 'Retry', fn: retry },
  ].filter(Boolean);
  return (
    <div className="adm-stack">
      <AN><div className="adm-hero"><div><h1>{EVENT.name}</h1><p className="adm-sub">{EVENT.date} · {EVENT.venue}, {EVENT.city} · Theme: {EVENT.theme}</p></div>
        <div className="adm-ctl"><a className="adm-btn gold" href="/api/admin/export?scope=checkins"><Ic d={DL} />Check-ins CSV</a><a className="adm-btn gold" href="/api/admin/testimonies/pdf?status=approved"><Ic d={DL} />Testimonies PDF</a></div></div></AN>

      <AN stagger={0.08} className="adm-kpis">
        {kpis.map((x) => <button key={x.k} className="adm-card adm-kpi" onClick={() => go(x.tab || 'attendees', x.p)} style={{ '--tone': x.tone }}>
          <span className="adm-kpi-k">{x.k}</span><span className="adm-kpi-v"><Num v={x.v} /></span><span className="adm-sub">{x.sub}</span>
          {x.ring != null && <span className="adm-kpi-ring"><Ring pct={x.ring} /><b>{Math.round(x.ring)}%</b></span>}</button>)}
      </AN>

      <div className="adm-cols">
        <AN><ArrivalsPanel A={A} go={go} /></AN>
        <AN><section className="adm-card"><div className="adm-h"><div><h2>Latest check-ins</h2><p className="adm-sub"><span className="adm-livedot" /> Live from the check-in page</p></div></div>
          {recent.length === 0 ? <p className="adm-empty-s">No one has checked in yet.</p> : <ul className="adm-feed">{recent.map((a) => <li key={a.id}><button onClick={() => open(a.id)}>
            <span className="adm-av">{initials(a.full_name)}</span><span className="adm-feed-n"><b>{a.full_name}</b><span className="adm-sub">{a.source === 'walkin' ? 'Walk-in' : 'Preregistered'}</span></span>
            <span className="adm-feed-t">{hhmm(a.checked_in_at)}</span></button></li>)}</ul>}
        </section></AN>
      </div>

      <div className="adm-cols even">
        <AN><section className="adm-card"><h2>Needs attention</h2>
          {attention.length === 0 ? <p className="adm-ok">All caught up. Nothing needs your attention.</p> : <ul className="adm-att">{attention.map((x) => <li key={x.t}><span>{x.t}</span><button className="adm-btn sm pri" onClick={x.fn}>{x.b}</button></li>)}</ul>}
          {msg && <p className="adm-sub" style={{ marginTop: 8 }}>{msg}</p>}</section></AN>
        <AN><section className="adm-card"><h2>Exports</h2><p className="adm-sub">Always built from the live data, ready to download.</p>
          <div className="adm-exports">
            <a className="adm-btn" href="/api/admin/export?scope=checkins"><Ic d={DL} />Check-ins <b>.csv</b></a>
            <a className="adm-btn" href="/api/admin/export?scope=all"><Ic d={DL} />All attendees <b>.csv</b></a>
            <a className="adm-btn" href="/api/admin/testimonies/pdf?status=approved"><Ic d={DL} />Approved testimonies <b>.pdf</b></a>
            <a className="adm-btn" href="/api/admin/testimonies/pdf?status=all"><Ic d={DL} />All testimonies <b>.pdf</b></a>
          </div></section></AN>
      </div>
    </div>);
}

/* ============ ANALYTICS ============ */
export function Analytics(c) {
  const { A, S, TS, go, retry, msg } = c;
  const ins = useMemo(() => insights(A), [A]);
  const pace = useMemo(() => recentPace(A), [A]);
  const [tstat, setTstat] = useState(null);
  const paceLabels = pace.bins.map((_, i) => { const m = new Date(Date.now() - (pace.bins.length - i) * pace.step * 60000); return hhmm(m); });
  const tiles = [
    { k: 'Check-in rate', v: S.pct, suffix: '%', sub: `${S.checked} of ${S.total} guests` },
    { k: 'Last 60 minutes', v: pace.total, sub: 'check-ins' },
    { k: 'Busiest 15 minutes', txt: ins.busiest ? ins.busiest.label : '—', sub: ins.busiest ? `${ins.busiest.total} check-ins` : 'No data yet' },
    { k: 'Average pace', v: ins.perHour, sub: 'check-ins per hour' },
    { k: 'Preregistered show-up', v: S.preRate, suffix: '%', sub: `${S.preIn} of ${S.pre} came` },
    { k: 'First → latest arrival', txt: ins.first ? `${hhmm(ins.first)} → ${hhmm(ins.last)}` : '—', sub: ins.first ? 'event time (GMT)' : 'No data yet' },
  ];
  const arrived = [
    { key: 'preIn', label: 'Preregistered arrived', value: S.preIn, color: COLORS.pre },
    { key: 'walkIn', label: 'Walk-ins', value: S.walkinsIn, color: COLORS.walk },
    { key: 'out', label: 'Still expected', value: S.notArrived, color: COLORS.out },
  ];
  const source = [{ key: 'pre', label: 'Preregistered', value: S.pre, color: COLORS.pre }, { key: 'walkin', label: 'Walk-ins', value: S.walkins, color: COLORS.walk }];
  const smsSeg = ['delivered', 'sent', 'queued', 'failed', 'none'].map((k) => ({ key: k, label: SMS_LABEL[k], value: S.sms[k], color: COLORS[k] }));
  const tStatus = ['approved', 'pending', 'rejected'].map((k) => ({ key: k, label: k[0].toUpperCase() + k.slice(1), value: TS.status[k] || 0, color: COLORS[k] }));
  const themeRows = TS.byTheme.map((r, i) => ({ key: r.theme, label: r.theme, value: r.count, color: COLORS.theme[Math.min(i, 3)] }));
  return (
    <div className="adm-stack">
      <AN><div className="adm-hero"><div><h1>Analytics</h1><p className="adm-sub">Interactive: hover for detail, click any chart to open the matching guests or testimonies.</p></div></div></AN>

      <AN stagger={0.08} className="adm-tiles">
        {tiles.map((x) => <div key={x.k} className="adm-card adm-tile"><span className="adm-kpi-k">{x.k}</span>
          <span className={'adm-tile-v' + (x.txt ? ' txt' : '')}>{x.txt ?? <Num v={x.v} suffix={x.suffix} />}</span><span className="adm-sub">{x.sub}</span></div>)}
      </AN>

      <AN><ArrivalsPanel A={A} go={go} height={320} title="Check-ins over time" /></AN>

      <AN stagger={0.1} className="adm-grid3">
        <section className="adm-card"><h2>Who has arrived</h2><p className="adm-sub">Click a slice to see those guests</p>
          <Donut segments={arrived} centerLabel="registered" onPick={(k) => go('attendees', k === 'out' ? { status: 'out' } : { status: 'in', type: k === 'walkIn' ? 'walkin' : 'pre' })} /></section>
        <section className="adm-card"><h2>Registration source</h2><p className="adm-sub">How guests got on the list</p>
          <Donut segments={source} centerLabel="guests" onPick={(k) => go('attendees', { type: k })} /></section>
        <section className="adm-card"><h2>Confirmation SMS</h2><p className="adm-sub">For checked-in guests</p>
          <Donut segments={smsSeg} centerLabel="checked in" onPick={(k) => go('attendees', { sms: k, status: 'in' })} />
          {(S.sms.failed > 0 || S.sms.queued > 0) && <button className="adm-btn sm pri" style={{ marginTop: 10 }} onClick={retry}>Retry failed and queued</button>} {msg && <span className="adm-sub">{msg}</span>}</section>
      </AN>

      <AN><section className="adm-card"><div className="adm-h"><div><h2>Arrival pace · last 60 minutes</h2><p className="adm-sub">{pace.total} check-in{pace.total === 1 ? '' : 's'} in 5-minute steps. Slows down? Time to send a reminder.</p></div></div>
        <Spark values={pace.bins} labels={paceLabels} height={110} unit=" in 5 min" /></section></AN>

      <AN><div className="adm-h" style={{ marginTop: 6 }}><div><h2 className="adm-sec">Testimonies</h2></div></div></AN>
      <AN stagger={0.1} className="adm-grid3">
        <section className="adm-card"><h2>By status</h2><p className="adm-sub">Click to review that group</p>
          <Donut segments={tStatus} centerLabel="testimonies" onPick={(k) => go('testimonies', { status: k })} /></section>
        <section className="adm-card"><h2>By theme</h2><p className="adm-sub">Click a theme to read them</p>
          {themeRows.length ? <HBars rows={themeRows} onPick={(k) => go('testimonies', { status: 'all', theme: k === 'No theme' ? 'none' : k })} /> : <p className="adm-empty-s">No testimonies yet.</p>}
          <p className="adm-sub" style={{ marginTop: 12 }}>Average length <b>{TS.avgLen}</b> characters · longest <b>{TS.longest}</b></p></section>
        <section className="adm-card"><h2>Submissions by hour</h2><p className="adm-sub">When guests share testimonies</p>
          {TS.perHour.length ? <Spark values={TS.perHour.map((x) => x.count)} labels={TS.perHour.map((x) => x.label)} height={120} color="#7a4a1e" unit=" testimonies" /> : <p className="adm-empty-s">Waiting for the first testimony.</p>}</section>
      </AN>
    </div>);
}

/* ============ ATTENDEES ============ */
export function Attendees(c) {
  const { A, S, rows, f, upd, clear, order, setOrder, lim, setLim, sel, setSel, cur, checkInNow, busy, retry, msg, filtered } = c;
  return (
    <div className="adm-stack">
      <AN><div className="adm-hero"><div><h1>Attendees</h1><p className="adm-sub">{rows.length} of {S.total} guests{filtered ? ' match your filters' : ''}</p></div>
        <div className="adm-ctl"><a className="adm-btn gold" href="/api/admin/export?scope=checkins"><Ic d={DL} />Check-ins CSV</a><a className="adm-btn" href="/api/admin/export?scope=all"><Ic d={DL} />All attendees CSV</a></div></div></AN>
      <AN><div className={'adm-split' + (sel ? ' has-sel' : '')}>
        <section className="adm-card adm-listcard">
          <input className="adm-in" placeholder="Search name, mobile or reg code" value={f.q} onChange={(e) => upd({ q: e.target.value })} />
          <div className="adm-filters">
            <select className="adm-in" value={f.status} onChange={(e) => upd({ status: e.target.value })}><option value="all">All status</option><option value="in">Checked in</option><option value="out">Not arrived</option></select>
            <select className="adm-in" value={f.type} onChange={(e) => upd({ type: e.target.value })}><option value="all">All types</option><option value="pre">Preregistered</option><option value="walkin">Walk-in</option></select>
            <select className="adm-in" value={f.sms} onChange={(e) => upd({ sms: e.target.value })}><option value="all">All SMS</option>{['delivered', 'sent', 'queued', 'failed', 'none'].map((k) => <option key={k} value={k}>{SMS_LABEL[k]}</option>)}</select>
            <select className="adm-in" value={order} onChange={(e) => setOrder(e.target.value)}><option value="recent">Latest first</option><option value="name">Name A–Z</option></select>
          </div>
          {f.slot && <p className="adm-sub" style={{ marginTop: 8 }}>Arrivals {lab(f.slot.b)}–{lab(f.slot.b + f.slot.g)}</p>}
          {filtered && <button className="adm-btn sm" style={{ marginTop: 8 }} onClick={clear}>Clear filters</button>}
          <div className="adm-guests">
            {rows.slice(0, lim).map((a) => <button key={a.id} className={'adm-guest' + (sel === a.id ? ' sel' : '')} onClick={() => setSel(a.id)}>
              <span className="adm-av sm">{initials(a.full_name)}</span><span className="adm-guest-n"><b>{a.full_name}</b>
                <span><Pill tone={a.checked_in_at ? 'green' : 'amber'}>{a.checked_in_at ? 'Checked in' : 'Not arrived'}</Pill> <span className="adm-sub">{a.source === 'walkin' ? 'Walk-in' : 'Preregistered'}</span></span></span>
              <span className="adm-feed-t">{a.checked_in_at ? hhmm(a.checked_in_at) : ''}</span></button>)}
            {rows.length === 0 && <p className="adm-empty-s">No attendees match.</p>}
            {rows.length > lim && <button className="adm-btn" style={{ width: '100%' }} onClick={() => setLim(lim + 100)}>Show more</button>}
          </div>
        </section>
        <section className="adm-card adm-detail">
          {!cur ? <div className="adm-empty-s" style={{ textAlign: 'center', padding: '60px 10px' }}><h2>Select a guest</h2><p className="adm-sub">Choose someone from the list to see their check-in and SMS details.</p></div> : <>
            <button className="adm-btn sm adm-back" onClick={() => setSel(null)}>← Back to list</button>
            <div className="adm-dh"><span className="adm-av lg">{initials(cur.full_name)}</span><div><h2 style={{ fontSize: 24 }}>{cur.full_name}</h2><span className="adm-sub">+{cur.phone} · {cur.reg_code}</span></div>
              <div style={{ marginLeft: 'auto' }}>{!cur.checked_in_at ? <button className="adm-btn pri" disabled={busy} onClick={() => checkInNow(cur)}>Check in and send SMS</button> : <Pill tone="green">Checked in {hhmm(cur.checked_in_at)}</Pill>}</div></div>
            <table className="adm-tbl"><tbody>
              {[['Status', cur.checked_in_at ? 'Checked in · ' + dt(cur.checked_in_at) : 'Not arrived'], ['Type', cur.source === 'walkin' ? 'Walk-in' : 'Preregistered'], ['Mobile', '+' + cur.phone], ['Email', cur.email || '—'], ['Added', dt(cur.created_at)]].map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}
              <tr><td>Confirmation SMS</td><td>{cur.checked_in_at ? <><Pill tone={SMS_TONE[smsOf(cur)]}>{SMS_LABEL[smsOf(cur)]}</Pill>{cur.sms_outbox?.[0]?.error && <div className="adm-err">{cur.sms_outbox[0].error}</div>}
                {smsOf(cur) === 'failed' && <div style={{ marginTop: 8 }}><button className="adm-btn sm" onClick={retry}>Retry failed SMS</button> <span className="adm-sub">{msg}</span></div>}</> : <span className="adm-sub">Sent automatically on check-in</span>}</td></tr>
            </tbody></table></>}
        </section>
      </div></AN>
    </div>);
}

/* ============ TESTIMONIES ============ */
export function Testimonies(c) {
  const { T, TS, tf, setTf, mod, fresh, go } = c;
  const themes = useMemo(() => [...new Set(T.map((t) => t.theme).filter(Boolean))].sort(), [T]); // only themes that really exist in submitted testimonies
  const list = useMemo(() => {
    const q = tf.q.trim().toLowerCase();
    const r = T.filter((t) => (tf.status === 'all' || t.status === tf.status) && (tf.theme === 'all' || (tf.theme === 'none' ? !t.theme : t.theme === tf.theme)) && (!q || t.body.toLowerCase().includes(q)));
    return tf.order === 'oldest' ? r.slice().reverse() : r;
  }, [T, tf]);
  const chips = [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['all', 'All']];
  return (
    <div className="adm-stack">
      <AN><div className="adm-hero"><div><h1>Anonymous testimonies</h1><p className="adm-sub">Sent from the share page, they appear here instantly. Nothing links a testimony to a guest.</p></div>
        <div className="adm-ctl"><a className={'adm-btn gold' + (list.length ? '' : ' disabled')} href={list.length ? pdfUrl(tf) : undefined} aria-disabled={!list.length}><Ic d={DL} />Export PDF ({list.length})</a></div></div></AN>
      <AN><section className="adm-card">
        <div className="adm-toolbar">
          <div className="adm-seg" role="group" aria-label="Status">{chips.map(([k, l]) => <button key={k} className={tf.status === k ? 'on' : ''} onClick={() => setTf({ ...tf, status: k })}>{l} <b>{k === 'all' ? TS.total : TS.status[k] || 0}</b></button>)}</div>
          <select className="adm-in" value={tf.theme} onChange={(e) => setTf({ ...tf, theme: e.target.value })}><option value="all">All themes</option>{themes.map((t) => <option key={t} value={t}>{t}</option>)}<option value="none">No theme</option></select>
          <select className="adm-in" value={tf.order} onChange={(e) => setTf({ ...tf, order: e.target.value })}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select>
          <input className="adm-in" placeholder="Search testimonies" value={tf.q} onChange={(e) => setTf({ ...tf, q: e.target.value })} />
        </div>
        <p className="adm-sub" style={{ marginTop: 10 }}>The PDF export uses the filters above. Showing {list.length} of {TS.total}.</p>
      </section></AN>
      {list.length === 0 && <AN><section className="adm-card"><p className="adm-empty-s">{TS.total ? 'No testimonies match these filters.' : 'No testimonies yet. They will appear here the moment a guest submits one.'}</p></section></AN>}
      <AN stagger={0.06} className="adm-tgrid">
        {list.slice(0, 60).map((t) => <article key={t.id} className="adm-card adm-t">
          <div className="adm-t-top"><Pill tone={t.status === 'approved' ? 'green' : t.status === 'rejected' ? 'red' : 'amber'}>{t.status}</Pill>{fresh.has(t.id) && <Pill tone="navy">New</Pill>}<span className="adm-sub" style={{ marginLeft: 'auto' }}>{t.theme || 'No theme'} · {dt(t.created_at)}</span></div>
          <p className="adm-t-body">{t.body}</p>
          <div className="adm-t-act">{t.status !== 'approved' && <button className="adm-btn sm pri" onClick={() => mod(t.id, 'approved')}>Approve</button>}{t.status !== 'rejected' && <button className="adm-btn sm" onClick={() => mod(t.id, 'rejected')}>Reject</button>}{t.status !== 'pending' && <button className="adm-btn sm" onClick={() => mod(t.id, 'pending')}>Back to pending</button>}</div>
        </article>)}
      </AN>
      {list.length > 60 && <p className="adm-sub" style={{ textAlign: 'center' }}>Showing the first 60. Narrow the filters to see others. The PDF includes all {list.length}.</p>}
    </div>);
}

/* ============ IMPORT ============ */
export function Import(c) {
  const { imp, pick, doImport, busy, template } = c;
  return (
    <div className="adm-stack">
      <AN><div className="adm-hero"><div><h1>Import preregistered guests</h1><p className="adm-sub">Bring in a guest list from Excel or Google Sheets.</p></div></div></AN>
      <AN><section className="adm-card">
        <p className="adm-sub" style={{ fontSize: 14 }}>Upload a CSV with full_name, phone and email columns (in Excel: File → Save As → CSV). Existing numbers are skipped, and nobody is checked in or texted by importing. <a href={template} download="guest-template.csv" className="adm-link">Download template</a></p>
        <input type="file" accept=".csv,text/csv" className="adm-in" style={{ marginTop: 14 }} onChange={(e) => pick(e.target.files[0])} />
        {imp?.error && <p className="adm-err">{imp.error}</p>}
        {imp && !imp.error && <div className="adm-found"><p><Pill tone="green">{imp.done ? imp.added : imp.ready} {imp.done ? 'added' : 'ready to add'}</Pill> <Pill tone="amber">{imp.duplicates} already registered</Pill> <Pill tone="red">{imp.errors.length} problems</Pill></p>
          {imp.errors.slice(0, 15).map((e, i) => <p key={i} className="adm-err">Row {e.row}: {e.msg}</p>)}{imp.errors.length > 15 && <p className="adm-sub">…and {imp.errors.length - 15} more.</p>}
          {!imp.done && imp.ready > 0 && <button className="adm-btn pri" disabled={busy} onClick={doImport}>Import {imp.ready} guests</button>}{imp.done && <p>Done. Guests are now in the Attendees list.</p>}</div>}
      </section></AN>
    </div>);
}
