// Accepts 024 123 4567, +233 24 123 4567, 233241234567, 241234567 -> "233241234567". Other countries need a leading +.
export function normalizePhone(input = '') {
  const raw = String(input).trim(); const d = raw.replace(/\D/g, '');
  if (raw.startsWith('+') && !d.startsWith('233')) return d.length >= 10 && d.length <= 15 ? d : null;
  if (d.startsWith('233') && d.length === 12) return d;
  if (d.startsWith('0') && d.length === 10) return '233' + d.slice(1);
  if (d.length === 9) return '233' + d;
  return null;
}
