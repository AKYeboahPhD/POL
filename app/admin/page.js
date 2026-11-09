'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Lightfall from '@/components/Lightfall';
import PillNav from '@/components/PillNav';
import { parseCsv } from '@/lib/csv';
import { minsOf, smsOf, summarize, testimonyStats } from '@/lib/adminStats';
import { Overview, Analytics, Attendees, Testimonies, Import } from './views';
import './admin.css';

const TABS = [['overview', 'Overview'], ['analytics', 'Analytics'], ['attendees', 'Attendees'], ['testimonies', 'Testimonies'], ['import', 'Import']];
const F0 = { q: '', status: 'all', type: 'all', sms: 'all', slot: null };
const TF0 = { status: 'pending', theme: 'all', q: '', order: 'newest' };
const POLL_MS = 8000;
const post = (u, b, m = 'POST') => fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
const tabFromHash = () => { const h = (typeof location !== 'undefined' ? location.hash : '').replace('#', ''); return TABS.some(([id]) => id === h) ? h : 'overview'; };

function Live({ at, ok }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  const s = at ? Math.max(0, Math.round((Date.now() - at) / 1000)) : null;
  return <span className={'adm-live-badge' + (ok ? '' : ' bad')} title={ok ? 'Receiving live data from the check-in and testimony pages' : 'Connection problem, retrying'}><i />{ok ? 'Live' : 'Reconnecting'}{s != null && <em> · {s}s</em>}</span>;
}

