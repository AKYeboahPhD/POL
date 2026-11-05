// Pure analytics helpers for the admin dashboard (no React, easy to test).
export const TZ = 'Africa/Accra';
const hmF = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
const cache = new Map();
export const minsOf = (d) => { let v = cache.get(d); if (v === undefined) { const [h, m] = hmF.format(new Date(d)).split(':'); v = (+h % 24) * 60 + +m; cache.set(d, v); } return v; };
export const hhmm = (d) => new Date(d).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
export const dt = (d) => new Date(d).toLocaleString('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const lab = (m) => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
export const smsOf = (a) => a.sms_outbox?.[0]?.status || 'none';
export const initials = (n = '') => n.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();

export function summarize(A) {
  const checked = A.filter((a) => a.checked_in_at);
  const sms = { delivered: 0, sent: 0, queued: 0, failed: 0, none: 0 };
  checked.forEach((a) => { sms[smsOf(a)]++; });
  const walkins = A.filter((a) => a.source === 'walkin');
  const walkinsIn = walkins.filter((a) => a.checked_in_at).length;
  const pre = A.length - walkins.length, preIn = checked.length - walkinsIn;
  const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0);
  return { total: A.length, checked: checked.length, notArrived: A.length - checked.length, pct: pct(checked.length, A.length),
    walkins: walkins.length, walkinsIn, pre, preIn, preRate: pct(preIn, pre), walkShare: pct(walkinsIn, checked.length), sms };
}

// Arrivals grouped into time slots of `gran` minutes (event-local time), with running totals for the cumulative view.
export function arrivalBuckets(A, gran = 30) {
  const m = new Map();
  A.forEach((a) => { if (!a.checked_in_at) return; const b = Math.floor(minsOf(a.checked_in_at) / gran) * gran; const o = m.get(b) || { pre: 0, walk: 0 }; a.source === 'walkin' ? o.walk++ : o.pre++; m.set(b, o); });
  if (!m.size) return [];
  const ks = [...m.keys()], out = []; let cp = 0, cw = 0;
  for (let b = Math.min(...ks); b <= Math.max(...ks); b += gran) {
    const o = m.get(b) || { pre: 0, walk: 0 }; cp += o.pre; cw += o.walk;
    out.push({ b, g: gran, label: lab(b), end: lab(b + gran), pre: o.pre, walk: o.walk, total: o.pre + o.walk, cumPre: cp, cumWalk: cw, cum: cp + cw });
  }
  return out;
}

// Arrivals in the last `windowMin` minutes in `step`-minute bins (oldest first).
export function recentPace(A, now = Date.now(), windowMin = 60, step = 5) {
  const n = Math.ceil(windowMin / step), bins = Array(n).fill(0), start = now - windowMin * 60000;
  A.forEach((a) => { if (!a.checked_in_at) return; const t = new Date(a.checked_in_at).getTime(); if (t >= start && t <= now) bins[Math.min(n - 1, Math.floor((t - start) / (step * 60000)))]++; });
  return { bins, total: bins.reduce((x, y) => x + y, 0), step, windowMin };
}

export function insights(A) {
  const times = A.filter((a) => a.checked_in_at).map((a) => new Date(a.checked_in_at).getTime()).sort((x, y) => x - y);
  const q = arrivalBuckets(A, 15), best = q.reduce((x, y) => (y.total > (x.total || 0) ? y : x), {});
  const hours = times.length > 1 ? (times[times.length - 1] - times[0]) / 3600000 : 0;
  return { first: times[0] || null, last: times[times.length - 1] || null, busiest: best.total ? best : null,
    perHour: times.length ? Math.round((times.length / Math.max(hours, 1)) * 10) / 10 : 0 };
}

export const THEMES = ['Answered prayer', 'Gratitude', 'Breakthrough'];
export function testimonyStats(T) {
  const status = { pending: 0, approved: 0, rejected: 0 }, themes = new Map();
  let chars = 0, longest = 0;
  T.forEach((t) => { status[t.status] = (status[t.status] || 0) + 1; const k = t.theme || 'No theme'; themes.set(k, (themes.get(k) || 0) + 1); chars += t.body.length; longest = Math.max(longest, t.body.length); });
  const byTheme = [...themes].map(([theme, count]) => ({ theme, count })).sort((x, y) => y.count - x.count);
  // submissions per hour of day
  const h = new Map(); T.forEach((t) => { const b = Math.floor(minsOf(t.created_at) / 60) * 60; h.set(b, (h.get(b) || 0) + 1); });
  let perHour = [];
  if (h.size) { const ks = [...h.keys()]; for (let b = Math.min(...ks); b <= Math.max(...ks); b += 60) perHour.push({ b, label: lab(b), count: h.get(b) || 0 }); }
  return { total: T.length, status, byTheme, perHour, avgLen: T.length ? Math.round(chars / T.length) : 0, longest };
}
