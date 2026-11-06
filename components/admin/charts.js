'use client';
import { useEffect, useRef, useState } from 'react';

export const COLORS = { pre: '#d99a2b', walk: '#4a2c12', out: '#dccdb6', delivered: '#1f9d74', sent: '#3b8fa8', queued: '#d99a2b', failed: '#cf3b22', none: '#b3a28c',
  approved: '#1f9d74', pending: '#d99a2b', rejected: '#cf3b22', theme: ['#d99a2b', '#7a4a1e', '#1f9d74', '#b3a28c'] };

export function useSize() {
  const ref = useRef(null); const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width))); ro.observe(el); setW(Math.floor(el.clientWidth));
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export function useCountUp(value, ms = 900) {
  const [v, setV] = useState(0); const from = useRef(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setV(value); return undefined; }
    const a = from.current, t0 = performance.now(); let raf;
    const tick = (t) => { const k = Math.min(1, (t - t0) / ms), e = 1 - (1 - k) ** 3; setV(a + (value - a) * e); if (k < 1) raf = requestAnimationFrame(tick); else from.current = value; };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return Math.round(v);
}

const niceStep = (x) => { const p = 10 ** Math.floor(Math.log10(x || 1)), n = x / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };
const scaleMax = (max) => { const step = niceStep(Math.max(max, 4) / 4); return { step, top: Math.ceil(Math.max(max, 1) / step) * step }; };

// Smooth line through points (monotone cubic, so the curve never overshoots the data).
function smooth(pts) {
  if (pts.length < 3) return pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ',' + p[1]).join('');
  const n = pts.length, dx = [], dy = [], m = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; dy[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]; }
  m[0] = dy[0]; m[n - 1] = dy[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = dy[i - 1] * dy[i] <= 0 ? 0 : (dy[i - 1] + dy[i]) / 2;
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) { const h = dx[i] / 3; d += `C${pts[i][0] + h},${pts[i][1] + m[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - m[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`; }
  return d;
}

