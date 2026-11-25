// Alt Tarafı Balkabağı : a story told by the older sibling ("ben"), 16:9, 24 fps, silhouette stickman style.
// A pumpkin patch at dusk. The little sister is on a pile of pumpkins; a man digs the biggest one out of the bottom;
// her leg gets pinched; the narrator holds the pile up; the man pulls once more and the pile buries him instead.
//
// Everything is placed relative to the voice lines (satirlar.js): T.Lxx = start, E.Lxx = end of a line. Real time t
// drives the camera, the bars and the overlay; WORLD time w drives everything that moves in the set, so the collapse
// can run in slow motion under the narration (L25, L26) while the camera keeps its own pace.
import * as THREE from 'three';
import { card, lerp, clamp01, smoother, ramp, rng, mix } from '/engine/src/layer.js';
import { Stick, walk, joints, armTo, mouthOf } from '/engine/src/stick.js';
import { CamPath } from '/engine/src/camera.js';
import { BARS, tightAt, barCues, tightColor } from '/engine/src/bars.js';
import * as P from './tarla.js';
import { Track } from './yigin.js';
import { SATIR, timeline } from './satirlar.js';

export const NAME = 'balkabagi'; export const FPS = 24;
export let DUR = 150, LINES = [], CUES = [];
const FONT = 'Inter';
const SUBS = true;                       // burned-in captions (the draft has no voice yet)

let T, E, SH, TIGHT, C0, WK;             // timeline, shots, tight spans, collapse start, world-clock knots
const W = {};                            // world handles
const WHO = Object.fromEntries(SATIR.map(([id, who, text]) => [id, { who, text }]));
const D = Math.PI / 180;

// ------------------------------------------------------------------ world clock
const wt = t => { for (let i = 0; i + 1 < WK.length; i++) { const [a, wa] = WK[i], [b, wb] = WK[i + 1]; if (t < b) return wa + (wb - wa) * Math.max(0, t - a) / (b - a); }
  const [a, wa] = WK[WK.length - 1]; return wa + (t - a); };
const dur = id => E[id] - T[id];
const at = (id, k) => T[id] + dur(id) * k;          // a moment inside a line
const speaking = (t, who) => SATIR.some(([id, w]) => w === who && t > T[id] + .05 && t < E[id] - .1);
const talk = t => Math.sin(t * 31) > -.1;           // mouth open / closed while speaking

// ------------------------------------------------------------------ places (metres; the pile stands at x 0, its front at z .32)
const NX = -1.05, NZ = .72;                         // the narrator at the pile
const KZ = .3;                                      // the sister on the pile
const S0 = [-.28, 1.5], S1 = [-.42, 1.0];           // the sister's hip: up on the pile, then where she gets stuck
const MZ = .55;                                     // the man
const HAY = { x: -3.85, y: .5, z: .62 };            // the front row of bales: two bales, seat height .5
const SEAT_ME = -3.62, SEAT_KIZ = -3.02;            // where they sit afterwards (hip x)
const GAP = [-3.86, .17, .97];                      // the gap between the two front bales, where the small pumpkin ends up

// pumpkins: [id, x, r, row, layer] (front layer F*, back layer B*, ground G*); y = .79 r for a pumpkin on the ground
const RV = .79;
const PILE = [
  ['F0', -1.38, .27, 0, 'F'], ['F1', -.8, .31, 0, 'F'], ['F2', -.18, .3, 0, 'F'], ['BIG', .62, .43, 0, 'F'], ['F4', 1.45, .3, 0, 'F'],
  ['F5', -1.08, .27, 1, 'F', .62], ['F6', -.5, .29, 1, 'F', .66], ['F7', .1, .28, 1, 'F', .68], ['F8', .98, .29, 1, 'F', .92],
  ['F9', -.8, .27, 2, 'F', 1.03], ['F10', -.22, .28, 2, 'F', 1.08], ['F11', .45, .28, 2, 'F', 1.16],
  ['PA', -.5, .27, 3, 'F', 1.45], ['PB', .12, .27, 3, 'F', 1.5],
  ['F14', -.2, .3, 4, 'F', 1.88],
  ['B0', -1.1, .3, 0, 'B'], ['B1', -.48, .3, 0, 'B'], ['B2', .15, .3, 0, 'B'], ['B3', 1.05, .3, 0, 'B'],
  ['B4', -.8, .29, 1, 'B', .66], ['B5', -.18, .29, 1, 'B', .68], ['B6', .48, .29, 1, 'B', .7],
  ['B7', -.5, .28, 2, 'B', 1.08], ['B8', .2, .28, 2, 'B', 1.1], ['B9', -.15, .28, 3, 'B', 1.5],
];
const GROUND = [['G0', -1.95, .22, .5], ['G1', -2.45, .19, -.5], ['G2', 2.85, .24, -.7], ['G3', 3.6, .2, .3], ['G4', -1.75, .18, 1.6], ['G5', 4.4, .26, -1.4], ['G6', -5.2, .22, -.4]];
const zOf = (row, layer) => layer === 'F' ? .32 - row * .17 : -.32 - row * .14;

