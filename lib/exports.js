// Shared helpers for the admin exports (check-in CSV / Excel).
const TZ = 'Africa/Accra';
const dF = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' });
const tF = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
export const fmtDate = (d) => (d ? dF.format(new Date(d)) : '');
export const fmtTime = (d) => (d ? tF.format(new Date(d)) : '');

// 233241234567 -> "+233 24 123 4567". The spaces stop Excel turning the number into 2.33E+11.
export function fmtPhone(p = '') {
  const d = String(p).replace(/\D/g, '');
  if (d.startsWith('233') && d.length === 12) return `+233 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  return d ? '+' + d.replace(/(\d{3})(?=\d)/, '$1 ') : '';
}

export const SMS_LABEL = { delivered: 'Delivered', sent: 'Sent', queued: 'Queued', failed: 'Failed' };

export function latestSms(rows = []) {
  const m = new Map();
  rows.forEach((r) => { if (!m.has(r.attendee_id)) m.set(r.attendee_id, r.status); });
  return m;
}

export const HEAD = ['No.', 'Reg code', 'Name', 'Mobile', 'Email', 'Type', 'Status', 'Check-in date', 'Check-in time (GMT)', 'Confirmation SMS'];

// scope "checkins": only guests who have checked in, in the order they arrived. scope "all": everyone registered.
export function attendeeRows(attendees, smsByAttendee, scope = 'checkins') {
  let list = attendees.slice();
  if (scope === 'checkins') {
    list = list.filter((a) => a.checked_in_at).sort((x, y) => new Date(x.checked_in_at) - new Date(y.checked_in_at));
  } else {
    list.sort((x, y) => x.full_name.localeCompare(y.full_name));
  }
  return list.map((a, i) => [
    i + 1, a.reg_code, a.full_name, fmtPhone(a.phone), a.email || '', a.source === 'walkin' ? 'Walk-in' : 'Preregistered',
    a.checked_in_at ? 'Checked in' : 'Not arrived', fmtDate(a.checked_in_at), fmtTime(a.checked_in_at),
    a.checked_in_at ? (SMS_LABEL[smsByAttendee.get(a.id)] || 'Not sent') : '',
  ]);
}
