'use client';
import { useState } from 'react';
import { EVENT } from '@/lib/event';

const MAX = 2000, MIN = 15;
const THEMES = ['Answered prayer', 'Gratitude', 'Breakthrough'];
const STARTERS = ['God answered my prayer when…', 'I’m grateful for…', 'Today I felt…'];
const Svg = ({ children, s = 22 }) => <svg viewBox="0 0 24 24" width={s} height={s} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;

export default function Share() {
  const [body, setBody] = useState(''); const [theme, setTheme] = useState(''); const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false); const [done, setDone] = useState(false); const [err, setErr] = useState('');
  const len = body.length, short = body.trim().length < MIN, ready = !short && consent && !busy;

  const submit = async (e) => {
    e.preventDefault(); if (!ready) return; setErr(''); setBusy(true);
    try {
      const r = await fetch('/api/testimony', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body, theme, consent }) });
      const j = await r.json().catch(() => ({})); r.ok ? setDone(true) : setErr(j.error || 'Something went wrong. Please try again.');
    } catch { setErr('No connection. Please check your data or Wi-Fi and try again.'); }
    setBusy(false);
  };
  const again = () => { setBody(''); setTheme(''); setConsent(false); setDone(false); setErr(''); };

  return (
    <main className="sh"><div className="sh-in">
      <header className="sh-hero">
        <span className="pill">{EVENT.name}</span>
        <h1>Your testimony could encourage someone.</h1>
        <p>Share a moment of hope, an answered prayer, or something you’re grateful for today.</p>
      </header>

      {done ? (
        <section className="sh-card sh-ok" role="status">
          <div className="sh-tick"><Svg s={40}><polyline points="20 6 9 17 4 12" /></Svg></div>
          <h2 style={{ fontSize: 26, marginTop: 18 }}>Thank you for sharing.</h2>
          <p className="mut" style={{ fontSize: 15, maxWidth: 380, margin: '8px auto 0' }}>Your story has been received. It will be reviewed before it’s shared anywhere, and it stays anonymous.</p>
          <button className="sh-chip" style={{ marginTop: 22 }} onClick={again}>Share another testimony</button>
        </section>
      ) : (
        <form className="sh-card" onSubmit={submit} noValidate>
          <div className="sh-anon">
            <Svg><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Svg>
            <div><strong>Your testimony is anonymous.</strong><p className="mut" style={{ color: 'inherit', opacity: .75 }}>No name, phone number or email is collected here, and it isn’t linked to your check-in.</p></div>
          </div>

          <div className="sh-lab"><label htmlFor="t" style={{ margin: 0, fontSize: 15 }}>Your testimony</label><span className="mut">Required</span></div>
          <textarea id="t" className="sh-ta" maxLength={MAX} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Tell us what happened and what it meant to you…" aria-describedby="t-help" />
          <div className={'sh-bar' + (len > MAX * 0.9 ? ' warn' : '')}><i style={{ width: (len / MAX) * 100 + '%' }} /></div>
          <div className="sh-meta" id="t-help"><span>Please leave out names and identifying details.</span><span>{len.toLocaleString()} / {MAX.toLocaleString()}</span></div>
          {len === 0 && <div className="sh-chips" style={{ marginTop: 12 }}>{STARTERS.map((s) => <button type="button" key={s} className="sh-chip ghost" onClick={() => setBody(s + ' ')}>{s}</button>)}</div>}
          {len > 0 && short && <p className="mut" style={{ marginTop: 8 }}>Add a little more so your story can be understood.</p>}

          <div className="sh-lab"><span>A theme for your story <span className="mut" style={{ fontWeight: 400 }}>(optional)</span></span></div>
          <div className="sh-chips" role="group" aria-label="Theme">{THEMES.map((t) => <button type="button" key={t} aria-pressed={theme === t} className={'sh-chip' + (theme === t ? ' on' : '')} onClick={() => setTheme(theme === t ? '' : t)}>{t}</button>)}</div>

          <label className={'sh-consent' + (consent ? ' on' : '')}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>I’m comfortable with my testimony being shared anonymously by {EVENT.host} after review.</span>
          </label>

          {err && <p className="err" role="alert" style={{ marginTop: 14, fontSize: 14 }}>{err}</p>}
          <div className="sh-cta">
            <button className="pri sh-go" type="submit" disabled={!ready}>
              <Svg s={20}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></Svg>{busy ? 'Submitting…' : 'Submit my testimony'}
            </button>
            <p className="mut" style={{ textAlign: 'center', marginTop: 10 }}>Sharing is always your choice. Stories are reviewed before they’re shared publicly.</p>
          </div>
        </form>
      )}

      <aside className="sh-care">
        <Svg s={20}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></Svg>
        <span>Need someone to talk to? Visit our care team at the welcome desk. This form isn’t monitored for urgent support.</span>
      </aside>
    </div></main>);
}