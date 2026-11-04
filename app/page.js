'use client';
import { useEffect, useState } from 'react';
import LightPillar from '@/components/LightPillar';
import { EVENT } from '@/lib/event';

const Svg = ({ children, s = 18 }) => <svg viewBox="0 0 24 24" width={s} height={s} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;

export default function CheckIn() {
  const [name, setName] = useState(''); const [phone, setPhone] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState(null);
  const [quality, setQuality] = useState('medium');
  useEffect(() => { if (window.innerWidth < 700) setQuality('low'); }, []);

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const r = await fetch('/api/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone }) });
      const j = await r.json().catch(() => ({})); r.ok ? setDone(j) : setErr(j.error || 'Something went wrong on our side. Please see the welcome desk.');
    } catch { setErr('No connection. Please check your data or Wi-Fi and try again.'); }
    setBusy(false);
  };
  const reset = () => { setDone(null); setName(''); setPhone(''); setErr(''); };
  const first = (n) => n.split(' ')[0];

  return (
    <main className="pg">
      <div className="pg-bg" aria-hidden="true">
        <LightPillar topColor="#FFE3A0" bottomColor="#E39A2E" intensity={1.15} glowAmount={0.0016} bloom={0.65} pillarWidth={3} pillarHeight={0.4}
          pillarRotation={8} rotationSpeed={0.12} interactive clickPulse intro quality={quality} mixBlendMode="screen" twist={0.3} detail={4} flow={0.6} noiseIntensity={0.35} fade={0} lightMode={false} />
      </div>
      <div className="pg-veil" aria-hidden="true" />

      <div className="pg-in">
        <aside className="pg-flyer">
          <img src="/pol-flyer.jpg" width="748" height="1080" alt={`${EVENT.name} flyer: theme ${EVENT.theme}, ${EVENT.date}, ${EVENT.time}, ${EVENT.venue}`} />
        </aside>

        <section className="pg-main">
          <img className="pg-logo" src="/logo.png" width="640" height="601" alt="Pastor Samuel Opoku Boateng Ministries" />
          <h1 className="pg-pol"><img src="/pol-logo.png" width="1200" height="647" alt={`${EVENT.name}, theme: ${EVENT.theme}`} /></h1>
          <ul className="pg-meta">
            <li><Svg><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Svg>{EVENT.date} · {EVENT.time}</li>
            <li><Svg><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></Svg>{EVENT.venue}, {EVENT.city}</li>
          </ul>

          {done ? (
            <div className="pg-card pg-ok" role="status">
              <div className="pg-tick"><Svg s={34}><polyline points="20 6 9 17 4 12" /></Svg></div>
              <h2>{done.already ? `Welcome back, ${first(done.name)}.` : `You’re in, ${first(done.name)}. Welcome!`}</h2>
              <p className="pg-sub">{done.already ? 'You were already checked in earlier.' : 'Your check-in is complete. We’re glad to pray with you today.'}</p>
              <div className="pg-ticket"><strong>{done.name}</strong><span>{done.reg_code}</span></div>
              {!done.already && <p className="pg-sub">We’re sending a confirmation SMS to •••• {done.tail}, with a link to share your testimony. Your check-in is saved even if the SMS is delayed.</p>}
              <p className="pg-sub" style={{ color: '#ffe3a0' }}>Come on in. The main auditorium is just ahead. Pick up a name badge at the welcome desk.</p>
              <button className="pg-ghost" onClick={reset}>Check in another guest</button>
            </div>
          ) : (
            <form className="pg-card" onSubmit={submit}>
              <h2>Check in</h2>
              <p className="pg-sub">Registered or not, just enter your name and number.</p>
              <label htmlFor="n">Full name</label>
              <input id="n" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
              <label htmlFor="p">Mobile number</label>
              <input id="p" inputMode="tel" autoComplete="tel" placeholder="024 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <button className="pg-go" type="submit" disabled={busy || !name.trim() || !phone.trim()}>{busy ? 'Checking in…' : 'Check me in'}</button>
              {err && <p className="pg-err" role="alert">{err}</p>}
              <p className="pg-fine">We’ll text a confirmation to this number, with a link to share your testimony. Message and data rates may apply. Your details are used for event attendance and your confirmation. Need help? Visit the welcome desk.</p>
            </form>
          )}
          <p className="pg-verse">“Call unto me, and I will answer thee, and shew thee great and mighty things.” <span>Jeremiah 33:3</span></p>
        </section>
      </div>
    </main>);
}
