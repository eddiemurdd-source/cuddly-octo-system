// set.js : Canvas 2D painters for "Disiplin" (flat vector look: flat fills, soft gradients, dark frames, no outlines on the
// world). The night street, the bedroom furniture, the rooftop at dawn and the 1 % chart. The sky, glows, skylines, the
// middle facade, lamp posts, trees and the room's wall / desk / lamp come from stories/uykusuz (paint.js, room.js).
// Colours are painted for neutral light; story.js tints each set for night or dawn with material colour.
import { rng, vgrad, mix } from '/engine/src/layer.js';

// ------------------------------------------------------------------ the street at night
// a side building, Wm metres wide: a grid of dark windows (the whole city is asleep), floor ledges, a roof cap and a shut
// shop with its shutter down on the ground floor
export function blok(g, w, h, { Wm = 22, seed = 1, base = '#4a4560', frame = '#1a1323', lit = 0, rows = 8, cols = 6, shop = '#3a3148' } = {}) {
  const s = w / Wm, Hm = h / s, R = rng(seed), X = x => x * s, Y = y => h - y * s;
  g.fillStyle = vgrad(g, 0, 0, h, [[0, mix(base, '#ffffff', .03)], [.7, base], [1, mix(base, '#000000', .18)]]); g.fillRect(0, 0, w, h);
  for (let x = 0; x < Wm; x += 2.2) { g.fillStyle = `rgba(255,255,255,${.015 + R() * .02})`; g.fillRect(X(x), 0, 1.1 * s, h); }
  const top = Hm - 1.2, fh = (top - 4.6) / rows, cw = (Wm - 2.4) / cols;
  for (let r = 0; r <= rows; r++) { const y = 4.4 + r * fh; g.fillStyle = mix(base, '#000000', .38); g.fillRect(0, Y(y), w, .28 * s); g.fillStyle = 'rgba(255,225,200,.07)'; g.fillRect(0, Y(y), w, .05 * s); }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const cx = 1.2 + (c + .5) * cw, cy = 4.4 + (r + .5) * fh + .1, ww = Math.min(1.4, cw * .55), wh = Math.min(1.7, fh * .58);
    const x0 = X(cx - ww / 2), y0 = Y(cy + wh / 2);
    g.fillStyle = frame; g.fillRect(x0 - .12 * s, y0 - .12 * s, (ww + .24) * s, (wh + .24) * s);
    const on = R() < lit;
    g.fillStyle = on ? vgrad(g, 0, y0, y0 + wh * s, [[0, '#ffd08a'], [1, '#e89a58']]) : vgrad(g, 0, y0, y0 + wh * s, [[0, '#2a2340'], [1, '#1e192e']]);
    g.fillRect(x0, y0, ww * s, wh * s);
    if (!on && R() < .5) { g.fillStyle = 'rgba(150,160,220,.07)'; g.fillRect(x0, y0, ww * s * .45, wh * s); }            // a little sky on the glass
    g.fillStyle = frame; g.fillRect(x0 + ww * s / 2 - .04 * s, y0, .08 * s, wh * s); g.fillRect(x0, y0 + wh * s * .38, ww * s, .07 * s);
    g.fillStyle = mix(base, '#000000', .3); g.fillRect(x0 - .18 * s, Y(cy - wh / 2) + .06 * s, (ww + .36) * s, .14 * s);
  }
  g.fillStyle = mix(base, '#000000', .45); g.fillRect(0, 0, w, .9 * s);                                            // roof cap
  if (R() < .7) { g.fillRect(X(Wm * (.15 + R() * .5)), Y(Hm + .1), 2.4 * s, 1.0 * s); }
  // ground floor: a shop with the shutter down
  g.fillStyle = mix(base, '#000000', .42); g.fillRect(0, Y(4.2), w, 4.2 * s);
  const sx0 = X(Wm * .12), sw = Wm * .5 * s;
  g.fillStyle = shop; g.fillRect(sx0, Y(3.3), sw, 3.3 * s);
  g.fillStyle = 'rgba(0,0,0,.22)'; for (let y = 0; y < 3.3; y += .16) g.fillRect(sx0, Y(y), sw, .035 * s);
  g.fillStyle = 'rgba(255,230,200,.05)'; g.fillRect(sx0, Y(3.3), sw, .2 * s);
  g.fillStyle = frame; g.fillRect(X(Wm * .74), Y(2.6), 1.3 * s, 2.6 * s);                                          // door
}

