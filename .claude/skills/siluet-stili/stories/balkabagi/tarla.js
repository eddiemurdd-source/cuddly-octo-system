// tarla.js : Canvas 2D painters for "Alt Tarafı Balkabağı" (a pumpkin patch at dusk).
// Flat vector look: flat fills, soft gradients, no outlines on the world. The set is painted for neutral light and
// tinted for dusk with material colour (story.js); the warm colour lives in the lights, the pumpkins and the sun.
import { rng, vgrad, mix } from '/engine/src/layer.js';

// ------------------------------------------------------------------ sky, sun, hills
export function sky(g, w, h) {
  g.fillStyle = vgrad(g, 0, 0, h, [[0, '#161c44'], [.32, '#2d3366'], [.55, '#5a4a7c'], [.72, '#9a6680'], [.86, '#dc8c6c'], [1, '#f6c084']]);
  g.fillRect(0, 0, w, h);
  const R = rng(21);
  for (let i = 0; i < 160; i++) {                       // the first stars, only high up
    const x = R() * w, y = R() * h * .32, r = (.5 + R() * R() * 1.8) * w / 2400;
    g.globalAlpha = (.2 + R() * .6) * (1 - y / (h * .32)); g.fillStyle = '#eef0ff'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
  for (let i = 0; i < 11; i++) {                         // long flat clouds, lit from below by the low sun
    const x = R() * w, y = h * (.38 + R() * .4), cw = w * (.08 + R() * .16), ch = h * (.01 + R() * .016);
    g.fillStyle = 'rgba(96,70,120,.55)'; g.beginPath(); g.ellipse(x, y, cw, ch, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,170,120,.55)'; g.beginPath(); g.ellipse(x, y + ch * .4, cw * .9, ch * .55, 0, 0, Math.PI); g.fill();
  }
}
export function glow(g, w, h, col = '255,226,180', core = .18) {
  const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  gr.addColorStop(0, `rgba(${col},1)`); gr.addColorStop(core, `rgba(${col},.55)`); gr.addColorStop(.5, `rgba(${col},.14)`); gr.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}
export function disc(g, w, h, col) { g.fillStyle = col; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 2, 0, 7); g.fill(); }

