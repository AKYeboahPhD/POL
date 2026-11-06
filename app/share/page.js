'use client';
import { useEffect, useState } from 'react';
import LightPillar from '@/components/LightPillar';
import { EVENT } from '@/lib/event';

const MAX = 2000, MIN = 15;
const STARTERS = ['God answered my prayer when…', 'I’m grateful for…', 'Today I felt…'];
const Svg = ({ children, s = 22 }) => <svg viewBox="0 0 24 24" width={s} height={s} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;

export default function Share() {
  const [body, setBody] = useState(''); const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false); const [done, setDone] = useState(false); const [err, setErr] = useState('');
  const [quality, setQuality] = useState('medium');
  useEffect(() => { if (window.innerWidth < 700) setQuality('low'); }, []);
  const len = body.length, short = body.trim().length < MIN, ready = !short && consent && !busy;

  const submit = async (e) => {
    e.preventDefault(); if (!ready) return; setErr(''); setBusy(true);
    try {
      const r = await fetch('/api/testimony', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body, consent }) });
      const j = await r.json().catch(() => ({})); r.ok ? setDone(true) : setErr(j.error || 'Something went wrong. Please try again.');
    } catch { setErr('No connection. Please check your data or Wi-Fi and try again.'); }
    setBusy(false);
  };
  const again = () => { setBody(''); setConsent(false); setDone(false); setErr(''); };

  return (
    <main className="pg sh">
      <div className="pg-bg" aria-hidden="true">
        <LightPillar topColor="#FFE3A0" bottomColor="#E39A2E" intensity={1.15} glowAmount={0.0016} bloom={0.65} pillarWidth={3} pillarHeight={0.4}
          pillarRotation={8} rotationSpeed={0.12} interactive clickPulse intro quality={quality} mixBlendMode="screen" twist={0.3} detail={4} flow={0.6} noiseIntensity={0.35} fade={0} lightMode={false} />
      </div>
      <div className="pg-veil" aria-hidden="true" />

      <div className="sh-in">
        <header className="sh-hero">
          <img className="pg-logo" src="/logo.png" width="640" height="601" alt="Pastor Samuel Opoku Boateng Ministries" />
          <h1 className="pg-pol"><img src="/pol-logo.png" width="1200" height="647" alt={`${EVENT.name}, theme: ${EVENT.theme}`} /></h1>
          <p className="sh-lead">Share your testimony</p>
                  </header>

        {done ? (
          <section className="pg-card pg-ok" role="status">
            <div className="pg-tick"><Svg s={34}><polyline points="20 6 9 17 4 12" /></Svg></div>
            <h2>Thank you for sharing.</h2>
            <p className="pg-sub" style={{ maxWidth: 380, margin: '8px auto 0' }}>Your story has been received. It will be reviewed before it’s shared anywhere, and it stays anonymous.</p>
            <button className="pg-ghost" onClick={again}>Share another testimony</button>
          </section>
        ) : (
          <form className="pg-card" onSubmit={submit} noValidate>
            <div className="sh-anon">
              <Svg><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Svg>
              <div><strong>Anonymous.</strong> <span>No name or number is collected.</span></div>
            </div>

            <div className="sh-lab"><label htmlFor="t">Your testimony</label><span>Required</span></div>
            <textarea id="t" className="sh-ta" maxLength={MAX} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Tell us what happened and what it meant to you…" aria-describedby="t-help" />
            <div className={'sh-bar' + (len > MAX * 0.9 ? ' warn' : '')}><i style={{ width: (len / MAX) * 100 + '%' }} /></div>
            <div className="sh-meta" id="t-help"><span>Leave out names and personal details.</span><span>{len.toLocaleString()} / {MAX.toLocaleString()}</span></div>
            {len === 0 && <div className="sh-chips" style={{ marginTop: 12 }}>{STARTERS.map((s) => <button type="button" key={s} className="sh-chip ghost" onClick={() => setBody(s + ' ')}>{s}</button>)}</div>}
            {len > 0 && short && <p className="pg-sub" style={{ marginTop: 8 }}>Add a little more so your story can be understood.</p>}

            <label className={'sh-consent' + (consent ? ' on' : '')}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>I’m comfortable with my testimony being shared anonymously by {EVENT.host} after review.</span>
            </label>

            {err && <p className="pg-err" role="alert">{err}</p>}
            <div className="sh-cta">
              <button className="pg-go sh-go" type="submit" disabled={!ready}>
                <Svg s={20}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></Svg>{busy ? 'Submitting…' : 'Submit my testimony'}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>);
}