// the street from above, Wm x Dm metres; canvas top = the far edge (the facades). A wide sidewalk, the curb, a wet road
// with long warm reflections under each lamp (lampX), lane dashes, puddles.
export function wetStreet(g, w, h, { Wm = 160, Dm = 40, walk = 9, road = 13, lampX = [] } = {}) {
  const s = w / Wm, X = x => (x + Wm / 2) * s, Z = d => d * s;          // d = metres from the far edge
  g.fillStyle = '#3a3046'; g.fillRect(0, 0, w, Z(walk));
  g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = Math.max(1, .04 * s);
  for (let x = 0; x < Wm; x += 1.2) { g.beginPath(); g.moveTo(x * s, 0); g.lineTo(x * s, Z(walk)); g.stroke(); }
  for (let d = 1.2; d < walk; d += 1.2) { g.beginPath(); g.moveTo(0, Z(d)); g.lineTo(w, Z(d)); g.stroke(); }
  g.fillStyle = 'rgba(160,170,230,.06)'; g.fillRect(0, Z(walk * .55), w, Z(walk * .45));                            // wet sheen
  g.fillStyle = '#5a4a62'; g.fillRect(0, Z(walk), w, Z(.3)); g.fillStyle = 'rgba(255,230,210,.18)'; g.fillRect(0, Z(walk), w, Z(.06));
  g.fillStyle = vgrad(g, 0, Z(walk + .3), Z(walk + road), [[0, '#221b2e'], [1, '#2a2236']]); g.fillRect(0, Z(walk + .3), w, Z(road));
  g.fillStyle = 'rgba(240,220,190,.28)'; for (let x = 0; x < Wm; x += 6) g.fillRect(x * s, Z(walk + road * .55), 2.6 * s, .16 * s);
  // reflections: warm streaks on the road and the wet sidewalk, long toward the viewer
  for (const lx of lampX) {
    const gr = g.createLinearGradient(0, Z(walk - 2), 0, Z(walk + road)); gr.addColorStop(0, 'rgba(255,196,120,0)'); gr.addColorStop(.25, 'rgba(255,196,120,.3)'); gr.addColorStop(1, 'rgba(255,196,120,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(X(lx + .8), Z(walk + road * .35), .55 * s, road * .6 * s, 0, 0, 7); g.fill();
  }
  const R = rng(4);
  for (let i = 0; i < 60; i++) { const x = R() * w, d = walk + .8 + R() * (road - 1.5); g.fillStyle = `rgba(150,150,210,${.05 + R() * .07})`; g.beginPath(); g.ellipse(x, Z(d), (1 + R() * 3) * s, (.2 + R() * .5) * s, 0, 0, 7); g.fill(); }
  g.fillStyle = '#5a4a62'; g.fillRect(0, Z(walk + road + .3), w, Z(.3));
  g.fillStyle = '#342b40'; g.fillRect(0, Z(walk + road + .6), w, h);
}
// a cast-iron bollard, a fire hydrant: small things for the foreground
export function bollard(g, w, h) {
  g.fillStyle = '#120d1b'; g.beginPath(); g.roundRect(w * .3, h * .12, w * .4, h * .88, [w * .2, w * .2, 0, 0]); g.fill();
  g.fillRect(w * .22, h * .3, w * .56, h * .06); g.fillStyle = 'rgba(255,214,170,.18)'; g.fillRect(w * .6, h * .16, w * .06, h * .8);
}

// ------------------------------------------------------------------ the bedroom
// a low bed seen from the side, Wm 2.3 x 1.1 m: the headboard on the left, mattress top at .36 m (a sitting Stick's
// thighs), a blanket thrown back toward the foot end, a pillow
export const BED = { Wm: 2.3, top: .36 };
export function bed(g, w, h) {
  const s = w / BED.Wm, X = x => x * s, Y = y => h - y * s, T = BED.top;
  g.fillStyle = '#2a1f2e'; g.beginPath(); g.roundRect(X(0), Y(1.05), .12 * s, 1.05 * s, [.04 * s, .04 * s, 0, 0]); g.fill();           // headboard
  g.fillStyle = '#3a2a3a'; g.fillRect(X(.12), Y(.2), (BED.Wm - .14) * s, .15 * s);                                               // frame
  g.fillStyle = '#2a1f2e'; g.fillRect(X(.16), Y(.06), .07 * s, .06 * s); g.fillRect(X(BED.Wm - .12), Y(.06), .07 * s, .06 * s);     // feet
  g.fillStyle = '#d9d2df'; g.beginPath(); g.roundRect(X(.12), Y(T), (BED.Wm - .14) * s, (T - .2) * s, .05 * s); g.fill();           // mattress
  g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(X(.12), Y(.24), (BED.Wm - .14) * s, .04 * s);
  g.fillStyle = '#efe9f0'; g.beginPath(); g.ellipse(X(.42), Y(T + .07), .26 * s, .085 * s, -.05, 0, 7); g.fill();               // pillow
  // the blanket: lies over the head half, thrown back in folds, one corner hanging over the side
  g.fillStyle = '#3a6f86'; g.beginPath(); g.moveTo(X(.2), Y(T + .02)); g.quadraticCurveTo(X(.7), Y(T + .09), X(1.05), Y(T + .05));
  g.quadraticCurveTo(X(1.22), Y(T + .2), X(1.34), Y(T + .08)); g.quadraticCurveTo(X(1.44), Y(T + .02), X(1.42), Y(.16));
  g.quadraticCurveTo(X(1.2), Y(.1), X(.9), Y(.15)); g.lineTo(X(.2), Y(.22)); g.closePath(); g.fill();
  g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.moveTo(X(1.05), Y(T + .05)); g.quadraticCurveTo(X(1.2), Y(T - .04), X(1.42), Y(.16)); g.lineTo(X(1.34), Y(T + .08)); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = .02 * s; g.beginPath(); g.moveTo(X(.3), Y(T + .03)); g.quadraticCurveTo(X(.7), Y(T + .08), X(1.0), Y(T + .05)); g.stroke();
}
// a small bedside table, .5 x .55 m (top at .5)
export function nightstand(g, w, h) {
  const s = w / .5, Y = y => h - y * s;
  g.fillStyle = '#4a3040'; g.beginPath(); g.roundRect(0, Y(.5), w, .06 * s, .015 * s); g.fill();
  g.fillStyle = '#3d2836'; g.fillRect(.03 * s, Y(.45), w - .06 * s, .4 * s);
  g.fillStyle = '#4a3040'; g.fillRect(.05 * s, Y(.42), w - .1 * s, .16 * s);
  g.fillStyle = '#e8c27a'; g.beginPath(); g.roundRect(w / 2 - .05 * s, Y(.35), .1 * s, .018 * s, .009 * s); g.fill();
  g.fillStyle = '#2a1f2e'; g.fillRect(.04 * s, Y(.05), .04 * s, .05 * s); g.fillRect(w - .08 * s, Y(.05), .04 * s, .05 * s);
}
// the phone on its little stand: ring 0..1 pulses the screen; off = dark
export function phone(g, w, h, { on = true, ring = 0, time = '05:00', font = 'Inter' } = {}) {
  g.fillStyle = '#15111c'; g.beginPath(); g.roundRect(w * .04, 0, w * .92, h * .9, w * .14); g.fill();
  g.fillStyle = '#2a2234'; g.fillRect(w * .3, h * .88, w * .4, h * .12);
  if (!on) { g.fillStyle = '#1d1a28'; g.beginPath(); g.roundRect(w * .12, h * .05, w * .76, h * .8, w * .08); g.fill(); return; }
  g.fillStyle = vgrad(g, 0, h * .05, h * .85, [[0, mix('#9fb6ff', '#ffffff', ring * .5)], [1, mix('#6d7fd8', '#c9d4ff', ring * .4)]]);
  g.beginPath(); g.roundRect(w * .12, h * .05, w * .76, h * .8, w * .08); g.fill();
  g.fillStyle = '#10142a'; g.font = `900 ${w * .3}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(time, w / 2, h * .3);
  g.strokeStyle = '#10142a'; g.lineWidth = w * .04; g.beginPath(); g.arc(w / 2, h * .6, w * (.1 + ring * .05), 0, 7); g.stroke();
  g.beginPath(); g.moveTo(w / 2, h * .6); g.lineTo(w / 2, h * .55); g.lineTo(w * .54, h * .62); g.stroke();
}

// ------------------------------------------------------------------ the rooftop at dawn
// the roof seen from above, Wm x Dm m; canvas top = far edge (the parapet). Concrete slabs, tar seams, puddles from the
// night's rain holding the dawn sky
export function roofFloor(g, w, h, { Wm = 30, Dm = 14 } = {}) {
  const s = w / Wm, R = rng(21);
  g.fillStyle = vgrad(g, 0, 0, h, [[0, '#6a5868'], [1, '#5a4a5c']]); g.fillRect(0, 0, w, h);
  for (let x = 0; x < Wm; x += 2) for (let d = 0; d < Dm; d += 2) { g.fillStyle = `rgba(${R() < .5 ? '255,235,215' : '0,0,0'},${.02 + R() * .04})`; g.fillRect(x * s, d * s, 2 * s, 2 * s); }
  g.strokeStyle = 'rgba(30,20,34,.45)'; g.lineWidth = Math.max(1, .05 * s);
  for (let x = 0; x <= Wm; x += 2) { g.beginPath(); g.moveTo(x * s, 0); g.lineTo(x * s, h); g.stroke(); }
  for (let d = 0; d <= Dm; d += 2) { g.beginPath(); g.moveTo(0, d * s); g.lineTo(w, d * s); g.stroke(); }
  for (const [x, d, rx, rd] of [[19, 1.6, 2.6, .5], [9, 3.2, 1.8, .35], [22.5, 4.6, 1.5, .3], [4, 1.2, 1.2, .25], [14, 6.5, 2.2, .45]]) {
    const gr = g.createLinearGradient(0, (d - rd) * s, 0, (d + rd) * s); gr.addColorStop(0, '#f2a06a'); gr.addColorStop(.6, '#b77486'); gr.addColorStop(1, '#6d5a86');
    g.fillStyle = gr; g.beginPath(); g.ellipse(x * s, d * s, rx * s, rd * s, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,240,220,.35)'; g.beginPath(); g.ellipse(x * s + rx * s * .2, d * s - rd * s * .3, rx * s * .5, rd * s * .12, 0, 0, 7); g.fill();
  }
}
// the low wall at the roof's edge: Wm x 1.1 m, its cap catching the sun
export function parapet(g, w, h, { Wm = 30 } = {}) {
  const s = w / Wm;
  g.fillStyle = vgrad(g, 0, 0, h, [[0, '#4f4058'], [1, '#3e3248']]); g.fillRect(0, .12 * s, w, h);
  g.fillStyle = '#6e5a6a'; g.fillRect(0, 0, w, .14 * s); g.fillStyle = 'rgba(255,200,150,.55)'; g.fillRect(0, 0, w, .04 * s);
  g.fillStyle = 'rgba(0,0,0,.18)'; for (let x = 0; x < Wm; x += 1.5) g.fillRect(x * s, .14 * s, .03 * s, h);
}
// a water tank on four legs, 3 x 5 m, and a vent stack
export function tank(g, w, h) {
  const ink = '#2a2032';
  g.fillStyle = ink; g.strokeStyle = ink; g.lineWidth = w * .03;
  for (const x of [.18, .38, .62, .82]) { g.beginPath(); g.moveTo(w * x, h * .58); g.lineTo(w * (x + (x - .5) * .15), h); g.stroke(); }
  g.beginPath(); g.moveTo(w * .14, h * .8); g.lineTo(w * .86, h * .66); g.moveTo(w * .14, h * .66); g.lineTo(w * .86, h * .8); g.stroke();
  g.fillStyle = '#3b2e40'; g.beginPath(); g.roundRect(w * .1, h * .2, w * .8, h * .4, w * .04); g.fill();
  g.fillStyle = ink; for (let i = 0; i < 5; i++) g.fillRect(w * .1, h * (.24 + i * .08), w * .8, h * .012);
  g.beginPath(); g.moveTo(w * .06, h * .21); g.lineTo(w * .5, h * .06); g.lineTo(w * .94, h * .21); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,190,140,.28)'; g.fillRect(w * .8, h * .2, w * .1, h * .4);
}
export function vent(g, w, h) {
  g.fillStyle = '#3b2e40'; g.beginPath(); g.roundRect(w * .1, h * .3, w * .8, h * .7, w * .05); g.fill();
  g.fillStyle = '#2a2032'; for (let i = 0; i < 5; i++) g.fillRect(w * .16, h * (.4 + i * .1), w * .68, h * .035);
  g.fillRect(w * .4, 0, w * .2, h * .32); g.fillRect(w * .3, 0, w * .4, h * .06);
  g.fillStyle = 'rgba(255,190,140,.25)'; g.fillRect(w * .78, h * .3, w * .12, h * .7);
}
export function antenna(g, w, h) {
  g.strokeStyle = '#241b2c'; g.lineCap = 'round'; g.lineWidth = w * .04;
  g.beginPath(); g.moveTo(w * .5, h); g.lineTo(w * .5, h * .05); g.stroke();
  g.lineWidth = w * .03; for (const [y, l] of [[.15, .35], [.3, .28], [.45, .2]]) { g.beginPath(); g.moveTo(w * (.5 - l), h * y); g.lineTo(w * (.5 + l), h * y); g.stroke(); }
  g.fillStyle = '#ff5a4a'; g.beginPath(); g.arc(w * .5, h * .05, w * .05, 0, 7); g.fill();
}

// ------------------------------------------------------------------ the 1 % chart
// 365 days of 1.01^d (warm, rising) and 0.99^d (cold, falling), drawn up to day `d`. Returns the warm tip in 0..1 card
// coordinates (x right, y up), for the little runner that rides it.
export const CH = { l: .08, r: .9, b: .16, t: .06, ymax: 40 };
export function chart(g, w, h, d, { font = 'Inter', a = 1, glow = 1 } = {}) {
  const X = day => w * (CH.l + (CH.r - CH.l) * day / 365), Yv = v => h * (1 - CH.b - (1 - CH.b - CH.t) * v / CH.ymax);
  g.save(); g.globalAlpha = a;
  g.strokeStyle = 'rgba(170,185,230,.16)'; g.lineWidth = 2;
  for (const v of [10, 20, 30, 40]) { g.beginPath(); g.moveTo(X(0), Yv(v)); g.lineTo(X(365), Yv(v)); g.stroke(); }
  g.fillStyle = '#e9d9b0'; g.fillRect(X(0), Yv(0), X(365) - X(0), h * .006);
  g.font = `700 ${h * .045}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'top';
  for (const [k, lab] of [[0, '0'], [91, '3 AY'], [182, '6 AY'], [273, '9 AY'], [365, '1 YIL']]) { g.fillRect(X(k) - 1, Yv(0), 3, h * .02); g.fillText(lab, X(k), Yv(0) + h * .035); }
  g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(233,217,176,.6)';
  for (const v of [10, 20, 30, 40]) g.fillText(`${v}×`, X(0) - w * .012, Yv(v));
  g.setLineDash([10, 10]); g.strokeStyle = 'rgba(233,217,176,.45)'; g.beginPath(); g.moveTo(X(0), Yv(1)); g.lineTo(X(365), Yv(1)); g.stroke(); g.setLineDash([]);
  const line = (k, col, wdt) => {
    g.strokeStyle = col; g.lineWidth = wdt; g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath();
    const n = Math.max(1, Math.ceil(d));
    for (let i = 0; i <= n; i++) { const day = Math.min(d, i); const v = Math.pow(k, day); i ? g.lineTo(X(day), Yv(v)) : g.moveTo(X(day), Yv(v)); }
    g.stroke();
  };
  g.shadowColor = '#7f9bff'; g.shadowBlur = 14 * glow; line(.99, '#8fa6ff', h * .012);
  g.shadowColor = '#ffb45a'; g.shadowBlur = 26 * glow; line(1.01, '#ffb45a', h * .016); g.shadowBlur = 0; line(1.01, '#ffe0b0', h * .006);
  const tip = [CH.l + (CH.r - CH.l) * d / 365, CH.b + (1 - CH.b - CH.t) * Math.pow(1.01, d) / CH.ymax];
  g.fillStyle = '#ffe9c8'; g.beginPath(); g.arc(X(d), Yv(Math.pow(1.01, d)), h * .016, 0, 7); g.fill();
  g.fillStyle = '#b9c7ff'; g.beginPath(); g.arc(X(d), Yv(Math.pow(.99, d)), h * .012, 0, 7); g.fill();
  g.font = `900 ${h * .05}px ${font}`; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillStyle = '#9fb3ff'; g.fillText('0,99', X(d) + w * .015, Yv(Math.pow(.99, d)) - h * .045);
  g.fillStyle = '#ffd08a'; if (d > 30) g.fillText('1,01', X(d) - w * .075, Yv(Math.pow(1.01, d)) - h * .03);
  g.restore();
  return tip;
}