// a band of rolling hills: smooth sum of sines, optional rows of a field and little trees on the crest
export function hills(g, w, h, { seed = 1, col = '#3a2f55', top = .35, amp = .25, rows = 0, trees = 0, treeCol = null, lit = null } = {}) {
  const R = rng(seed), ph = [R() * 9, R() * 9, R() * 9], f = [1.3 + R(), 3 + R() * 2, 7 + R() * 3];
  const yAt = x => h * (top + amp * (.5 * Math.sin(x / w * f[0] * 6.28 + ph[0]) + .3 * Math.sin(x / w * f[1] * 6.28 + ph[1]) + .12 * Math.sin(x / w * f[2] * 6.28 + ph[2])) / .92 * .5 + amp * .5 * h);
  g.fillStyle = col; g.beginPath(); g.moveTo(0, h);
  for (let x = 0; x <= w; x += w / 200) g.lineTo(x, yAt(x));
  g.lineTo(w, h); g.closePath(); g.fill();
  if (lit) {                                                 // the crest catching the sun
    g.strokeStyle = lit; g.lineWidth = h * .012; g.beginPath(); for (let x = 0; x <= w; x += w / 200) x ? g.lineTo(x, yAt(x) + h * .006) : g.moveTo(x, yAt(x) + h * .006); g.stroke();
  }
  if (rows) {                                                // crop rows following the slope
    g.strokeStyle = 'rgba(0,0,0,.16)'; g.lineWidth = h * .006;
    for (let r = 1; r <= rows; r++) { g.beginPath(); for (let x = 0; x <= w; x += w / 120) { const y = yAt(x) + (h - yAt(x)) * r / (rows + 1); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  }
  for (let i = 0; i < trees; i++) {
    const x = R() * w, y = yAt(x), s = h * (.08 + R() * .12);
    g.fillStyle = treeCol || mix(col, '#000000', .25);
    g.fillRect(x - s * .04, y - s * .5, s * .08, s * .55);
    for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(x + (R() - .5) * s * .5, y - s * (.6 + R() * .35), s * (.22 + R() * .12), s * (.2 + R() * .1), 0, 0, 7); g.fill(); }
  }
}

// ------------------------------------------------------------------ barn (a gambrel roof, one lit window, the big door)
export function barn(g, w, h) {
  const s = w / 9, X = x => x * s, Y = y => h - y * s;        // 9 m wide, 7.5 m tall card
  const wall = '#6a3a48', roof = '#2c2338', trim = '#e3d3c0';
  g.fillStyle = roof; g.beginPath(); g.moveTo(X(.2), Y(4.2)); g.lineTo(X(1.3), Y(6.2)); g.lineTo(X(4.5), Y(7.4)); g.lineTo(X(7.7), Y(6.2)); g.lineTo(X(8.8), Y(4.2)); g.closePath(); g.fill();
  g.fillStyle = wall; g.beginPath(); g.moveTo(X(.6), Y(0)); g.lineTo(X(.6), Y(4.25)); g.lineTo(X(1.5), Y(6.0)); g.lineTo(X(4.5), Y(7.05)); g.lineTo(X(7.5), Y(6.0)); g.lineTo(X(8.4), Y(4.25)); g.lineTo(X(8.4), Y(0)); g.closePath(); g.fill();
  g.fillStyle = 'rgba(0,0,0,.12)'; for (let x = .6; x < 8.4; x += .35) g.fillRect(X(x), Y(6.9), .04 * s, 6.9 * s);    // boards
  // big door with the X brace
  g.fillStyle = '#4a2633'; g.fillRect(X(3.1), Y(3.4), 2.8 * s, 3.4 * s);
  g.strokeStyle = trim; g.lineWidth = .12 * s; g.strokeRect(X(3.1), Y(3.4), 2.8 * s, 3.4 * s);
  g.beginPath(); g.moveTo(X(3.1), Y(3.4)); g.lineTo(X(5.9), Y(0)); g.moveTo(X(5.9), Y(3.4)); g.lineTo(X(3.1), Y(0)); g.moveTo(X(4.5), Y(3.4)); g.lineTo(X(4.5), Y(0)); g.stroke();
  // hay loft window, lit warm
  g.fillStyle = '#ffc77a'; g.fillRect(X(4.0), Y(5.6), 1.0 * s, 1.0 * s);
  g.fillStyle = 'rgba(255,240,200,.6)'; g.fillRect(X(4.0), Y(5.6), .35 * s, 1.0 * s);
  g.strokeStyle = trim; g.lineWidth = .1 * s; g.strokeRect(X(4.0), Y(5.6), 1.0 * s, 1.0 * s);
  g.beginPath(); g.moveTo(X(4.5), Y(5.6)); g.lineTo(X(4.5), Y(4.6)); g.moveTo(X(4.0), Y(5.1)); g.lineTo(X(5.0), Y(5.1)); g.stroke();
  // a small lit window low on the side
  g.fillStyle = '#f2b46a'; g.fillRect(X(1.2), Y(2.4), .9 * s, .8 * s); g.strokeRect(X(1.2), Y(2.4), .9 * s, .8 * s);
  g.fillStyle = '#4a2633'; g.fillRect(X(1.62), Y(2.4), .06 * s, .8 * s);
  // silo behind on the right
}
export function silo(g, w, h) {
  g.fillStyle = '#4b4058'; g.fillRect(w * .1, h * .12, w * .8, h * .88);
  g.beginPath(); g.ellipse(w * .5, h * .12, w * .4, h * .1, 0, Math.PI, 0); g.fill();
  g.fillStyle = 'rgba(255,255,255,.05)'; for (let y = .2; y < 1; y += .08) g.fillRect(w * .1, h * y, w * .8, h * .008);
  g.fillStyle = 'rgba(255,200,150,.1)'; g.fillRect(w * .1, h * .12, w * .18, h * .88);
}

// ------------------------------------------------------------------ fence, poles and string lights, sign
export function fence(g, w, h, seed = 3) {
  const R = rng(seed), post = '#3b2a35', rail = '#4a3540';
  const n = Math.round(w / h * 1.1);
  for (let i = 0; i <= n; i++) { const x = i / n * w + (R() - .5) * h * .1; g.fillStyle = post; g.fillRect(x - h * .05, h * .05, h * .1, h * .95); g.fillStyle = 'rgba(255,200,160,.12)'; g.fillRect(x - h * .05, h * .05, h * .025, h * .95); }
  for (const y of [.25, .58]) { g.fillStyle = rail; g.beginPath(); g.moveTo(0, h * y); for (let x = 0; x <= w; x += w / 30) g.lineTo(x, h * y + Math.sin(x / w * 40 + y * 9) * h * .015); g.lineTo(w, h * (y + .09)); g.lineTo(0, h * (y + .09)); g.fill();
    g.fillStyle = 'rgba(255,200,160,.1)'; g.fillRect(0, h * y, w, h * .02); }
}
// a catenary of bulbs between two poles. pts in card px; the wire sags, bulbs glow (bloom picks them up)
export function lights(g, w, h, { n = 14, sag = .35, seed = 5, on = 1 } = {}) {
  const R = rng(seed);
  g.strokeStyle = '#1a1420'; g.lineWidth = h * .012; g.beginPath();
  const yAt = k => h * .08 + h * sag * 4 * k * (1 - k);
  for (let i = 0; i <= 60; i++) { const k = i / 60; i ? g.lineTo(k * w, yAt(k)) : g.moveTo(0, yAt(0)); } g.stroke();
  for (let i = 1; i < n; i++) {
    const k = i / n, x = k * w, y = yAt(k), r = h * .035;
    g.fillStyle = '#1a1420'; g.fillRect(x - r * .35, y, r * .7, r * .7);
    const col = R() < .25 ? '#ffe0a0' : '#ffd08a';
    const gr = g.createRadialGradient(x, y + r * 1.6, 0, x, y + r * 1.6, r * 3.2); gr.addColorStop(0, `rgba(255,214,150,${.5 * on})`); gr.addColorStop(1, 'rgba(255,214,150,0)');
    g.fillStyle = gr; g.fillRect(x - r * 3.2, y - r * 1.6, r * 6.4, r * 6.4);
    g.fillStyle = col; g.beginPath(); g.ellipse(x, y + r * 1.5, r * .75, r, 0, 0, 7); g.fill();
    g.fillStyle = '#fff6e0'; g.beginPath(); g.ellipse(x - r * .15, y + r * 1.3, r * .3, r * .4, 0, 0, 7); g.fill();
  }
}
export function pole(g, w, h) {
  g.fillStyle = '#1e1622'; g.fillRect(w * .4, 0, w * .2, h);
  g.fillRect(w * .1, h * .03, w * .8, w * .12);
  g.fillStyle = 'rgba(255,200,160,.14)'; g.fillRect(w * .4, 0, w * .05, h);
}
export function sign(g, w, h, font) {
  const s = w / 2.2;                                          // 2.2 x 1.6 m: a board on two legs
  g.fillStyle = '#2a1d24'; g.fillRect(.25 * s, .9 * s, .12 * s, h - .9 * s); g.fillRect(w - .37 * s, .9 * s, .12 * s, h - .9 * s);
  g.fillStyle = '#6b4636'; g.beginPath(); g.roundRect(.05 * s, .1 * s, w - .1 * s, .9 * s, .06 * s); g.fill();
  g.fillStyle = 'rgba(0,0,0,.14)'; for (let y = .3; y < 1; y += .22) g.fillRect(.05 * s, y * s, w - .1 * s, .025 * s);
  g.fillStyle = '#f0e2c4'; g.textAlign = 'center'; g.font = `900 ${.3 * s}px ${font}`; g.fillText('BALKABAĞI', w / 2, .52 * s);
  g.font = `700 ${.2 * s}px ${font}`; g.fillStyle = '#f3a24e'; g.fillText('HASAT PAZARI', w / 2, .82 * s);
}

// ------------------------------------------------------------------ hay bales
// one bale seen from the front (the cut end shows the straw), card w x h metres
export function baleFront(g, w, h, seed = 1) {
  const R = rng(seed);
  g.fillStyle = '#c89a58'; g.beginPath(); g.roundRect(0, 0, w, h, h * .08); g.fill();
  g.fillStyle = vgrad(g, 0, 0, h, [[0, 'rgba(255,236,190,.25)'], [.5, 'rgba(0,0,0,0)'], [1, 'rgba(60,30,20,.35)']]); g.beginPath(); g.roundRect(0, 0, w, h, h * .08); g.fill();
  g.save(); g.beginPath(); g.roundRect(0, 0, w, h, h * .08); g.clip();
  for (let i = 0; i < 260; i++) {
    const x = R() * w, y = R() * h, L = h * (.06 + R() * .12), a = (R() - .5) * 1.2;
    g.strokeStyle = R() < .5 ? 'rgba(255,226,160,.5)' : 'rgba(110,70,30,.35)'; g.lineWidth = h * .012;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sin(a) * L, y + Math.cos(a) * L); g.stroke();
  }
  g.restore();
  g.fillStyle = '#5a3a26'; for (const k of [.28, .72]) g.fillRect(w * k - h * .02, 0, h * .04, h);                 // twine
  g.strokeStyle = 'rgba(255,230,170,.7)'; g.lineWidth = h * .025;                                                  // stray straws on the top edge
  for (let i = 0; i < 12; i++) { const x = R() * w; g.beginPath(); g.moveTo(x, h * .02); g.lineTo(x + (R() - .5) * h * .2, -h * .0 + h * .02 - R() * h * .0); g.stroke(); }
}
export function baleTop(g, w, h, seed = 2) {
  const R = rng(seed);
  g.fillStyle = '#d4a865'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 200; i++) { const x = R() * w, y = R() * h, L = w * (.03 + R() * .05); g.strokeStyle = R() < .5 ? 'rgba(255,236,180,.45)' : 'rgba(110,70,30,.3)'; g.lineWidth = h * .015; g.beginPath(); g.moveTo(x, y); g.lineTo(x + L, y + (R() - .5) * h * .1); g.stroke(); }
  g.fillStyle = '#5a3a26'; for (const k of [.28, .72]) g.fillRect(w * k - w * .01, 0, w * .02, h);
}

