// Small CSV helpers shared by the admin page (import) and the export route.
export function parseCsv(text) {
  const t = text.replace(/^\uFEFF/, ''); const first = t.split(/\r?\n/)[0] || '';
  const d = [',', ';', '\t'].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const rows = []; let r = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === d) { r.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; r.push(f); rows.push(r); r = []; f = ''; }
    else f += c;
  }
  if (f !== '' || r.length) { r.push(f); rows.push(r); }
  return rows.filter((x) => x.some((v) => v.trim() !== ''));
}
export function toCsv(rows) {
  const cell = (v) => { v = String(v ?? ''); if (/^[=+\-@]/.test(v) && !/^\+\d[\d ]+$/.test(v)) v = "'" + v; return /[",\r\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  return '\uFEFF' + rows.map((r) => r.map(cell).join(',')).join('\r\n'); // BOM so Excel reads UTF-8 names correctly
}
