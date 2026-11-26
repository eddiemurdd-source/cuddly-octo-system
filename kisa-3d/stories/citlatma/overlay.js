// overlay.js — everything drawn in 2D over the render: word-by-word captions, labels with leader lines, "ÇIT!" bursts,
// a pressure gauge, a 20-minute clock, counters and check marks. All sizes are relative to the frame width.
import { clamp, ease, ss } from '/engine/src/anim.js';

const TR = s => s.toLocaleUpperCase('tr-TR');

export function buildCaptions(alt, starts) {
  const chunks = [];
  for (const L of alt) {
    const t0 = starts[L.id]; let cur = [];
    const flush = () => { if (cur.length) chunks.push(cur); cur = []; };
    const first = chunks.length;
    L.words.forEach((w, i) => {
      cur.push({ w: w.w, s: t0 + w.s, e: t0 + w.e });
      const len = cur.map(x => x.w).join(' ').length;
      if (cur.length >= 3 || len >= 13 || /[.,?!…]$/.test(w.w)) flush();
    });
    flush();
    // a lone short word ("var.") would flash for a fraction of a second: join it to the chunk before
    for (let i = chunks.length - 1; i > first; i--) if (chunks[i].length === 1 && chunks[i][0].w.length <= 5 && chunks[i - 1].length < 3 && !/[.?!…]$/.test(chunks[i - 1][chunks[i - 1].length - 1].w)) { chunks[i - 1].push(...chunks[i]); chunks.splice(i, 1); }
  }
  chunks.forEach((c, i) => { c.start = c[0].s - 0.06; c.end = i + 1 < chunks.length ? Math.min(chunks[i + 1][0].s - 0.06, c[c.length - 1].e + 0.45) : c[c.length - 1].e + 0.45; });
  return chunks;
}

export function drawCaptions(ctx, W, H, chunks, t, y = 0.69) {
  const c = chunks.find(c => t >= c.start && t < c.end); if (!c) return;
  const fs = Math.round(W * 0.083), gap = fs * 0.28;
  ctx.save(); ctx.font = `900 ${fs}px Cap`; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const words = c.map(w => ({ ...w, txt: TR(w.w) }));
  words.forEach(w => w.wd = ctx.measureText(w.txt).width);
  // wrap into lines that fit 88% of the width
  const lines = [[]]; let lw = 0;
  for (const w of words) { if (lw + w.wd > W * 0.88 && lines[lines.length - 1].length) { lines.push([]); lw = 0; } lines[lines.length - 1].push(w); lw += w.wd + gap; }
  const appear = ease.outBack(clamp((t - c.start) / 0.14));
  lines.forEach((ln, li) => {
    const total = ln.reduce((s, w) => s + w.wd, 0) + gap * (ln.length - 1);
    let x = W / 2 - total / 2; const yy = H * y + (li - (lines.length - 1) / 2) * fs * 1.08;
    for (const w of ln) {
      const active = t >= w.s - 0.04 && (t < w.e + 0.12 || w === c[c.length - 1]);
      const pop = active ? 1 + 0.1 * Math.exp(-Math.max(0, t - w.s) * 9) : 1;
      ctx.save(); ctx.translate(x + w.wd / 2, yy); ctx.scale(pop * (0.85 + 0.15 * appear), pop * (0.85 + 0.15 * appear));
      ctx.globalAlpha = clamp((t - c.start) / 0.08);
      ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = fs * 0.25; ctx.shadowOffsetY = fs * 0.06;
      ctx.lineWidth = fs * 0.2; ctx.strokeStyle = '#000'; ctx.textAlign = 'center'; ctx.strokeText(w.txt, 0, 0);
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = active ? '#ffd83a' : '#ffffff'; ctx.fillText(w.txt, 0, 0);
      ctx.restore();
      x += w.wd + gap;
    }
  });
  ctx.restore();
}

