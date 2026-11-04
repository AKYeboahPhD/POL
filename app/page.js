'use client';
import { useState } from 'react';
import { EVENT } from '@/lib/event';

export default function CheckIn() {
  const [name, setName] = useState(''); const [phone, setPhone] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState(null);

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const r = await fetch('/api/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone }) });
      const j = await r.json().catch(() => ({})); r.ok ? setDone(j) : setErr(j.error || 'Something went wrong on our side. Please see the welcome desk.');
    } catch { setErr('No connection. Please try again.'); }
    setBusy(false);
  };
  const reset = () => { setDone(null); setName(''); setPhone(''); setErr(''); };
  const first = (n) => n.split(' ')[0];

  if (done) return (
    <main className="wrap done">
      <h1>{done.already ? `Welcome back, ${first(done.name)}.` : `You’re in, ${first(done.name)}. Welcome!`}</h1>
      <p className="mut">{done.already ? 'You were already checked in earlier.' : 'Your check-in is complete. We’re glad to share this day with you.'}</p>
      <div className="card" style={{ maxWidth: 520, margin: '24px auto', textAlign: 'left' }}>
        <span className="pill">Checked in</span><h2 style={{ marginTop: 10 }}>{done.name}</h2><p className="mut">{done.reg_code}</p>
        {!done.already && <p style={{ marginTop: 14 }}>We’re sending a confirmation SMS to •••• {done.tail}, with a link to share your testimony. <span className="mut">Your check-in is saved even if the SMS is delayed.</span></p>}
      </div>
      <div className="found" style={{ maxWidth: 520, margin: '0 auto' }}>Come on in. The main auditorium is just ahead. Pick up a name badge at the welcome desk.</div>
      <button style={{ maxWidth: 260, marginTop: 24 }} onClick={reset}>Check in another guest</button>
    </main>);

  return (
    <main className="wrap" style={{ maxWidth: 520 }}>
      <span className="pill">Welcome to {EVENT.name}</span>
      <h1>Your day starts here.</h1>
      <p className="mut">{[EVENT.date, EVENT.time, EVENT.venue + ', ' + EVENT.city].filter(Boolean).join(' · ')}</p>
      <form className="card" style={{ marginTop: 22 }} onSubmit={submit}>
        <h2>Check in</h2><p className="mut">Registered or not, just enter your name and number.</p>
        <label htmlFor="n">Full name</label>
        <input id="n" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        <label htmlFor="p">Mobile number</label>
        <input id="p" inputMode="tel" autoComplete="tel" placeholder="024 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <button className="pri" type="submit" disabled={busy || !name.trim() || !phone.trim()}>{busy ? 'Checking in…' : 'Check me in'}</button>
        {err && <p className="err" role="alert">{err}</p>}
        <p className="mut" style={{ marginTop: 12 }}>We’ll text a confirmation to this number, with a link to share your testimony. Message and data rates may apply.</p>
      </form>
      <p className="mut" style={{ marginTop: 18 }}>Your details are used for event attendance and the confirmation you receive. Need help? Visit the welcome desk.</p>
    </main>);
}
