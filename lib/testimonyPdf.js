// Builds the testimonies PDF. Pure JavaScript (pdf-lib): no font files or native tools needed, so it runs on Vercel.
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import NOTO_SERIF from './fonts/notoSerif';

const TZ = 'Africa/Accra';
const fmtWhen = (d) => new Date(d).toLocaleString('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const W = 595.28, H = 841.89, M = 54, CW = W - M * 2;
const GOLD = rgb(0.85, 0.6, 0.17), GOLD_SOFT = rgb(0.93, 0.78, 0.45), NIGHT = rgb(0.05, 0.04, 0.09);
const INK = rgb(0.1, 0.1, 0.13), MUTE = rgb(0.4, 0.42, 0.47), LINE = rgb(0.88, 0.88, 0.9);
const STATUS = { approved: ['Approved', rgb(0.1, 0.55, 0.38)], pending: ['Pending review', rgb(0.75, 0.5, 0.08)], rejected: ['Rejected', rgb(0.75, 0.22, 0.17)] };

export async function buildTestimonyPdf(items, { eventName = 'Pray Out Loud 2026', theme = '', filterLabel = 'All testimonies', logoPng = null } = {}) {
  const doc = await PDFDocument.create();
  doc.setTitle(`${eventName} - Testimonies`); doc.setAuthor(eventName); doc.setCreator('Gather');
  // The testimony text uses an embedded Unicode font so Twi/Ewe letters (Ɛ ɛ Ɔ ɔ ŋ ɖ ƒ ʋ), accents and the cedi sign (₵) print correctly.
  doc.registerFontkit(fontkit);
  const body = await doc.embedFont(Uint8Array.from(Buffer.from(NOTO_SERIF, 'base64')), { subset: false });
  const bodyI = body;
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const sansB = await doc.embedFont(StandardFonts.HelveticaBold);

  // Characters the fonts don't have (emoji, non-Latin scripts) are dropped or shown as "?" instead of crashing the export.
  const sets = new Map();
  const clean = (font, text) => {
    if (!sets.has(font)) sets.set(font, new Set(font.getCharacterSet()));
    const ok = sets.get(font); let out = '';
    for (const ch of String(text ?? '').replace(/\r\n?/g, '\n')) {
      const cp = ch.codePointAt(0);
      if (ch === '\n') out += '\n';
      else if (ch === '\t' || cp === 0xa0) out += ' ';
      else if (cp < 32 || (cp >= 0x200b && cp <= 0x200f) || cp === 0xfeff || (cp >= 0xfe00 && cp <= 0xfe0f)) continue;
      else if (cp > 0xffff || (cp >= 0x2600 && cp <= 0x27bf)) continue; // emoji and symbols
      else out += ok.has(cp) ? ch : '?';
    }
    return out;
  };
  const wrap = (text, font, size, width) => {
    const lines = [];
    for (const para of clean(font, text).split('\n')) {
      if (!para.trim()) { lines.push(''); continue; }
      let line = '';
      for (let word of para.split(/\s+/).filter(Boolean)) {
        while (font.widthOfTextAtSize(word, size) > width) { // a single very long "word"
          let k = word.length; while (k > 1 && font.widthOfTextAtSize(word.slice(0, k), size) > width) k--;
          if (line) { lines.push(line); line = ''; }
          lines.push(word.slice(0, k)); word = word.slice(k);
        }
        const t = line ? line + ' ' + word : word;
        if (font.widthOfTextAtSize(t, size) <= width) line = t; else { lines.push(line); line = word; }
      }
      if (line) lines.push(line);
    }
    return lines;
  };

  const pages = []; let page, y;
  const text = (s, x, yy, font, size, color) => page.drawText(clean(font, s).replace(/\n/g, ' '), { x, y: yy, font, size, color });
  const right = (s, xr, yy, font, size, color) => { const t = clean(font, s); page.drawText(t, { x: xr - font.widthOfTextAtSize(t, size), y: yy, font, size, color }); };

  const newPage = () => {
    page = doc.addPage([W, H]); pages.push(page);
    page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: GOLD });
    text(eventName + '  ·  Testimonies', M, H - 34, sans, 8.5, MUTE);
    y = H - 62;
  };

  // ---------- cover band ----------
  page = doc.addPage([W, H]); pages.push(page);
  const BAND = 150;
  page.drawRectangle({ x: 0, y: H - BAND, width: W, height: BAND, color: NIGHT });
  page.drawRectangle({ x: 0, y: H - BAND - 4, width: W, height: 4, color: GOLD });
  let tx = M;
  if (logoPng) {
    try {
      const img = await doc.embedPng(logoPng); const h = 92, w = (img.width / img.height) * h;
      page.drawImage(img, { x: M, y: H - BAND / 2 - h / 2, width: w, height: h }); tx = M + w + 26;
    } catch { tx = M; }
  }
  text('TESTIMONIES', tx, H - 78, sansB, 28, rgb(1, 1, 1));
  text(theme ? `${eventName}  ·  ${theme}` : eventName, tx, H - 100, sans, 11, GOLD_SOFT);
  text('Anonymous testimonies shared by guests', tx, H - 118, sans, 9.5, rgb(0.72, 0.72, 0.78));

  // ---------- summary ----------
  y = H - BAND - 34;
  const count = (fn) => items.filter(fn).length;
  text(`Exported ${fmtWhen(Date.now())}  ·  ${filterLabel}`, M, y, sans, 9.5, MUTE); y -= 20;
  text(`${items.length} testimon${items.length === 1 ? 'y' : 'ies'}`, M, y, sansB, 16, INK);
  const parts = ['approved', 'pending', 'rejected'].map((s) => [STATUS[s], count((t) => t.status === s)]).filter(([, n]) => n);
  let sx = M + sansB.widthOfTextAtSize(`${items.length} testimonies`, 16) + 18;
  for (const [[label, color], n] of parts) { const t = `${n} ${label.toLowerCase()}`; text(t, sx, y + 1, sans, 9.5, color); sx += sans.widthOfTextAtSize(t, 9.5) + 14; }
  y -= 18;
  const themes = new Map(); items.forEach((t) => themes.set(t.theme || 'No theme', (themes.get(t.theme || 'No theme') || 0) + 1));
  if (themes.size) { text('By theme:  ' + [...themes].map(([k, v]) => `${k} (${v})`).join('   ·   '), M, y, sans, 9.5, MUTE); y -= 14; }
  page.drawLine({ start: { x: M, y: y - 6 }, end: { x: W - M, y: y - 6 }, thickness: 0.6, color: LINE }); y -= 30;

  if (!items.length) text('No testimonies match this filter yet.', M, y, bodyI, 13, MUTE);

  // ---------- testimonies ----------
  const SIZE = 11.5, LEAD = 16.5;
  items.forEach((t, i) => {
    const lines = wrap(t.body, body, SIZE, CW - 20);
    const HEADER = 30;
    if (y - HEADER - LEAD * Math.min(3, lines.length) < M + 20) newPage();

    const [slabel, scolor] = STATUS[t.status] || STATUS.pending;
    let segTop = y + 4;
    text(`No. ${i + 1}`, M + 14, y, sansB, 10, GOLD);
    if (t.theme) { const tl = `No. ${i + 1}`; text('·  ' + t.theme, M + 14 + sansB.widthOfTextAtSize(tl, 10) + 6, y, sans, 10, INK); }
    right(slabel, W - M, y, sansB, 8.5, scolor);
    y -= 13;
    text(t.created_at ? fmtWhen(t.created_at) : '', M + 14, y, sans, 8.5, MUTE);
    y -= 20;

    const closeSeg = (bottom) => page.drawRectangle({ x: M, y: bottom, width: 2.5, height: segTop - bottom, color: GOLD_SOFT });
    for (const line of lines) {
      if (y < M + 14) { closeSeg(y + LEAD - 4); newPage(); segTop = y + 8; }
      if (line) text(line, M + 14, y, body, SIZE, INK);
      y -= LEAD;
    }
    closeSeg(y + LEAD - 4);
    y -= 14;
    if (i < items.length - 1) { page.drawLine({ start: { x: M, y: y + 6 }, end: { x: W - M, y: y + 6 }, thickness: 0.4, color: LINE }); y -= 16; }
  });

  // ---------- footer on every page ----------
  pages.forEach((p, i) => {
    const f = `${eventName}  ·  Testimonies  ·  Page ${i + 1} of ${pages.length}`;
    p.drawText(f, { x: W / 2 - sans.widthOfTextAtSize(f, 8) / 2, y: 28, size: 8, font: sans, color: MUTE });
    const c = 'Shared anonymously. Please handle with care.';
    p.drawText(c, { x: W / 2 - sans.widthOfTextAtSize(c, 7) / 2, y: 17, size: 7, font: sans, color: rgb(0.62, 0.64, 0.68) });
  });
  return doc.save();
}