// ------------------------------------------------------------------ setup
export async function setup(ctx) {
  const { scene, base } = ctx;
  for (const f of [`900 64px ${FONT}`, `700 64px ${FONT}`, `600 40px ${FONT}`]) await document.fonts.load(f);
  let sure = null;
  try { const r = await fetch(base + 'voice/sureler.json'); if (r.ok) sure = await r.json(); } catch (e) { /* no voice yet */ }
  const tl = timeline(sure); T = tl.T; E = tl.E; LINES = tl.LINES; DUR = tl.DUR;
  // the collapse: the man yanks the big one at 60 % of L24, the pile goes at 74 % ("... ve bütün yığın çöktü")
  C0 = at('L24', .74);
  // world clock: real time until the pile starts to go, then slow motion over L25 (the two pumpkins part) and L26 (the
  // rescue), then real time again for the crash
  WK = [[0, 0], [C0 + .3, C0 + .3], [T.L26, C0 + .62], [E.L26 + .15, C0 + 2.1]];
  buildShots();
  TIGHT = [[T.L04 + .05, at('L04', .98)], [T.L12, E.L12 - .1], [T.L19, E.L19], [C0 - .05, E.L26 + .15]];

  // ---------------------------------------------------------------- the set
  const A = new THREE.Group(); scene.add(A); W.A = A;
  const keep = m => { m.userData.keep = true; return m; };
  W.sky = keep(card(A, 360, 120, P.sky, { pos: [0, 30, -150], px: 8, order: 0 }));
  W.sun = keep(card(A, 20, 20, (g, w, h) => P.glow(g, w, h, '255,206,150', .14), { pos: [-46, 5.5, -120], px: 16, add: true, order: 1 }));
  W.sun.material.color.setScalar(.9);
  W.sunDisc = keep(card(A, 3.6, 3.6, (g, w, h) => P.disc(g, w, h, '#ffe2b0'), { pos: [-46, 5.5, -119.5], px: 40, order: 2 }));
  W.hFar = card(A, 300, 22, (g, w, h) => P.hills(g, w, h, { seed: 3, col: '#4b3d66', top: .25, amp: .5, trees: 40, lit: 'rgba(255,190,150,.25)' }), { pos: [0, 6, -90], px: 10, order: 2 });
  W.hMid = card(A, 160, 14, (g, w, h) => P.hills(g, w, h, { seed: 9, col: '#3e3150', top: .35, amp: .45, rows: 6, trees: 14 }), { pos: [0, 3.2, -45], px: 16, order: 3 });
  W.barn = card(A, 9, 7.5, P.barn, { pos: [11, 3.4, -30], px: 60, order: 4 });
  W.barnG = keep(card(A, 5, 5, (g, w, h) => P.glow(g, w, h, '255,200,130', .12), { pos: [11, 4.9, -29.8], px: 30, add: true, order: 5, opacity: .55 }));
  W.silo = card(A, 3, 10, P.silo, { pos: [16.4, 4.6, -32], px: 40, order: 4 });
  W.trees = card(A, 70, 9, (g, w, h) => P.hills(g, w, h, { seed: 14, col: '#2f2640', top: .75, amp: .1, trees: 26, treeCol: '#2a2238' }), { pos: [-18, 3.6, -26], px: 20, order: 4 });
  W.field = card(A, 60, 8, fieldRows, { pos: [0, 0, -14], rot: [-Math.PI / 2, 0, 0], px: 30, order: 4 });
  W.fence = card(A, 30, 1.2, P.fence, { pos: [0, .6, -9], px: 50, order: 6 });
  W.ground = card(A, 90, 50, P.ground, { pos: [0, 0, -12], rot: [-Math.PI / 2, 0, 0], px: 28, order: 3 });
  // poles and string lights over the stalls
  for (const [x, z] of [[-7.5, -5], [-1.5, -5.6], [4.5, -5.2], [10, -4.6]]) card(A, .5, 4.4, P.pole, { pos: [x, 2.2, z], px: 80, order: 7 });
  W.lights = [];
  for (const [x0, x1, z, s] of [[-7.5, -1.5, -5.3, 1], [-1.5, 4.5, -5.4, 2], [4.5, 10, -4.9, 3]]) W.lights.push(keep(card(A, x1 - x0, 1.6, (g, w, h) => P.lights(g, w, h, { seed: s }), { pos: [(x0 + x1) / 2, 3.55, z], px: 90, order: 8 })));
  W.sign = card(A, 2.2, 1.6, (g, w, h) => P.sign(g, w, h, FONT), { pos: [-6.2, .8, -2.8], px: 160, order: 9 });
  W.shock1 = card(A, 1.4, 2.4, (g, w, h) => P.cornShock(g, w, h, 6), { pos: [-8.6, 1.2, -3.8], px: 80, order: 9 });
  W.shock2 = card(A, 1.3, 2.2, (g, w, h) => P.cornShock(g, w, h, 9), { pos: [6.8, 1.1, -3.2], px: 80, order: 9 });
  W.scare = card(A, 1.6, 2.6, P.scarecrow, { pos: [9.5, 1.3, -7.5], px: 70, order: 8 });
  W.crate1 = card(A, 1.0, .75, (g, w, h) => P.crate(g, w, h, { seed: 4 }), { pos: [4.2, .37, -1.6], px: 150, order: 9 });
  W.crate2 = card(A, 1.0, .75, (g, w, h) => P.crate(g, w, h, { seed: 7 }), { pos: [5.1, .37, -1.9], px: 150, order: 9 });
  W.barrow = card(A, 1.6, .9, P.wheelbarrow, { pos: [-6.6, .45, -1.2], px: 120, order: 9 });
  // hay bales: two in front (the seat), one stacked behind; each a front face, a top and an end
  const bale = (x, y, z, w, h, d, seed) => {
    card(A, w, h, (g, cw, ch) => P.baleFront(g, cw, ch, seed), { pos: [x, y + h / 2, z + d / 2], px: 200, order: 11 });
    card(A, w, d, (g, cw, ch) => P.baleTop(g, cw, ch, seed + 1), { pos: [x, y + h, z], rot: [-Math.PI / 2, 0, 0], px: 160, order: 10 });
    card(A, d, h, (g, cw, ch) => P.baleFront(g, cw, ch, seed + 2), { pos: [x + w / 2, y + h / 2, z], rot: [0, Math.PI / 2, 0], px: 160, order: 10 });
  };
  bale(-4.45, 0, .62, 1.1, .5, .55, 1); bale(-3.28, 0, .62, 1.1, .5, .55, 4); bale(-3.9, .5, .1, 1.1, .5, .55, 7); bale(-5.0, 0, -.2, 1.1, .5, .55, 10);
  // jack-o'-lanterns: warm points on the bales and by the sign
  W.lan = [];
  for (const [x, y, z, r, s] of [[-4.2, 1.0 + .17, .1, .2, 3], [-5.6, .16, -2.4, .2, 5], [3.4, .16, -2.6, .22, 8]]) {
    const m = card(A, r * 2.38, r * 2.38, (g, w, h) => P.pumpkin(g, w, h, { col: '#e0702c', seed: s, lantern: true }), { pos: [x, y, z], px: 300, order: 12 });
    const gl = keep(card(A, 2.4, 2.4, (g, w, h) => P.glow(g, w, h, '255,190,110', .12), { pos: [x, y, z + .05], px: 40, add: true, order: 13, opacity: .5 }));
    W.lan.push({ m, gl });
  }
  // the pile and the loose pumpkins (billboards)
  W.pk = {};
  const R = rng(17);
  const mk = (id, x, y, z, r, opts = {}) => {
    const col = opts.col || P.PCOL[Math.floor(R() * P.PCOL.length)], seed = Math.floor(R() * 1000), kind = r > .4 ? 'round' : R() < .25 ? 'flat' : 'round';
    const m = card(A, r * 2.38, r * 2.38, (g, w, h) => P.pumpkin(g, w, h, { col, kind, seed }), { pos: [x, y, z], px: opts.px ?? 260, order: 20 });
    const pk = { id, m, r, home: [x, y, z], tr: new Track([x, y, z], r), wob: 0, seed: R() * 9 };
    W.pk[id] = pk; return pk;
  };
  for (const [id, x, r, row, layer, y] of PILE) mk(id, x, y ?? r * RV, zOf(row, layer), r, id === 'BIG' ? { col: '#e8762c', px: 300 } : {});
  for (const [id, x, r, z] of GROUND) mk(id, x, r * RV, z, r);
  mk('SMALL', 0, 0, 0, .13, { col: '#f0a040', px: 600 });
  // the man's pulled pumpkins land here
  W.F4rest = [2.75, .3 * RV, 1.0];

  // ---------------------------------------------------------------- people
  const rim = '#ffcf96';
  W.me = new Stick(A, { order: 20, height: 1.75, hood: '#3aa58f', hoodDark: '#237565', rim, px: 300 });
  W.kiz = new Stick(A, { order: 20, height: 1.02, hood: '#e58bb0', hoodDark: '#b0607f', rim, px: 300, extra: pigtails });
  W.adam = new Stick(A, { order: 20, height: 1.95, hood: '#a9503c', hoodDark: '#7a3528', hat: 'cap', hatColor: '#3d4f74', rim, px: 280 });
  // extras far behind: a mother and child choosing a pumpkin, a man pushing a barrow along the fence
  W.ex1 = new Stick(A, { order: 9, height: 1.7, hood: '#6f87b8', hoodDark: '#4c628c', rim, px: 90 });
  W.ex2 = new Stick(A, { order: 9, height: 1.05, hood: '#e6b54a', hoodDark: '#b38832', hat: 'beanie', hatColor: '#c8505a', rim, px: 90 });
  W.ex3 = new Stick(A, { order: 9, height: 1.75, hood: '#7d9a6a', hoodDark: '#5a7448', hat: 'cap', hatColor: '#6a3a3a', rim, px: 80 });
  W.exP = card(A, .5, .5, (g, w, h) => P.pumpkin(g, w, h, { col: '#e8782e', seed: 44 }), { pos: [-6.4, .17, -7.4], px: 120, order: 9 });
  // dust in the low sun
  { const n = 140, pos = new Float32Array(n * 3), R2 = rng(5); for (let i = 0; i < n; i++) { pos[i * 3] = (R2() - .5) * 16; pos[i * 3 + 1] = R2() * 4; pos[i * 3 + 2] = -4 + R2() * 9; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    W.dust = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffe6c4', size: .03, transparent: true, opacity: .6, depthWrite: false, blending: THREE.AdditiveBlending }));
    W.dust.userData.keep = true; W.dust.renderOrder = 40; A.add(W.dust); W.dust0 = pos.slice(); }
  // straw and dirt that burst out when the pile comes down, and the dirt the man spits
  { const n = 260, pos = new Float32Array(n * 3), R3 = rng(31); W.burst = [];
    for (let i = 0; i < n; i++) W.burst.push({ x: (R3() - .3) * 3.4, z: .2 + R3() * 1.2, vx: (R3() - .4) * 2.4, vy: 1 + R3() * 2.6, d: R3() * .5 });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    W.straw = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#d9b070', size: .035, transparent: true, opacity: .9, depthWrite: false }));
    W.straw.userData.keep = true; W.straw.renderOrder = 41; A.add(W.straw); }
  W.spit = card(A, .5, .3, null, { pos: [0, 0, 0], px: 400, order: 42, noDepth: true });

  planPumpkins();
  // sound cues (mix.py reads these)
  CUES.push(...cuesFor());
  CUES.push(...barCues(TIGHT));
  ctx.W = W;
}

// the sister's pigtails, drawn with her (behind the head) so they share her rim and depth
function pigtails(g, J, tx, ty, px, sil, when) {
  if (when !== 'mid') return;
  const h = J.head, u = px;
  for (const s of [-1, 1]) {
    const x = tx(h[0] + s * .5), y = ty(h[1] + .05);
    g.fillStyle = sil ? '#000' : '#08070b'; g.beginPath(); g.ellipse(x + s * .08 * u, y + .1 * u, .2 * u, .26 * u, s * .5, 0, 7); g.fill();
    g.fillStyle = sil ? '#000' : '#f6d36b'; g.beginPath(); g.arc(x - s * .04 * u, y - .08 * u, .085 * u, 0, 7); g.fill();
  }
}
// distant field: rows of little pumpkins among dark leaves (a ground card behind the fence)
function fieldRows(g, w, h) {
  g.fillStyle = '#4a3c4c'; g.fillRect(0, 0, w, h);
  const R = rng(12);
  for (let r = 0; r < 9; r++) {
    const y = h * (r + .5) / 9;
    g.fillStyle = 'rgba(40,60,50,.8)'; g.fillRect(0, y - h * .025, w, h * .05);
    for (let i = 0; i < 70; i++) if (R() < .5) { g.fillStyle = P.PCOL[Math.floor(R() * 6)]; g.beginPath(); g.ellipse(R() * w, y, w * .004, h * .02, 0, 0, 7); g.fill(); }
  }
}

// ------------------------------------------------------------------ the pumpkins' moves (world time)
function planPumpkins() {
  const K = W.pk, R = rng(91), w = t => wt(t);
  // the pinch (L04): the two top-left pumpkins of the same size roll down onto her shin
  const pa = [-.8, .74, .52], pb = [-.47, .72, .54];
  K.PA.tr.move(w(at('L04', .3)), w(at('L04', .62)), pa, { arc: .12, ease: 'in' });
  K.PB.tr.move(w(at('L04', .36)), w(at('L04', .7)), pb, { arc: .16, ease: 'in' });
  // after the first pull the right side settles into the hole
  K.F8.tr.move(w(E.L02 + .05), w(E.L02 + .4), [1.12, .74, .15], { ease: 'in' });
  K.F11.tr.move(w(E.L02 + .15), w(E.L02 + .5), [.52, 1.08, -.04], { ease: 'in' });
  // L15: the top one rolls down and stops right in front of her face
  K.F14.tr.move(w(at('L15', .25)), w(at('L15', .62)), [-.78, 1.3, .5], { arc: .25, ease: 'in' });
  // L17: the shoulder goes under it; F9 rolls onto it. L18: both slide toward the narrator
  K.F14.tr.move(w(at('L17', .2)), w(at('L17', .45)), [-.78, 1.36, .5]);
  K.F9.tr.move(w(at('L17', .3)), w(at('L17', .6)), [-.6, 1.78, .42], { arc: .05 });
  K.F14.tr.move(w(T.L18), w(E.L18), [-.86, 1.31, .5]);
  K.F9.tr.move(w(T.L18), w(E.L18), [-.7, 1.72, .42]);
  // the collapse: everything left in the pile goes. The right half buries the man, the left half spreads out.
  // where he ends up: sitting at x 2.35; the mound in front of him (z .95 - 1.25) up to his neck
  const mound = [[1.62, .3, 1.02], [2.08, .3, 1.08], [2.55, .3, 1.06], [3.02, .28, 1.0], [1.85, .29, .82], [2.85, .28, .84], [2.3, .27, 1.32], [1.4, .27, .7], [3.3, .26, .7]];
  const moundY = [0, 0, 0, 0, .44, .44, .06, 0, 0];
  const spread = [];
  for (let i = 0; i < 30; i++) spread.push([-2.3 + R() * 2.3 + (i % 3) * .2, -.9 + R() * 1.9]);
  const going = PILE.map(p => p[0]).filter(id => id !== 'BIG' && id !== 'F4' && id !== 'B3');
  going.sort((a, b) => K[b].home[0] - K[a].home[0]);       // rightmost first: they take the mound
  let mi = 0, si = 0;
  for (const id of going) {
    const k = K[id], from = k.tr.end, right = from[0] > -.05 && mi < mound.length;
    let to, delay;
    if (right) { const [x, r, z] = mound[mi]; to = [x, k.r * RV + moundY[mi] + (r - k.r) * 0, z]; mi++; }
    else { const [x, z] = spread[si++]; to = [x, k.r * RV, z]; }
    // the pile goes from the right (where he pulled) to the left: the left side, by her leg, holds until after L25
    delay = .05 + Math.max(0, 1.5 - from[0]) * .36 + (2.2 - from[1]) * .04 + R() * .1;
    if (id === 'PA' || id === 'PB') {                         // L25: the two that hold her leg part first
      const s = id === 'PA' ? -1 : 1;
      k.tr.move(C0 + .32, C0 + .6, [from[0] + s * .3, from[1] - .04, from[2] + .1], { ease: 'out' });
      delay = 1.0;
    }
    const d = .75 + R() * .5 + Math.abs(to[0] - from[0]) * .12;
    k.tr.fall(C0 + delay, d, to, { arc: .2 + R() * .35, bounce: right ? 1 : 2 });
  }
  // the small pumpkin: in her arms until L06, then down the pile and into the gap between the bales
  W.smallDrop = w(at('L06', .22));
  K.SMALL.tr = new Track([S1[0] - .2, S1[1] + .2, KZ + .15], .13);
  const s1 = [-.95, .52, .7], s2 = [-1.7, .1, .85];
  K.SMALL.tr.move(W.smallDrop, W.smallDrop + .35, s1, { ease: 'in' }).move(W.smallDrop + .35, W.smallDrop + .65, s2, { arc: .12 }).move(W.smallDrop + .65, W.smallDrop + 1.9, GAP, { ease: 'out' });
}

// ------------------------------------------------------------------ shots
// [start, name, camera, subject, size]  size: 'g' wide, 'o' medium, 'y' close (lens blur and focus range follow it)
function buildShots() {
  const S = (t, name, pos, look, fov, o = {}) => ({ t, name, pos, look, fov, ...o });
  SH = [
    S(0, 'genel', [.6, 1.75, 10.5], [-.4, 1.15, 0], 38, { push: 1.1, drift: [-.03, 0, 0], subj: 'kiz', size: 'g' }),
    S(T.L02 - .1, 'adam', [3.9, 1.45, 4.4], [1.7, .95, .2], 33, { push: .9, subj: 'adam', size: 'o' }),
    S(T.L03 - .12, 'hayir', [.2, 1.45, 3.2], [-1.0, 1.5, .72], 26, { push: 2.4, subj: 'me', size: 'y' }),
    S(T.L04 - .05, 'sikisma', [1.15, 1.1, 3.3], [-.5, .92, .4], 34, { push: 1.4, subj: 'pinch', size: 'o' }),
    S(T.L05 - .1, 'ah', [-.05, 1.6, 2.0], [-.45, 1.45, .3], 24, { push: 1.8, subj: 'kiz', size: 'y' }),
    S(T.L06 - .05, 'kucuk', [-1.6, .42, 3.6], [-2.6, .3, .7], 36, { drift: [-.18, 0, 0], subj: 'small', size: 'o' }),
    S(T.L07 - .05, 'omuz', [.9, 1.55, 4.3], [2.0, 1.35, .5], 30, { push: 1.0, subj: 'adam', size: 'o' }),
    S(T.L09 - .1, 'bel', [-.1, 1.4, 4.4], [-.75, 1.15, .5], 32, { push: 1.2, subj: 'me', size: 'o' }),
    S(T.L11 - .1, 'sallanma', [-.2, .75, 5.6], [-.3, 1.4, 0], 36, { push: 1.6, subj: 'kiz', size: 'g' }),
    S(T.L12, 'donma', [-.15, 1.45, 2.5], [-1.0, 1.5, .72], 27, { push: 1.2, subj: 'me', size: 'y' }),
    S(T.L13 - .1, 'uzanma', [-2.4, 1.55, 2.9], [1.6, .9, .4], 30, { push: .8, subj: 'adam', size: 'o' }),
    S(T.L14 - .1, 'ayirma', [.95, 1.15, 2.8], [-.62, .95, .5], 33, { push: 1.4, subj: 'pinch', size: 'y' }),
    S(T.L15 - .1, 'dusus', [.35, 1.65, 3.4], [-.45, 1.45, .3], 30, { push: 1.0, subj: 'kiz', size: 'o' }),
    S(T.L16 - .1, 'mide', [-.25, 1.4, 2.3], [-1.0, 1.48, .72], 25, { push: 2.6, subj: 'me', size: 'y' }),
    S(T.L17 - .1, 'omuzla', [.1, 1.3, 4.1], [-.65, 1.1, .45], 32, { push: 1.1, subj: 'me', size: 'o' }),
    S(T.L18 - .1, 'agir', [-.2, 1.5, 3.0], [-.8, 1.25, .5], 29, { push: 2.0, subj: 'me', size: 'o' }),
    S(T.L19, 'titreme', [-.2, .42, 3.1], [-1.1, .5, .72], 34, { push: 0, drift: [0, .06, 0], subj: 'meLegs', size: 'y' }),
    S(T.L20 - .1, 'dur', [2.9, 1.55, 3.1], [-.9, 1.3, .6], 30, { push: 1.2, subj: 'me', size: 'o' }),
    S(T.L21 - .1, 'kazma', [1.0, 1.15, 3.1], [1.6, .8, .35], 30, { push: 1.0, subj: 'adam', size: 'o' }),
    S(T.L23 - .1, 'catirti', [1.2, .5, 3.8], [-.2, 1.65, 0], 40, { push: 1.4, subj: 'top', size: 'o' }),
    S(T.L24 - .1, 'sarilma', [2.6, .95, 3.3], [1.3, .7, .3], 32, { push: 1.2, subj: 'adam', size: 'o' }),
    S(C0 - .05, 'cokus', [.2, 1.5, 8.4], [-.2, 1.0, 0], 40, { push: 0, drift: [-.02, 0, -.05], subj: 'kiz', size: 'g' }),
    S(T.L25 - .1, 'ayrilma', [1.1, 1.2, 3.8], [-.6, .92, .45], 32, { push: 1.0, subj: 'kiz', size: 'o' }),
    S(T.L26 - .1, 'kurtarma', [-.7, 1.35, 5.6], [-2.0, .95, .5], 34, { drift: [-.12, 0, 0], subj: 'me', size: 'o' }),
    S(E.L26 + .2, 'sessiz', [-.5, 1.6, 9.2], [-.4, .75, 0], 40, { push: .6, subj: 'hay', size: 'g' }),
    S(T.L27 - .1, 'sevinc', [-2.8, 1.15, 3.4], [-3.35, .98, .62], 30, { push: 1.2, subj: 'me', size: 'o' }),
    S(T.L28 - .1, 'gomulu', [1.6, 1.05, 4.6], [2.3, 1.0, .6], 30, { push: 1.6, subj: 'adam', size: 'o' }),
    S(T.L29 - .1, 'tukurme', [2.0, 1.05, 2.7], [2.33, 1.0, .55], 25, { push: 1.2, subj: 'adam', size: 'y' }),
    S(T.L31 - .1, 'kucak', [-3.0, 1.25, 3.7], [-3.45, .85, .62], 32, { push: 1.0, subj: 'kiz', size: 'o' }),
    S(T.L32 - .1, 'gulumseme', [-2.75, 1.0, 2.5], [-3.05, .98, .62], 25, { push: 1.6, subj: 'kiz', size: 'y' }),
    S(T.L33 - .2, 'son', [-2.35, 1.2, 3.7], [-3.3, .98, .7], 32, { push: 1.3, subj: 'me', size: 'o' }),
    S(E.L33 + .15, 'tepki', [2.05, 1.0, 2.6], [2.33, .98, .55], 26, { push: 1.8, subj: 'adam', size: 'y' }),
    S(E.L33 + 1.6, 'baslik', [-.4, 2.1, 11.5], [-.4, 1.45, 0], 40, { push: -1.0, drift: [0, .03, 0], subj: 'hay', size: 'g' }),
  ];
  W.path = new CamPath(SH.map((s, i) => ({ t: s.t, move: 'cut', pos: s.pos, look: s.look, fov: s.fov, push: s.push ?? 0, drift: s.drift })), { fps: FPS });
  W.path.kick(at('L15', .62), .5).kick(at('L23', .4), .8).kick(C0 + .05, 1.4).kick(E.L26 + .35, 1.0);
}
const shotAt = t => { let i = 0; while (i + 1 < SH.length && SH[i + 1].t <= t) i++; return i; };

// ------------------------------------------------------------------ figure helpers
const sgn = st => st.mesh.scale.x < 0 ? -1 : 1;
function toLocal(st, Pw) {                               // world [x, y] -> the figure's head units (it faces +x)
  const m = st.mesh, a = -m.rotation.z, c = Math.cos(a), s = Math.sin(a);
  const dx = Pw[0] - m.position.x, dy = Pw[1] - m.position.y;
  return [(dx * c - dy * s) * sgn(st) / st.hu, (dx * s + dy * c) / st.hu];
}
function toWorld(st, p) {
  const m = st.mesh, a = m.rotation.z, c = Math.cos(a), s = Math.sin(a), x = p[0] * sgn(st) * st.hu, y = p[1] * st.hu;
  return [m.position.x + x * c - y * s, m.position.y + x * s + y * c, m.position.z];
}
const face = (st, flip) => { st.o.rimDir = flip ? [1, -.35] : [-1, -.35]; };   // the low sun is up on the left
// squat: leg angles that keep the feet on the ground when the hip drops by `drop` head units
function squat(drop, spread = 0) {
  const c = Math.max(-1, Math.min(1, (1.9 - drop) / 1.9)), th = Math.acos(c) / D;
  return [[th + spread, -2 * th], [th * .85 - spread, -1.7 * th]];
}
const reach = (st, pose, Pw, bend = 1) => armTo(pose, toLocal(st, Pw), bend);
const place = (st, x, y, z, flip, rot = 0) => { st.at(x, y, z, flip); st.mesh.rotation.z = rot; face(st, flip); };

// ------------------------------------------------------------------ frame
export function frame(t, ctx) {
  const { cam } = ctx, si = shotAt(t), sh = SH[si], w = wt(t);
  const look = { bars: BARS.rest, tight: tightAt(t, TIGHT, FPS), vignette: .6, vigSize: 1, grain: .022, bloom: .6, bloomAt: .78, sat: .88, contrast: 1.0, lift: [.045, .038, .062], bg: '#1a1630' };
  W.path.apply(cam, t);
  // dusk tint on the set; people a little lighter so the rim survives; pumpkins between
  const setT = new THREE.Color('#b3a5c4'), pkT = new THREE.Color('#d6c4cc'), pplT = new THREE.Color('#ece4ee');
  W.A.traverse(o => { if (o.isMesh && !o.userData.keep && o.material.color) o.material.color.copy(setT); });
  for (const k of Object.values(W.pk)) k.m.material.color.copy(pkT);
  for (const st of [W.me, W.kiz, W.adam, W.ex1, W.ex2, W.ex3]) st.mesh.material.color.copy(pplT);
  for (const l of W.lights) l.material.color.setScalar(1.0);
  for (const { m, gl } of W.lan) { m.material.color.setScalar(1.0); gl.material.opacity = .45 + .08 * Math.sin(t * 7 + m.position.x); }

  pumpkinTracks(t, w);
  actMan(t, w); const mb = meBody(t, w); actKiz(t, w); meArms(t, w, mb); actExtras(t);
  pumpkinsPlace(t, w, cam);
  particles(t, w);

  // focus follows the subject of the shot
  const subj = subjectPoint(sh.subj), fwd = cam.getWorldDirection(new THREE.Vector3());
  const d = Math.max(.8, subj.clone().sub(cam.position).dot(fwd));
  const Z = { g: { coc: 6, k: .45 }, o: { coc: 12, k: .32 }, y: { coc: 16, k: .22 } }[sh.size || 'o'];
  Object.assign(look, { focus: d, coc: Z.coc, range: Math.max(.6, d * Z.k), nearK: 2 });
  if (sh.name === 'genel') look.fade = 1 - smoother(ramp(t, 0, 1.0));
  if (sh.name === 'baslik') { look.fade = ramp(t, DUR - .9, DUR); look.coc = 8; look.range = 3; }
  if (sh.name === 'cokus') look.flash = .3 * Math.exp(-Math.pow((t - C0 - .08) / .07, 2));
  return look;
}

function subjectPoint(s) {
  const head = st => { const J = joints(st.pose); return new THREE.Vector3(...toWorld(st, J.head)); };
  if (s === 'me') return head(W.me);
  if (s === 'kiz') return head(W.kiz);
  if (s === 'adam') return head(W.adam);
  if (s === 'meLegs') return new THREE.Vector3(W.me.mesh.position.x, .5, NZ);
  if (s === 'small') return new THREE.Vector3(...W.pk.SMALL.m.position.toArray());
  if (s === 'pinch') return new THREE.Vector3(-.64, .75, .52);
  if (s === 'top') return new THREE.Vector3(-.2, 1.7, -.1);
  if (s === 'hay') return new THREE.Vector3(-3.3, .8, .6);
  return new THREE.Vector3(0, 1, 0);
}

// ------------------------------------------------------------------ the man
function actMan(t, w) {
  const st = W.adam, K = W.pk;
  let x = 2.0, y = 0, pose = { lean: 0 }, fc = { look: .3, expr: 'neutral', blink: blink(t, 2) }, held = null;
  const walkIn = [T.L01 + .2, T.L02 + .9];
  if (t < walkIn[1]) {                                       // walks in from the right, looking at the pile
    const k = ramp(t, ...walkIn); x = lerp(5.6, 2.25, smoother(k));
    pose = { ...walk(t * 1.6, k < 1 ? 1 : 0) }; fc = { look: .5, expr: 'neutral', blink: blink(t, 2) };
  } else if (t < E.L02 + .25) {                              // eyes the pile, crouches, grips the bottom right one, pulls
    const c = smoother(ramp(t, at('L02', .55), at('L02', .75))), pull = smoother(ramp(t, E.L02 - .3, E.L02 + .2));
    x = lerp(2.25, 2.0, c);
    const drop = .8 * c * (1 - pull * .6), base = { lean: 55 * c - 20 * pull, legs: squat(drop, 6), hipY: -drop };
    pose = base; fc = { look: lerp(.5, .2, c), expr: pull > .2 ? 'angry' : 'neutral', blink: 0 };
    held = c > .9 ? 'F4' : null;
  } else if (t < T.L07) {                                    // holds it up, then sets it down by his feet
    const dn = smoother(ramp(t, at('L06', .4), at('L06', .75)));
    const drop = .7 * dn; pose = { lean: 30 * dn - 8 * (1 - dn), legs: squat(drop, 4), hipY: -drop }; held = t < at('L06', .75) ? 'F4' : null;
    fc = { look: .3, expr: 'smug', blink: blink(t, 2) };
  } else if (t < T.L09) {                                    // a glance at her leg, a shrug, "Sakin ol..."
    const sh = smoother(ramp(t, at('L07', .55), at('L07', .8))) * (1 - smoother(ramp(t, E.L08, E.L08 + .4)));
    pose = { lean: -4 * sh, arms: [[lerp(10, 62, sh), lerp(5, 95, sh)], [lerp(-8, 40, sh), lerp(-4, 100, sh)]], head: 6 };
    fc = { look: lerp(.3, .75, smoother(ramp(t, T.L07, T.L07 + .4))), expr: speaking(t, 'adam') ? (talk(t) ? 'o' : 'smug') : 'smug', blink: blink(t, 2) };
  } else if (t < T.L13) {                                    // hands on hips, studying the pile
    pose = { lean: 4, arms: [[-35, 125], [-30, 120]] }; fc = { look: .4, expr: 'neutral', blink: blink(t, 2) };
  } else if (t < T.L23) {                                    // reaches for another one, then digs at the bottom
    const c = smoother(ramp(t, T.L13 + .3, at('L13', .7))), drop = .75 * c;
    pose = { lean: 50 * c, legs: squat(drop, 6), hipY: -drop };
    fc = { look: .2, expr: speaking(t, 'adam') ? (talk(t) ? 'o' : 'angry') : 'neutral', blink: blink(t, 2) };
  } else if (t < at('L24', .1)) {                            // yanks the second one out and throws it behind him
    const y1 = at('L23', .3), y2 = at('L23', .42), c = smoother(ramp(t, y1, y2)), th = smoother(ramp(t, at('L23', .55), at('L23', .75)));
    const drop = .75 * (1 - c) + .3 * c;
    pose = { lean: lerp(50, -12, c) + 30 * th, legs: squat(drop, 6), hipY: -drop };
    fc = { look: .2, expr: 'angry', blink: 0 };
    held = t < at('L23', .7) && t > y1 ? 'B3' : null;
    x = lerp(2.0, 1.55, smoother(ramp(t, at('L23', .8), E.L23 + .3)));
  } else if (w < C0 + .2) {                                  // hugs the biggest one, braces, pulls
    const c = smoother(ramp(t, at('L24', .1), at('L24', .32))), pull = smoother(ramp(t, at('L24', .58), C0 + .05));
    x = 1.55 + .3 * pull; const drop = .9 * c - .4 * pull;
    pose = { lean: 42 * c - 30 * pull, legs: squat(Math.max(0, drop), 8), hipY: -Math.max(0, drop) };
    fc = { look: .2, expr: pull > .1 ? 'shout' : 'angry', blink: 0 };
    held = c > .8 ? 'BIG' : null;
  } else {                                                   // falls back and sits; the pile pours over him
    const f = smoother(clamp01((w - C0 - .2) / .45));
    x = lerp(1.85, 2.35, f); y = lerp(0, -.52, f);
    pose = { lean: lerp(-30, -6, f), sit: f, legs: [[lerp(0, 4, f), lerp(0, -10, f)], [lerp(0, 10, f), lerp(0, -20, f)]], arms: [[lerp(150, 40, f), 30], [lerp(-150, 30, f), 20]] };
    fc = { look: .2, expr: 'surprised', blink: 0 };
    if (w > C0 + 2.3) {
      const spit = t > T.L29 && t < at('L29', .9), shout = speaking(t, 'adam');
      fc = { look: t > T.L32 ? -.1 : .25, expr: spit ? (Math.sin(t * 14) > 0 ? 'o' : 'angry') : shout ? (talk(t) ? 'shout' : 'angry') : t > E.L33 ? 'frown' : t > T.L31 ? 'angry' : 'tired', blink: blink(t, 2) };
    }
  }
  place(st, x, y, MZ, true);
  // hands go to what he holds: the held pumpkin hangs between them
  if (held === 'F4' || held === 'B3' || held === 'BIG') {
    const k = W.pk[held], J = joints(pose), r = k.r;
    let c;
    if (held === 'BIG' && t < at('L24', .58)) c = k.home;    // he grips it where it sits
    else if (held === 'F4' && t < E.L02 - .3) c = k.home;
    else if (held === 'B3' && t < at('L23', .34)) c = k.home;
    else { const chest = toWorld(st, [J.sh[0] + .65 + r / st.hu * .6, J.sh[1] - .45]); c = [chest[0], chest[1], MZ + .25]; }
    if (held === 'F4' && t > at('L06', .4)) c = [lerp(c[0], W.F4rest[0], smoother(ramp(t, at('L06', .4), at('L06', .75)))), lerp(c[1], W.F4rest[1], smoother(ramp(t, at('L06', .4), at('L06', .75)))), W.F4rest[2]];
    k.held = c;
    pose.arms = [reach(st, pose, [c[0] - r * .75, c[1] + r * .1]), reach(st, pose, [c[0] + r * .8, c[1] + r * .2])];
  }
  if (t >= T.L13 && t < T.L23) {
    const J = joints(pose), sh = toWorld(st, J.sh), ph = t * 5.5;
    const tgt = s => [1.25 + Math.sin(ph + s) * .18, .32 + Math.max(0, Math.cos(ph + s)) * .25];
    pose.arms = t < E.L13 ? [reach(st, pose, [lerp(sh[0] - .4, 1.3, smoother(ramp(t, T.L13 + .3, E.L13))), lerp(sh[1], .35, smoother(ramp(t, T.L13 + .3, E.L13)))]), [-10, 20]]
      : [reach(st, pose, tgt(0)), reach(st, pose, tgt(Math.PI))];
  }
  st.set(pose, fc);
}

// ------------------------------------------------------------------ the narrator ("ben"): body first, arms after the sister
// The order inside a frame never reads a previous frame (stills and parts render out of order):
// pumpkin tracks -> the man -> the narrator's body -> the sister (from the narrator's body) -> the narrator's arms -> held pumpkins
const SEATY = st => HAY.y + .01 - .92 * st.hu;              // feet height of a figure sitting on a bale (SEAT = .92 head units)
function meBody(t, w) {
  const st = W.me;
  let x = NX, y = 0, flip = false, rot = 0, pose = { lean: 12 }, fc = { look: .55, expr: 'smile', blink: blink(t, 1) }, hands = 'waist';
  const shout = speaking(t, 'ben');
  if (t < T.L03) { pose = { lean: 14 }; }
  else if (t < E.L03 + .3) { fc = { look: 1, expr: 'shout', blink: 0 }; pose = { lean: 6, head: 8 }; hands = 'point'; }
  else if (t < T.L07) { fc = { look: .6, expr: 'scared', blink: blink(t, 1) }; pose = { lean: 13 }; }
  else if (t < T.L09) { fc = { look: 1, expr: 'angry', blink: blink(t, 1) }; pose = { lean: 10 }; }
  else if (t < T.L11) { fc = { look: .55, expr: shout ? (talk(t) ? 'o' : 'worried') : 'worried', blink: blink(t, 1) }; pose = { lean: 15 }; }
  else if (t < T.L13) { fc = { look: .55, expr: 'scared', blink: 0 }; pose = { lean: 15, head: Math.sin(t * 40) * .6 }; }
  else if (t < T.L14) { fc = { look: 1, expr: 'scared', blink: blink(t, 1) }; pose = { lean: 12 }; }
  else if (t < T.L15) { fc = { look: .45, expr: 'pain', blink: 0 }; pose = { lean: 22, legs: squat(.25, 8), hipY: -.25 }; hands = 'pinch'; }
  else if (t < T.L17) { const jolt = t > at('L15', .6) && t < at('L15', .85); fc = { look: .55, expr: jolt ? 'surprised' : 'scared', blink: 0 }; pose = { lean: jolt ? 4 : 14 }; }
  else if (w < C0 + .55) {                                    // shoulder under the pumpkins, the other hand digging
    const sink = smoother(ramp(t, T.L18, E.L18)) * .35 + smoother(ramp(t, T.L19, at('L19', .3))) * .15;
    const shake = t > T.L19 && w < C0 ? Math.sin(t * 46) * .05 : t > T.L18 && w < C0 ? Math.sin(t * 30) * .02 : 0;
    const drop = sink + shake;
    const up = smoother(clamp01((w - C0) / .25));
    pose = { lean: lerp(24 + sink * 8, 4, up), legs: squat(Math.max(0, drop * (1 - up)), 10), hipY: -Math.max(0, drop * (1 - up)), head: -6 };
    fc = { look: t > T.L20 && t < E.L20 + .2 ? 1 : .5, expr: shout ? (talk(t) ? 'shout' : 'pain') : w > C0 ? 'surprised' : 'pain', blink: 0 };
    hands = 'brace';
  } else if (w < C0 + 1.0) {                                   // L26: grabs her under the arms and pulls
    const back = smoother(clamp01((w - C0 - .78) / .22));
    x = NX - .35 * back; pose = { lean: lerp(20, -8, back) }; fc = { look: .5, expr: 'shout', blink: 0 }; hands = 'armpits';
  } else if (w < C0 + 1.75) {                                  // turns and dives onto the bales with her
    const k = clamp01((w - C0 - 1.0) / .75), e = smoother(k);
    flip = true; x = lerp(NX - .35, -3.05, e); y = .5 * Math.sin(k * Math.PI) + lerp(0, HAY.y + .02, e);
    rot = lerp(0, 1.42, smoother(clamp01(k * 1.4)));
    pose = { lean: 0, legs: [[-20 * e, 30], [-40 * e, 40]] }; fc = { look: .4, expr: 'shout', blink: 0 }; hands = 'armpits';
  } else {
    const up = smoother(ramp(t, E.L26 + 1.4, E.L26 + 2.3));  // lying on the bales, then sits up
    if (up < 1) {
      flip = up < .5; x = lerp(-3.05, SEAT_ME, up); y = lerp(HAY.y + .02, SEATY(st), up);
      rot = flip ? lerp(1.42, 0, up) : 0; pose = { lean: 0, sit: up, arms: [[110 * (1 - up) + 20, 30], [90 * (1 - up), 40]], legs: [[0, 0], [-10 * (1 - up), 20]] };
      fc = { look: .3, expr: t < E.L26 + .9 ? 'pain' : 'tired', blink: 0 }; hands = 'set';
    } else {
      x = SEAT_ME; y = SEATY(st);
      pose = { sit: 1, lean: 4, legs: [[0, 0], [6, -4]] }; hands = 'hug';
      fc = { look: .45, expr: 'cry', blink: 0, t };
      if (t > T.L28 - .2) { fc = { look: 1, expr: t < T.L29 ? 'o' : 'smile', blink: blink(t, 1) }; hands = 'free'; }
      if (t > T.L31 - .1 && t < at('L31', .9)) { hands = 'small'; fc = { look: .1, expr: 'smile', blink: blink(t, 1) }; pose.lean = -6 + 18 * Math.sin(Math.PI * ramp(t, T.L31, at('L31', .9))); }
      if (t > T.L32) { fc = { look: t < at('L32', .45) ? .35 : 1, expr: 'smile', blink: blink(t, 1) }; hands = 'free'; }
      if (t > T.L33 - .1) fc = { look: 1, expr: speaking(t, 'ben') ? (talk(t) ? 'o' : 'smug') : 'smug', blink: blink(t, 1) };
    }
  }
  place(st, x, y, NZ, flip, rot);
  st.pose = { ...pose, arms: null };
  return { pose, fc, hands };
}
function meArms(t, w, b) {
  const st = W.me, kz = W.kiz, K = W.pk, { pose, fc, hands } = b;
  const kj = joints(kz.pose), waist = toWorld(kz, [kj.hip[0], kj.hip[1] + .55]);
  if (hands === 'waist') pose.arms = [reach(st, pose, [waist[0] + .07, waist[1] + .02]), reach(st, pose, [waist[0] - .06, waist[1] - .02])];
  else if (hands === 'point') pose.arms = [[115, -10], reach(st, pose, [waist[0] - .06, waist[1]])];
  else if (hands === 'pinch') { const a = K.PA.pos, bb = K.PB.pos, s = Math.sin(t * 24) * .015;
    pose.arms = [reach(st, pose, [bb[0] - .2 + s, bb[1] + .02]), reach(st, pose, [a[0] + .18 - s, a[1] + .04])]; }
  else if (hands === 'brace') { const p = K.F14.pos, dg = t * 6, dig = w < C0 ? 1 : 0;
    pose.arms = [reach(st, pose, [-.66 + Math.sin(dg) * .1 * dig, .72 + Math.abs(Math.cos(dg)) * .08 * dig]), reach(st, pose, [p[0] - .12, p[1] - .1])]; }
  else if (hands === 'armpits') { const ap = toWorld(kz, [kj.sh[0], kj.sh[1] - .32]);
    pose.arms = [reach(st, pose, [ap[0] + .05 * sgn(st), ap[1]]), reach(st, pose, [ap[0] - .05 * sgn(st), ap[1] - .03])]; }
  else if (hands === 'hug') { const sp = toWorld(kz, kj.sh); pose.arms = [reach(st, pose, [sp[0] + .03, sp[1] + .02]), [10, 40]]; }
  else if (hands === 'small') { const p = K.SMALL.pos; pose.arms = [reach(st, pose, [p[0], p[1] + .04]), [-10, 30]]; }
  else if (hands === 'free') pose.arms = [[14, 20], [-6, 14]];
  st.set(pose, fc);
}

// ------------------------------------------------------------------ the sister
function placeByHip(st, hip, z, flip, rot, pose) {         // put the figure so that its hip lands on `hip`
  const J = joints(pose), s = flip ? -1 : 1, c = Math.cos(rot), sn = Math.sin(rot), hx = s * J.hip[0] * st.hu, hy = J.hip[1] * st.hu;
  place(st, hip[0] - (hx * c - hy * sn), hip[1] - (hx * sn + hy * c), z, flip, rot);
}
function actKiz(t, w) {
  const st = W.kiz, me = W.me, K = W.pk;
  let hip = S1.slice(), flip = true, rot = 0, z = KZ, pose = { sit: 1, lean: 4, legs: [[-6, 22], [4, 14]] }, fc = { look: .5, expr: 'smile', blink: blink(t, 3) };
  let arms = 'small', seated = false;
  const down = smoother(ramp(t, .6, at('L02', .3))), pinch = at('L04', .55);
  if (t < pinch) { hip = [lerp(S0[0], S1[0], down), lerp(S0[1], S1[1], down)]; fc = { look: .55, expr: t > T.L04 ? 'surprised' : 'happy', blink: blink(t, 3) }; }
  else if (t < T.L06) { fc = { look: .3, expr: 'pain', blink: 0 }; pose.lean = -6; }
  else if (t < T.L09) { const dropped = w > W.smallDrop; fc = { look: dropped ? .2 : .4, expr: dropped ? 'scared' : 'pain', blink: 0 }; arms = dropped ? 'reach' : 'small'; }
  else if (w < C0 + .55) { const jolt = t > at('L15', .6) && t < at('L15', .9);
    fc = { look: .45, expr: jolt ? 'surprised' : t > T.L23 ? 'scared' : 'worried', blink: blink(t, 3) }; arms = 'hold'; }
  else if (w < C0 + 1.75) {                                  // pulled out and carried against the narrator's chest
    const mj = joints(me.pose), chest = toWorld(me, [mj.sh[0] + .55, mj.sh[1] - .55]);
    const lift = smoother(clamp01((w - C0 - .62) / .3));
    hip = [lerp(S1[0], chest[0], lift), lerp(S1[1], chest[1] - .05, lift)];
    if (w > C0 + 1.0) { rot = me.mesh.rotation.z * .85; z = NZ + .06; }
    pose = { sit: lerp(1, .25, lift), lean: 0, legs: [[lerp(-6, 25, lift), 20], [lerp(4, -5, lift), 30]] };
    fc = { look: .4, expr: 'scared', blink: 0 }; arms = 'up';
  } else {
    const up = smoother(ramp(t, E.L26 + 1.4, E.L26 + 2.3));
    if (up < 1) { hip = [lerp(-3.55, SEAT_KIZ, up), lerp(HAY.y + .12, HAY.y + .08 * st.hu, up)]; rot = lerp(1.2, 0, up); z = NZ + .06; pose = { sit: up, lean: 0 }; fc = { look: .3, expr: 'scared', blink: 0 }; arms = 'free'; }
    else {
      seated = true; z = NZ + .06;
      pose = { sit: 1, lean: -3, legs: [[2, 0], [8, -6]] };
      fc = { look: .55, expr: t < T.L28 ? 'happy' : t < T.L31 ? 'o' : 'happy', blink: blink(t, 3) };
      arms = t > at('L31', .8) ? 'lap' : 'free';
      if (t > T.L28 - .2 && t < T.L31) fc.look = -.8;          // looks back at the buried man
      if (t > T.L33 - .1) fc = { look: -.5, expr: 'grin', blink: blink(t, 3) };
    }
  }
  if (seated) place(st, SEAT_KIZ, SEATY(st), z, true, 0); else placeByHip(st, hip, z, flip, rot, pose);
  st.pose = { ...pose, arms: null };
  const J0 = joints(pose), sm = K.SMALL;
  if (arms === 'small') { const c = toWorld(st, [J0.sh[0] + .55, J0.sh[1] - .55]); sm.held = [c[0], c[1], z + .12];
    pose.arms = [reach(st, pose, [c[0] - .1, c[1] + .03]), reach(st, pose, [c[0] + .08, c[1] + .05])]; }
  else if (arms === 'reach') pose.arms = [[70, 10], [55, 20]];
  else if (arms === 'hold') { const mj = joints(me.pose), a = toWorld(me, mj.sh); pose.arms = [reach(st, pose, [a[0] + .12, a[1] - .1]), reach(st, pose, [a[0] + .2, a[1] - .15])]; }
  else if (arms === 'up') pose.arms = [[150, 20], [140, 30]];
  else if (arms === 'lap') { const p = lapPoint(); pose.arms = [reach(st, pose, [p[0] - .09, p[1] + .02]), reach(st, pose, [p[0] + .1, p[1] + .03])]; }
  else pose.arms = [[20, 30], [-10, 20]];
  st.set(pose, fc);
}

function actExtras(t) {
  // a mother bending over the field with her child; a man pushing a barrow slowly along the fence
  const b = .5 + .5 * Math.sin(t * .6);
  place(W.ex1, -6.1, 0, -7.6, true); W.ex1.set({ lean: 30 * b, legs: squat(.3 * b), hipY: -.3 * b, arms: [[40 + 30 * b, 20], [30 + 30 * b, 10]] }, { look: .2, expr: 'smile' });
  place(W.ex2, -6.9, 0, -7.3, false); W.ex2.set({ lean: 4, arms: [[60 + Math.sin(t * 3) * 30, 20], [-10, 10]] }, { look: .4, expr: 'happy' });
  const x3 = 9 - ((t * .45) % 22);
  place(W.ex3, x3, 0, -8.6, true); W.ex3.set({ ...walk(t * 1.1, .8) }, { look: .3, expr: 'smile' });
}

// ------------------------------------------------------------------ pumpkins
// 1. tracks (no people involved): k.pos, k.roll
function pumpkinTracks(t, w) {
  const wobble = id => {
    if (!['F10', 'F11', 'F14', 'B7', 'B8', 'B9', 'F9', 'PB'].includes(id) || w >= C0) return 0;
    const a = smoother(ramp(t, T.L11, at('L11', .6))) * .05 + smoother(ramp(t, T.L23, at('L23', .45))) * .1 * (1 - smoother(ramp(t, at('L23', .7), E.L23 + .5)));
    return Math.sin(t * 9 + id.length * 2.1 + id.charCodeAt(1)) * a;
  };
  for (const [id, k] of Object.entries(W.pk)) { const r = k.tr.at(w); k.pos = r.p; k.roll = r.roll + wobble(id); k.held = null; }
  const K = W.pk;
  if (t > at('L06', .75)) K.F4.pos = W.F4rest;
  if (t > at('L23', .7)) { const u = clamp01((t - at('L23', .7)) / .6); K.B3.pos = [lerp(1.7, 3.6, u), lerp(1.1, .24, u) + 2 * u * (1 - u), lerp(.8, -.4, u)]; K.B3.roll = -u * 6; }
}
// 2. after the people: what they hold, the big one's flight, the small one's way to her lap; then face the camera
function pumpkinsPlace(t, w, cam) {
  const K = W.pk;
  for (const k of Object.values(K)) if (k.held) { k.pos = k.held; k.roll = 0; }
  if (w > C0 + .2) {                                          // flies up out of his arms and lands on his head
    const k = K.BIG, J = joints(W.adam.pose), hp = toWorld(W.adam, [J.head[0], J.head[1] + .5]);
    const top = [hp[0], hp[1] + k.r * RV - .03, MZ + .12], from = [1.95, .9, MZ + .25];
    const u = clamp01((w - C0 - .2) / 1.9);
    k.pos = [lerp(from[0], top[0], u), from[1] + (top[1] - from[1]) * u + 2.1 * 4 * u * (1 - u), lerp(from[2], top[2], u)];
    k.roll = u < 1 ? -u * 9.5 : -9.5 + Math.sin(t * 2) * .04;
  }
  if (t > at('L31', .2)) {                                    // pulled out of the hay and put on her lap
    const u = smoother(ramp(t, at('L31', .35), at('L31', .82))), lap = lapPoint();
    K.SMALL.pos = [lerp(GAP[0], lap[0], u), lerp(GAP[1], lap[1], u) + .35 * 4 * u * (1 - u), lerp(GAP[2], lap[2], u)]; K.SMALL.roll = 0;
  }
  for (const k of Object.values(K)) {
    const m = k.m; m.position.set(k.pos[0], k.pos[1] + k.r * 2.38 * .04, k.pos[2]);
    m.quaternion.copy(cam.quaternion); m.rotateZ(k.roll);
  }
}
function lapPoint() { const st = W.kiz, J = joints({ sit: 1, lean: -3 }), p = toWorld(st, [J.hip[0] + .5, J.hip[1] + .3]); return [p[0], p[1], st.mesh.position.z + .1]; }

function particles(t, w) {
  const P0 = W.dust0, p = W.dust.geometry.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) { p[i] = P0[i] + Math.sin(t * .3 + i) * .5 + t * .05; p[i + 1] = P0[i + 1] + Math.sin(t * .23 + i * .7) * .3; }
  W.dust.geometry.attributes.position.needsUpdate = true;
  const s = W.straw.geometry.attributes.position.array, u = w - C0 - .05;
  W.straw.visible = u > 0 && u < 3.2;
  W.burst.forEach((b, i) => { const tt = Math.max(0, u - b.d); s[i * 3] = b.x + b.vx * tt; s[i * 3 + 1] = Math.max(.02, .3 + b.vy * tt - 4.9 * tt * tt * .6); s[i * 3 + 2] = b.z; });
  W.straw.geometry.attributes.position.needsUpdate = true;
  W.straw.material.opacity = .9 * (1 - clamp01((u - 2.2) / 1));
  // the dirt he spits (L29)
  const sp = W.spit.userData.paint, g = sp.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, sp.w, sp.h);
  const k = (t - at('L29', .3)) / .6;
  W.spit.visible = k > 0 && k < 1;
  if (W.spit.visible) {
    const J = joints(W.adam.pose), m = toWorld(W.adam, mouthOf(J, .25)); W.spit.position.set(m[0] - .25, m[1] - .05, MZ + .2);
    const R = rng(3); g.fillStyle = '#5a3a2a';
    for (let i = 0; i < 14; i++) { const v = .4 + R(); g.beginPath(); g.arc(sp.w * (1 - k * v * .9), sp.h * (.4 + (R() - .5) * .3 + k * k * .4), sp.w * .012 * (1 + R()), 0, 7); g.fill(); }
  }
  sp.tex.needsUpdate = true;
}
const blink = (t, seed) => { const p = 2.6 + (seed % 3) * .7, x = (t + seed * .37) % p; return x < .12 ? 1 - Math.abs(x - .06) / .06 : 0; };