/* ---------- Arrivals over time: per-slot bars or cumulative area, hover tooltip, click to pin ---------- */
export function ArrivalsChart({ data, mode = 'bars', show = { pre: true, walk: true }, height = 270, selected = null, onSelect }) {
  const [ref, w] = useSize(); const [hi, setHi] = useState(null);
  const m = { l: 40, r: 12, t: 14, b: 30 }; const iw = Math.max(0, w - m.l - m.r), ih = height - m.t - m.b, n = data.length;
  const vp = (d) => (show.pre ? d.pre : 0), vw = (d) => (show.walk ? d.walk : 0);
  const cp = (d) => (show.pre ? d.cumPre : 0), cw = (d) => (show.walk ? d.cumWalk : 0);
  const maxV = Math.max(1, ...data.map((d) => (mode === 'bars' ? vp(d) + vw(d) : cp(d) + cw(d))));
  const { step, top } = scaleMax(maxV);
  const y = (v) => m.t + ih - (v / top) * ih;
  const slot = n ? iw / n : 0, cx = (i) => m.l + slot * (i + 0.5);
  const bw = Math.max(4, Math.min(54, slot * 0.7));
  const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(iw / 52))));
  const ticks = []; for (let v = 0; v <= top + 0.001; v += step) ticks.push(v);
  const idx = (e) => { const r = e.currentTarget.getBoundingClientRect(); return Math.max(0, Math.min(n - 1, Math.floor((e.clientX - r.left - m.l) / slot))); };
  const hd = hi != null ? data[hi] : null;
  const preA = data.map((d, i) => [cx(i), y(cp(d))]), allA = data.map((d, i) => [cx(i), y(cp(d) + cw(d))]);
  const base = m.t + ih;
  const area = (top_, bot_) => smooth(top_) + smooth([...bot_].reverse()).replace(/^M/, 'L') + 'Z';
  const floor = data.map((d, i) => [cx(i), base]);

  return (
    <div ref={ref} className="adm-chart" style={{ height }}>
      {w > 0 && n > 0 && <svg width={w} height={height} role="img" aria-label="Check-ins over time">
        {ticks.map((t) => <g key={t}><line x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} className="adm-grid" /><text x={m.l - 8} y={y(t) + 4} textAnchor="end" className="adm-axis">{t}</text></g>)}
        {data.map((d, i) => i % every === 0 && <text key={d.b} x={cx(i)} y={height - 9} textAnchor="middle" className="adm-axis">{d.label}</text>)}
        {(hi != null || selected != null) && data.map((d, i) => (i === hi || d.b === selected) && <rect key={'h' + d.b} x={m.l + slot * i} y={m.t} width={slot} height={ih} className={'adm-hl' + (d.b === selected ? ' on' : '')} rx="6" />)}

        {mode === 'bars' && data.map((d, i) => { const a = vp(d), b = vw(d); return (
          <g key={d.b} className="adm-bar" style={{ transformOrigin: `${cx(i)}px ${base}px`, animationDelay: i * 25 + 'ms' }}>
            {a > 0 && <rect x={cx(i) - bw / 2} y={y(a)} width={bw} height={base - y(a)} rx={b > 0 ? 0 : 6} fill={COLORS.pre} />}
            {b > 0 && <rect x={cx(i) - bw / 2} y={y(a + b)} width={bw} height={y(a) - y(a + b)} rx="6" fill={COLORS.walk} />}
          </g>); })}

        {mode === 'cum' && <g>
          {show.pre && <path d={area(preA, floor)} fill={COLORS.pre} opacity=".85" className="adm-fade" />}
          {show.walk && <path d={area(allA, show.pre ? preA : floor)} fill={COLORS.walk} opacity=".85" className="adm-fade" />}
          <path d={smooth(allA)} fill="none" stroke="#1f1208" strokeWidth="2" strokeLinejoin="round" className="adm-fade" />
          {n === 1 && <circle cx={cx(0)} cy={allA[0][1]} r="5" fill="#1f1208" />}
          {hi != null && <circle cx={cx(hi)} cy={allA[hi][1]} r="5" fill="#fff" stroke="#1f1208" strokeWidth="2.5" />}
        </g>}

        <rect x={m.l} y={m.t} width={iw} height={ih} fill="transparent" style={{ cursor: 'pointer' }}
          onPointerMove={(e) => setHi(idx(e))} onPointerDown={(e) => setHi(idx(e))} onPointerLeave={() => setHi(null)}
          onClick={(e) => onSelect?.(data[idx(e)].b === selected ? null : data[idx(e)])} />
      </svg>}
      {w > 0 && n === 0 && <div className="adm-empty">No check-ins yet. They'll appear here live as guests arrive.</div>}
      {hd && <div className="adm-tip" style={{ left: Math.min(Math.max(cx(hi), 92), w - 92), top: 6 }}>
        <b>{hd.label}–{hd.end}</b>
        <div><i style={{ background: COLORS.pre }} />Preregistered <b>{hd.pre}</b></div>
        <div><i style={{ background: COLORS.walk }} />Walk-ins <b>{hd.walk}</b></div>
        <div className="adm-tip-sum">{mode === 'cum' ? 'Total so far' : 'In this slot'} <b>{mode === 'cum' ? hd.cum : hd.total}</b></div>
      </div>}
    </div>);
}