export function project(v, cam, W, H) {
  const p = v.clone().project(cam); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H, p.z];
}

// a label: dot on the anchor, a leader line, a dark pill with text. a = 0..1 (appear), side: offset of the pill
export function label(ctx, W, H, [ax, ay], [lx, ly], text, a, color = '#ffffff') {
  if (a <= 0) return;
  const fs = Math.round(W * 0.036), k = ease.out(clamp(a * 1.6)), k2 = ease.outBack(clamp(a * 1.6 - 0.45));
  ctx.save(); ctx.font = `700 ${fs}px Lab`;
  const tw = ctx.measureText(text).width, pw = tw + fs * 1.1, ph = fs * 1.7, right = lx > ax, M = W * 0.04;
  lx = right ? Math.min(lx, W - M - pw) : Math.max(lx, M + pw);           // keep the pill inside the frame
  ly = clamp(ly, H * 0.06, H * 0.94);
  ctx.globalAlpha = clamp(a * 3);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = W * 0.0028; ctx.lineCap = 'round';
  const ex = ax + (lx - ax) * k, ey = ay + (ly - ay) * k;
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ax, ay, W * 0.0075, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(ax, ay, W * 0.0075 + W * 0.012 * (1 - k), 0, 7); ctx.globalAlpha *= 0.5; ctx.stroke(); ctx.globalAlpha = clamp(a * 3);
  if (k2 > 0) {
    ctx.translate(lx, ly); ctx.scale(k2, k2);
    const left = right ? 0 : -pw;
    ctx.fillStyle = 'rgba(12,14,20,0.78)'; ctx.beginPath(); ctx.roundRect(left, -ph / 2, pw, ph, ph / 2); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(text, left + fs * 0.55, fs * 0.04);
  }
  ctx.restore();
}

// comic "ÇIT!" burst
export function burst(ctx, W, H, x, y, t, t0, text = 'ÇIT!', size = 1, rot = -0.12) {
  const u = t - t0; if (u < 0 || u > 0.75) return;
  const s = ease.outBack(clamp(u / 0.12)) * size, a = 1 - ss(0.45, 0.75, u);
  const fs = W * 0.1;
  ctx.save(); ctx.translate(x, y - u * W * 0.03); ctx.rotate(rot); ctx.scale(s, s); ctx.globalAlpha = a;
  // spikes
  ctx.strokeStyle = '#ffd83a'; ctx.lineWidth = W * 0.008; ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2 + 0.2, r0 = fs * 0.95, r1 = fs * (1.25 + 0.25 * (i % 2)); ctx.beginPath(); ctx.moveTo(Math.cos(an) * r0 * 1.3, Math.sin(an) * r0 * 0.75); ctx.lineTo(Math.cos(an) * r1 * 1.3, Math.sin(an) * r1 * 0.75); ctx.stroke(); }
  ctx.font = `900 ${fs}px Cap`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = fs * 0.22; ctx.strokeStyle = '#000'; ctx.strokeText(text, 0, 0);
  ctx.fillStyle = '#ffd83a'; ctx.fillText(text, 0, 0);
  ctx.restore();
}