// ------------------------------------------------------------------ sound cues
function cuesFor() {
  const c = [];
  c.push({ t: E.L02 - .05, s: 'pull' }, { t: E.L02 + .4, s: 'thump' });
  c.push({ t: at('L04', .62), s: 'thump' }, { t: at('L04', .7), s: 'thump' });
  c.push({ t: wtInv(W.smallDrop + .35), s: 'thump', g: .5 }, { t: wtInv(W.smallDrop + 1.6), s: 'straw' });
  c.push({ t: at('L06', .75), s: 'thump' });
  c.push({ t: T.L11, s: 'creak' }, { t: at('L15', .62), s: 'thump' }, { t: at('L17', .4), s: 'straw' });
  c.push({ t: at('L23', .4), s: 'pull' }, { t: at('L23', .55), s: 'creak' }, { t: at('L23', 1.0), s: 'thump' });
  c.push({ t: at('L24', .6), s: 'pull' }, { t: C0, s: 'rumble' }, { t: E.L26 + .2, s: 'crash' });
  c.push({ t: at('L29', .3), s: 'spit' });
  for (const s of SH.slice(1)) c.push({ t: s.t, s: 'cut', g: .5 });
  // score marks: mix.py builds the music section by section from these
  const mk = (t, n) => c.push({ t, s: 'm', n });
  mk(0, 'giris'); mk(at('L04', .55), 'sikisma'); mk(T.L11, 'gerilim'); mk(T.L17, 'tirmanis'); mk(T.L23, 'kopus'); mk(C0, 'cokus');
  mk(E.L26 + .15, 'carpma'); mk(T.L27 - .6, 'rahat'); mk(T.L28, 'komik'); mk(T.L31, 'sicak'); mk(E.L33 + .15, 'final');
  mk(SH.find(s => s.name === 'baslik').t + .4, 'baslik'); mk(DUR, 'son');
  return c;
}
const wtInv = w => { let lo = 0, hi = DUR; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (wt(m) < w) lo = m; else hi = m; } return lo; };