// ------------------------------------------------------------------ pumpkins
// a pumpkin seen from the side, centred in a square card (the body fills ~84 % of the width).
// col: the body colour; kind: 'round' | 'tall' | 'flat'; light from the upper left (the low sun), a warm rim on that side.
export const PCOL = ['#e8782e', '#dd6a26', '#ef8a34', '#d8601f', '#f09a3c', '#e5732a'];
export function pumpkin(g, w, h, { col = '#e8782e', kind = 'round', seed = 1, stem = '#5b4a2a', lantern = false, ink = null } = {}) {
  const R = rng(seed), cx = w / 2, cy = h * .54, rx = w * .42, ry = h * (kind === 'tall' ? .38 : kind === 'flat' ? .27 : .33);
  const dark = mix(col, '#4a1a10', .45), lite = mix(col, '#fff0c8', .3);
  // the lobes, back to front: outer ones darker
  const lobes = [[-.62, .5, .78], [.62, .5, .78], [-.32, .62, .9], [.32, .62, .9], [0, .55, 1]];
  for (const [ox, sx, k] of lobes) {
    g.fillStyle = mix(col, dark, (1 - k) * 1.6);
    g.beginPath(); g.ellipse(cx + ox * rx * .62, cy, rx * sx, ry * (.92 + k * .08), 0, 0, 7); g.fill();
  }
  // ribs (dark creases)
  g.strokeStyle = mix(col, dark, .7); g.lineWidth = w * .012; g.lineCap = 'round';
  for (const ox of [-.5, -.18, .18, .5]) { g.beginPath(); g.moveTo(cx + ox * rx * .55, cy - ry * .82); g.quadraticCurveTo(cx + ox * rx * 1.05, cy, cx + ox * rx * .55, cy + ry * .9); g.stroke(); }
  // shading: lit upper left, dark lower right
  g.save(); g.beginPath(); g.ellipse(cx, cy, rx * 1.02, ry * 1.02, 0, 0, 7); g.clip();
  const gr = g.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry); gr.addColorStop(0, 'rgba(255,230,180,.28)'); gr.addColorStop(.45, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(40,10,20,.42)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.restore();
  // the warm rim of the low sun on the upper left edge
  g.strokeStyle = 'rgba(255,214,150,.85)'; g.lineWidth = w * .022;
  g.beginPath(); g.ellipse(cx, cy, rx * .985, ry * .97, 0, Math.PI * 1.02, Math.PI * 1.42); g.stroke();
  // highlight
  g.fillStyle = 'rgba(255,245,220,.28)'; g.beginPath(); g.ellipse(cx - rx * .3, cy - ry * .45, rx * .16, ry * .1, -.4, 0, 7); g.fill();
  if (lantern) {                                             // a carved face glowing from inside
    g.fillStyle = '#ffd56a';
    const tri = (x, y, s, up = true) => { g.beginPath(); g.moveTo(x - s, y + (up ? s * .6 : -s * .6)); g.lineTo(x + s, y + (up ? s * .6 : -s * .6)); g.lineTo(x, y - (up ? s * .7 : -s * .7)); g.fill(); };
    tri(cx - rx * .35, cy - ry * .2, rx * .17); tri(cx + rx * .35, cy - ry * .2, rx * .17); tri(cx, cy + ry * .08, rx * .1);
    g.beginPath(); g.moveTo(cx - rx * .55, cy + ry * .3); g.quadraticCurveTo(cx, cy + ry * .85, cx + rx * .55, cy + ry * .3); g.quadraticCurveTo(cx, cy + ry * .55, cx - rx * .55, cy + ry * .3); g.fill();
    g.fillStyle = mix(col, dark, .2); g.fillRect(cx - rx * .12, cy + ry * .36, rx * .1, ry * .14); g.fillRect(cx + rx * .1, cy + ry * .38, rx * .1, ry * .14);
  }
  // stem
  g.fillStyle = stem; g.save(); g.translate(cx + (R() - .5) * rx * .1, cy - ry * .9); g.rotate((R() - .5) * .5);
  g.beginPath(); g.moveTo(-w * .035, h * .02); g.lineTo(-w * .025, -h * .1); g.quadraticCurveTo(w * .02, -h * .14, w * .06, -h * .12); g.lineTo(w * .03, -h * .08); g.lineTo(w * .035, h * .02); g.closePath(); g.fill();
  g.restore();
}