/* ---------- Donut with hover / click segments ---------- */
export function Donut({ segments, size = 188, thickness = 24, centerLabel = 'Total', onPick, activeKey = null }) {
  const [hov, setHov] = useState(null);
  const total = segments.reduce((s, x) => s + x.value, 0), r = (size - thickness - 8) / 2, C = 2 * Math.PI * r;
  let acc = 0; const cur = segments.find((s) => s.key === (hov ?? activeKey));
  return (
    <div className="adm-donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={centerLabel}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(120,96,70,.18)" strokeWidth={thickness} />
        {total > 0 && segments.map((s) => { if (!s.value) return null; const len = (s.value / total) * C, off = -acc; acc += len; const on = (hov ?? activeKey) === s.key;
          return <circle key={s.key} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={on ? thickness + 6 : thickness}
            strokeDasharray={`${Math.max(0, len - (segments.filter((x) => x.value).length > 1 ? 2 : 0))} ${C}`} strokeDashoffset={off} transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-width .18s, opacity .18s', cursor: onPick ? 'pointer' : 'default', opacity: (hov ?? activeKey) && !on ? 0.45 : 1 }}
            onPointerEnter={() => setHov(s.key)} onPointerLeave={() => setHov(null)} onClick={() => onPick?.(s.key)} />; })}
        <text x="50%" y="47%" textAnchor="middle" className="adm-donut-n">{cur ? cur.value : total}</text>
        <text x="50%" y="47%" dy="22" textAnchor="middle" className="adm-donut-l">{cur ? `${cur.label} · ${total ? Math.round((cur.value / total) * 100) : 0}%` : centerLabel}</text>
      </svg>
      <ul className="adm-legend">
        {segments.map((s) => <li key={s.key}><button type="button" className={(hov ?? activeKey) === s.key ? 'on' : ''} onClick={() => onPick?.(s.key)} onPointerEnter={() => setHov(s.key)} onPointerLeave={() => setHov(null)}>
          <i style={{ background: s.color }} /><span>{s.label}</span><b>{s.value}</b></button></li>)}
      </ul>
    </div>);
}

/* ---------- Horizontal bars (themes etc.) ---------- */
export function HBars({ rows, onPick }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return <ul className="adm-hbars">{rows.map((r) => <li key={r.key}>
    <button type="button" onClick={() => onPick?.(r.key)} title={onPick ? `Show ${r.label}` : undefined}><span className="adm-hb-l">{r.label}</span><span className="adm-hb-t"><span style={{ width: (r.value / max) * 100 + '%', background: r.color }} /></span><b>{r.value}</b></button></li>)}</ul>;
}

/* ---------- Small area sparkline (pace, submissions) ---------- */
export function Spark({ values, labels, height = 86, color = '#d99a2b', unit = '' }) {
  const [ref, w] = useSize(); const [hi, setHi] = useState(null);
  const n = values.length, max = Math.max(1, ...values), pad = 6;
  const px = (i) => pad + (n > 1 ? (i * (w - pad * 2)) / (n - 1) : (w - pad * 2) / 2), py = (v) => height - 16 - (v / max) * (height - 30);
  const pts = values.map((v, i) => [px(i), py(v)]);
  return (
    <div ref={ref} className="adm-chart" style={{ height }}>
      {w > 0 && n > 0 && <svg width={w} height={height} onPointerLeave={() => setHi(null)}
        onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHi(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left - pad) / Math.max(1, w - pad * 2)) * (n - 1))))); }}>
        <defs><linearGradient id={'sg' + color.slice(1)} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".45" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        <path d={smooth(pts) + `L${pts[n - 1][0]},${height - 16}L${pts[0][0]},${height - 16}Z`} fill={`url(#sg${color.slice(1)})`} className="adm-fade" />
        <path d={smooth(pts)} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" className="adm-fade" />
        {hi != null && <g><line x1={px(hi)} x2={px(hi)} y1="4" y2={height - 16} className="adm-grid" /><circle cx={px(hi)} cy={py(values[hi])} r="4.5" fill="#fff" stroke={color} strokeWidth="2.5" /></g>}
        {labels && <><text x={pad} y={height - 2} className="adm-axis">{labels[0]}</text><text x={w - pad} y={height - 2} textAnchor="end" className="adm-axis">{labels[n - 1]}</text></>}
      </svg>}
      {hi != null && <div className="adm-tip sm" style={{ left: Math.min(Math.max(px(hi), 50), w - 50), top: 0 }}>{labels ? labels[hi] + ' · ' : ''}<b>{values[hi]}</b>{unit}</div>}
    </div>);
}

/* ---------- Progress ring ---------- */
export function Ring({ pct, size = 64, thickness = 8, color = '#d99a2b' }) {
  const r = (size - thickness) / 2, C = 2 * Math.PI * r;
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true"><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(120,96,70,.2)" strokeWidth={thickness} />
    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={thickness} strokeLinecap="round" strokeDasharray={`${(Math.min(100, pct) / 100) * C} ${C}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dasharray .8s cubic-bezier(.22,1,.36,1)' }} /></svg>;
}