export default function Admin() {
  const [d, setD] = useState(null); const [tab, setTab] = useState('overview'); const [f, setF] = useState(F0); const [tf, setTf] = useState(TF0);
  const [lim, setLim] = useState(100); const [sel, setSel] = useState(null); const [order, setOrder] = useState('recent');
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const [loadErr, setLoadErr] = useState(''); const [ok, setOk] = useState(true); const [at, setAt] = useState(null);
  const [imp, setImp] = useState(null); const [impRows, setImpRows] = useState([]);
  const [toasts, setToasts] = useState([]); const [fresh, setFresh] = useState(() => new Set()); const [small, setSmall] = useState(false);
  const seen = useRef(null);

  // ----- live data: polls the same database the check-in and share pages write to -----
  const toast = useCallback((text) => { const id = Math.random(); setToasts((x) => [...x.slice(-2), { id, text }]); setTimeout(() => setToasts((x) => x.filter((t) => t.id !== id)), 6000); }, []);
  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/data', { cache: 'no-store' }); const j = await r.json().catch(() => ({}));
      if (!r.ok) { setLoadErr(j.error || `Could not load data (error ${r.status}).`); setOk(false); return; }
      const inIds = new Set(j.attendees.filter((a) => a.checked_in_at).map((a) => a.id)), tIds = new Set(j.testimonies.map((t) => t.id));
      if (seen.current) { // everything after the first load: announce what just arrived
        const newIn = j.attendees.filter((a) => a.checked_in_at && !seen.current.inIds.has(a.id)), newT = j.testimonies.filter((t) => !seen.current.tIds.has(t.id));
        if (newIn.length) toast(newIn.length === 1 ? `${newIn[0].full_name} just checked in` : `${newIn.length} new check-ins: ${newIn.slice(0, 2).map((a) => a.full_name.split(' ')[0]).join(', ')}${newIn.length > 2 ? '…' : ''}`);
        if (newT.length) { toast(newT.length === 1 ? 'New testimony received' : `${newT.length} new testimonies received`); setFresh((s) => new Set([...s, ...newT.map((t) => t.id)])); }
      }
      seen.current = { inIds, tIds }; setD(j); setAt(Date.now()); setLoadErr(''); setOk(true);
    } catch { setLoadErr('No connection.'); setOk(false); }
  }, [toast]);
  useEffect(() => {
    load(); const t = setInterval(() => { if (!document.hidden) load(); }, POLL_MS);
    const vis = () => { if (!document.hidden) load(); }; document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, [load]);

  // ----- navigation (tab lives in the URL hash so back/forward and bookmarks work) -----
  useEffect(() => { const on = () => setTab(tabFromHash()); on(); window.addEventListener('hashchange', on); return () => window.removeEventListener('hashchange', on); }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [tab]);
  useEffect(() => { const on = () => setSmall(window.innerWidth < 700); on(); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on); }, []);
  const goTab = (t) => { if (location.hash === '#' + t) setTab(t); else location.hash = t; };
  const go = (t, patch = {}) => {
    if (t === 'testimonies') setTf({ ...TF0, ...patch }); else { setF({ ...F0, ...patch }); setLim(100); setSel(null); }
    goTab(t);
  };
  const open = (id) => { setF(F0); setLim(100); setSel(id); goTab('attendees'); };

  const A = d?.attendees || [], T = d?.testimonies || [];
  const S = useMemo(() => summarize(A), [A]); const TS = useMemo(() => testimonyStats(T), [T]);
  const upd = (p) => { setF({ ...f, ...p }); setLim(100); };
  const filtered = !!(f.q || f.status !== 'all' || f.type !== 'all' || f.sms !== 'all' || f.slot);
  const rows = useMemo(() => {
    const q = f.q.trim().toLowerCase().replace(/\s+/g, '');
    const r = A.filter((a) => (!q || (a.full_name + a.phone + a.reg_code).toLowerCase().replace(/\s+/g, '').includes(q)) && (f.status === 'all' || (f.status === 'in') === !!a.checked_in_at)
      && (f.type === 'all' || (f.type === 'walkin') === (a.source === 'walkin')) && (f.sms === 'all' || smsOf(a) === f.sms)
      && (!f.slot || (a.checked_in_at && Math.floor(minsOf(a.checked_in_at) / f.slot.g) * f.slot.g === f.slot.b)));
    return order === 'name' ? r.sort((x, y) => x.full_name.localeCompare(y.full_name)) : r.sort((x, y) => (y.checked_in_at || '').localeCompare(x.checked_in_at || '') || y.created_at.localeCompare(x.created_at));
  }, [A, f, order]);
  const cur = A.find((a) => a.id === sel);

  // ----- actions -----
  const checkInNow = async (a) => { setBusy(true); await post('/api/admin/checkin', { id: a.id }); await load(); setBusy(false); };
  const retry = async () => { const r = await (await post('/api/admin/retry', {})).json(); setMsg(`Retried ${r.retried} message(s).`); load(); };
  const mod = async (id, status) => {
    const prev = (d?.testimonies || []).find((t) => t.id === id)?.status;
    setD((x) => ({ ...x, testimonies: x.testimonies.map((t) => (t.id === id ? { ...t, status } : t)) })); // optimistic
    try {
      const r = await post('/api/admin/testimony', { id, status }, 'PATCH');
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || `error ${r.status}`); }
    } catch (e) {
      setD((x) => ({ ...x, testimonies: x.testimonies.map((t) => (t.id === id ? { ...t, status: prev } : t)) })); // roll back
      toast(`Could not save: ${e.message}`);
    }
    load();
  };
  const pick = async (file) => {
    if (!file) return; setImp(null); const t = parseCsv(await file.text()); if (t.length < 2) return setImp({ error: 'The file has no rows.' });
    const h = t[0].map((x) => x.toLowerCase().replace(/[^a-z]/g, '')); const ix = (re) => h.findIndex((x) => re.test(x)); const n = ix(/name/), p = ix(/phone|mobile|number|tel|contact/), e = ix(/mail/);
    if (n < 0 || p < 0) return setImp({ error: 'Could not find name and phone columns. Use the template headers: full_name, phone, email.' });
    const rs = t.slice(1).map((r) => ({ name: r[n], phone: r[p], email: e >= 0 ? r[e] : '' })); setImpRows(rs); setImp(await (await post('/api/admin/import', { rows: rs, dryRun: true })).json());
  };
  const doImport = async () => { setBusy(true); const r = await (await post('/api/admin/import', { rows: impRows, dryRun: false })).json(); setBusy(false); setImp({ ...r, done: true }); load(); };
  const template = 'data:text/csv;charset=utf-8,' + encodeURIComponent('full_name,phone,email\n');

  const c = { A, T, S, TS, go, open, retry, msg, rows, f, upd, clear: () => { setF(F0); setLim(100); }, order, setOrder, lim, setLim, sel, setSel, cur, checkInNow, busy, filtered, tf, setTf, mod, fresh, imp, pick, doImport, template };
  const View = { overview: Overview, analytics: Analytics, attendees: Attendees, testimonies: Testimonies, import: Import }[tab];

  return (
    <div className="adm">
      <div className="adm-bg" aria-hidden="true">
        <Lightfall colors={['#ffe3a0', '#e5a53b']} backgroundColor="#2e1a0c" speed={0.3} streakCount={2} streakWidth={0.8} twinkle={0.3} backgroundGlow={0.1} headGlow={0.6} bloom={0.35}
          mouseInteraction holdToWarp intro streakLength={1} density={0.6} glow={1} depth={0.5} zoom={3} mouseStrength={0.4} mouseRadius={0.45} lens={0.5} fade={0} lightMode={false} dpr={small ? 1 : undefined} />
      </div>

      <header className="adm-head">
        <div className="adm-nav">
          <PillNav logo="/logo.png" logoAlt="Pray Out Loud admin" logoHref="#overview" items={TABS.map(([id, label]) => ({ label, href: '#' + id }))} activeHref={'#' + tab}
            itemStyle="pill" hoverEffect="fill" indicator="dot" layout="split" surface="glass" size="md" bounce={0.3} stretch={0.5} collapse="auto" intro />
        </div>
        <Live at={at} ok={ok} />
      </header>

      <main className="adm-main">
        {loadErr && d && <div className="adm-banner" role="alert">Data problem: {loadErr} Showing the last data we received.</div>}
        {!d ? (loadErr ? <p className="adm-banner" role="alert">Admin could not load: {loadErr}</p> : <p className="adm-loading">Loading…</p>) : <View key={tab} {...c} />}
      </main>

      <div className="adm-toasts" aria-live="polite">{toasts.map((t) => <div key={t.id} className="adm-toast"><i />{t.text}</div>)}</div>
    </div>);
}