// ------------------------------------------------------------------ 2D overlay: captions, title
const glowText = (g, txt, x, y, size, col = '#ffb45a', blur = 26, weight = 900, a = 1) => {
  g.save(); g.globalAlpha = a; g.font = `${weight} ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.shadowColor = col; g.shadowBlur = blur; g.fillStyle = col; g.lineJoin = 'round'; g.lineWidth = size * .07; g.strokeStyle = col;
  g.strokeText(txt, x, y); g.fillText(txt, x, y); g.shadowBlur = 0; g.fillStyle = mix(col, '#ffffff', .3); g.fillText(txt, x, y); g.restore();
};
const SUBC = { anlatici: '#f4ecdf', ben: '#9fe3d0', kiz: '#ffbfd4', adam: '#ffb889' };
function wrap(g, text, maxW) {
  const out = []; let line = '';
  for (const wd of text.split(' ')) { const tst = line ? line + ' ' + wd : wd; if (g.measureText(tst).width > maxW && line) { out.push(line); line = wd; } else line = tst; }
  if (line) out.push(line); return out;
}
export function overlay(g, t, ctx, look) {
  const kT = look?.tight ?? 0, bar = BARS.rest + (BARS.tight - BARS.rest) * kT;
  if (SUBS) {
    const cur = SATIR.find(([id]) => t >= T[id] - .05 && t < E[id] + .25);
    if (cur) {
      const [id, who, text] = cur, a = clamp01((t - T[id] + .05) / .12) * (1 - clamp01((t - E[id] - .1) / .15));
      const txt = who === 'anlatici' ? text : `“${text}”`;
      g.save(); g.globalAlpha = a; g.font = `600 40px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      const L = wrap(g, txt, 1360), y0 = 1080 - bar - 46 - (L.length - 1) * 50;
      L.forEach((ln, i) => {
        g.lineJoin = 'round'; g.lineWidth = 8; g.strokeStyle = 'rgba(10,8,20,.85)'; g.strokeText(ln, 960, y0 + i * 50);
        g.fillStyle = tightColor(SUBC[who], kT); g.fillText(ln, 960, y0 + i * 50);
      });
      g.restore();
    }
  }
  // the title over the wide shot at the end
  if (SH[shotAt(t)].name === 'baslik') {
    const t0 = E.L33 + 2.0, a = smoother(ramp(t, t0, t0 + .8)) * (1 - ramp(t, DUR - .7, DUR - .1));
    if (a > 0) {
      const sp = 1 - smoother(ramp(t, t0, t0 + 1.2));
      g.save(); g.globalAlpha = a; g.letterSpacing = `${6 + sp * 18}px`;
      glowText(g, 'ALT TARAFI', 960, 250, 66, '#f6e7cf', 16);
      g.letterSpacing = `${4 + sp * 14}px`;
      glowText(g, 'BALKABAĞI', 960, 385, 140, '#ffa646', 38);
      g.globalAlpha = a * .8; g.fillStyle = '#f6e7cf'; g.fillRect(960 - 330 * a, 425, 660 * a, 3);
      g.letterSpacing = '8px'; g.font = `700 30px ${FONT}`; g.textAlign = 'center'; g.fillText('BİR ÇÖP ADAM HİKÂYESİ', 960, 475);
      g.restore();
    }
  }
}