// ------------------------------------------------------------------ ground, crates, corn shocks, wheelbarrow
export function ground(g, w, h) {
  g.fillStyle = '#5e4650'; g.fillRect(0, 0, w, h);
  const R = rng(8);
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(${R() < .5 ? '40,24,34' : '120,90,90'},${.08 + R() * .1})`; g.beginPath(); g.ellipse(R() * w, R() * h, w * (.02 + R() * .06), h * (.01 + R() * .03), R() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 1400; i++) {                         // loose straw
    const x = R() * w, y = R() * h, L = w * (.002 + R() * .004), a = R() * 3;
    g.strokeStyle = `rgba(214,170,100,${.18 + R() * .3})`; g.lineWidth = w * .0008; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke();
  }
}
export function crate(g, w, h, { pumpkins = true, seed = 4 } = {}) {
  const R = rng(seed);
  if (pumpkins) for (let i = 0; i < 4; i++) { const x = w * (.15 + i * .23), r = w * (.13 + R() * .04); g.fillStyle = PCOL[Math.floor(R() * PCOL.length)]; g.beginPath(); g.ellipse(x, h * .32, r, r * .8, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(40,10,20,.25)'; g.beginPath(); g.ellipse(x + r * .3, h * .36, r * .6, r * .6, 0, 0, 7); g.fill(); }
  g.fillStyle = '#7a5644'; g.fillRect(0, h * .3, w, h * .7);
  g.fillStyle = 'rgba(0,0,0,.25)'; for (const y of [.52, .76]) g.fillRect(0, h * y, w, h * .04);
  g.fillStyle = '#5a3c30'; g.fillRect(0, h * .3, w * .06, h * .7); g.fillRect(w * .94, h * .3, w * .06, h * .7);
  g.fillStyle = 'rgba(255,220,170,.16)'; g.fillRect(0, h * .3, w, h * .03);
}
export function cornShock(g, w, h, seed = 6) {
  const R = rng(seed);
  for (let i = 0; i < 46; i++) {
    const x0 = w * (.5 + (R() - .5) * .5), x1 = w * (.5 + (R() - .5) * .12), a = (R() - .5);
    g.strokeStyle = R() < .5 ? '#9a7a50' : '#7d6040'; g.lineWidth = w * .02;
    g.beginPath(); g.moveTo(x0, h); g.quadraticCurveTo(x1, h * .45, x1 + a * w * .4, h * (.04 + R() * .1)); g.stroke();
  }
  g.fillStyle = '#5a3a26'; g.fillRect(w * .36, h * .5, w * .28, h * .04);
  g.strokeStyle = 'rgba(255,220,160,.25)'; g.lineWidth = w * .01; for (let i = 0; i < 10; i++) { const x = w * (.3 + R() * .2); g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + w * .05, h * .5, x + w * .02, h * .1); g.stroke(); }
}
export function scarecrow(g, w, h) {
  const s = w;
  g.fillStyle = '#2a1d24'; g.fillRect(s * .47, h * .15, s * .06, h * .85); g.fillRect(s * .1, h * .33, s * .8, s * .05);
  g.fillStyle = '#6d4a5e'; g.beginPath(); g.moveTo(s * .3, h * .3); g.lineTo(s * .7, h * .3); g.lineTo(s * .74, h * .62); g.lineTo(s * .26, h * .62); g.fill();
  g.fillStyle = '#8a6a48'; g.fillRect(s * .12, h * .31, s * .2, s * .09); g.fillRect(s * .68, h * .31, s * .2, s * .09);
  g.fillStyle = '#d9b57a'; g.beginPath(); g.arc(s * .5, h * .22, s * .13, 0, 7); g.fill();
  g.fillStyle = '#3a2a30'; g.beginPath(); g.ellipse(s * .5, h * .11, s * .26, s * .04, 0, 0, 7); g.fill(); g.fillRect(s * .38, h * .02, s * .24, h * .09);
}
export function wheelbarrow(g, w, h) {
  g.fillStyle = '#1e1622'; g.beginPath(); g.arc(w * .22, h * .78, h * .2, 0, 7); g.fill();
  g.fillStyle = '#3f5a6a'; g.beginPath(); g.moveTo(w * .08, h * .35); g.lineTo(w * .7, h * .35); g.lineTo(w * .58, h * .7); g.lineTo(w * .2, h * .7); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,220,170,.2)'; g.fillRect(w * .08, h * .35, w * .62, h * .04);
  g.strokeStyle = '#1e1622'; g.lineWidth = h * .05; g.lineCap = 'round'; g.beginPath(); g.moveTo(w * .55, h * .55); g.lineTo(w * .96, h * .32); g.moveTo(w * .5, h * .7); g.lineTo(w * .6, h * .98); g.stroke();
  for (const [x, r, c] of [[.25, .14, '#e8782e'], [.47, .13, '#d8601f'], [.36, .12, '#f09a3c']]) { g.fillStyle = c; g.beginPath(); g.ellipse(w * x, h * .3, w * r, w * r * .75, 0, 0, 7); g.fill(); }
}