// pressure gauge: v = 1 high .. 0 low
export function gauge(ctx, W, H, x, y, v, a, title = 'BASINÇ') {
  if (a <= 0) return;
  const R = W * 0.13, k = ease.outBack(clamp(a));
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.globalAlpha = clamp(a * 2);
  ctx.fillStyle = 'rgba(12,14,20,0.82)'; ctx.beginPath(); ctx.roundRect(-R * 1.3, -R * 1.2, R * 2.6, R * 1.75, R * 0.22); ctx.fill();
  ctx.lineWidth = R * 0.14; ctx.lineCap = 'butt';
  const A0 = Math.PI * 1.1, A1 = Math.PI * 1.9;
  const seg = (f0, f1, col) => { ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(0, 0, R * 0.85, A0 + (A1 - A0) * f0, A0 + (A1 - A0) * f1); ctx.stroke(); };
  seg(0, 0.3, '#ff5a4a'); seg(0.3, 0.65, '#ffc84a'); seg(0.65, 1, '#58d68d');
  ctx.strokeStyle = '#fff'; ctx.lineWidth = R * 0.045;
  for (let i = 0; i <= 8; i++) { const an = A0 + (A1 - A0) * i / 8; ctx.beginPath(); ctx.moveTo(Math.cos(an) * R * 0.64, Math.sin(an) * R * 0.64); ctx.lineTo(Math.cos(an) * R * 0.72, Math.sin(an) * R * 0.72); ctx.stroke(); }
  const an = A0 + (A1 - A0) * v; ctx.strokeStyle = '#fff'; ctx.lineWidth = R * 0.07; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(an) * R * 0.78, Math.sin(an) * R * 0.78); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, R * 0.09, 0, 7); ctx.fill();
  ctx.font = `900 ${R * 0.26}px Cap`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(title, 0, R * 0.32);
  ctx.restore();
}

// 20-minute clock: p = 0..1 progress
export function clock(ctx, W, H, x, y, p, a, text) {
  if (a <= 0) return;
  const R = W * 0.12, k = ease.outBack(clamp(a));
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.globalAlpha = clamp(a * 2);
  ctx.fillStyle = 'rgba(12,14,20,0.82)'; ctx.beginPath(); ctx.arc(0, 0, R * 1.18, 0, 7); ctx.fill();
  ctx.lineWidth = R * 0.12; ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.stroke();
  ctx.strokeStyle = '#4fc3ff'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = `900 ${R * 0.5}px Cap`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, R * 0.04);
  ctx.font = `700 ${R * 0.2}px Lab`; ctx.fillText('DAKİKA', 0, R * 0.45);
  ctx.restore();
}

export function bigText(ctx, W, H, x, y, text, a, { size = 0.11, color = '#fff', sub, subColor = '#ffd83a', subSize = 0.36 } = {}) {
  if (a <= 0) return;
  const fs = W * size, k = ease.outBack(clamp(a));
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.globalAlpha = clamp(a * 2);
  ctx.font = `900 ${fs}px Cap`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = fs * 0.3;
  ctx.lineWidth = fs * 0.18; ctx.strokeStyle = '#000'; ctx.strokeText(text, 0, 0); ctx.shadowColor = 'transparent';
  ctx.fillStyle = color; ctx.fillText(text, 0, 0);
  if (sub) { ctx.font = `900 ${fs * subSize}px Cap`; ctx.lineWidth = fs * subSize * 0.22; ctx.strokeText(sub, 0, fs * (0.5 + subSize * 0.7)); ctx.fillStyle = subColor; ctx.fillText(sub, 0, fs * (0.5 + subSize * 0.7)); }
  ctx.restore();
}

export function check(ctx, W, H, x, y, a, ok = true) {
  if (a <= 0) return;
  const R = W * 0.045, k = ease.outBack(clamp(a));
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.fillStyle = ok ? '#2ecc71' : '#e74c3c'; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#fff'; ctx.lineWidth = R * 0.22; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const d = clamp(a * 2 - 0.3);
  ctx.beginPath();
  if (ok) { ctx.moveTo(-R * 0.45, 0); ctx.lineTo(-R * 0.1, R * 0.35 * Math.min(1, d * 2)); if (d > 0.5) ctx.lineTo(-R * 0.1 + R * 0.6 * (d - 0.5) * 2, R * 0.35 - R * 0.75 * (d - 0.5) * 2); }
  else { ctx.moveTo(-R * 0.4, -R * 0.4); ctx.lineTo(R * 0.4, R * 0.4); ctx.moveTo(R * 0.4, -R * 0.4); ctx.lineTo(-R * 0.4, R * 0.4); }
  ctx.stroke(); ctx.restore();
}
