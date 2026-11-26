// Disiplin : a 30-second discipline film in the silhouette style (16:9, 24 fps), with a male narrator.
// 05:00, the city asleep in the rain; one window lights up. He doesn't want to, he gets up anyway. The tight bars close on
// "kalkıyorsun" and stay closed while discipline is at work: a run through the empty wet street, push-ups, a book at the
// desk while the window turns to dawn. The number card: 1 % better every day, 1.01^365 = 37.8. Then the rooftop at
// sunrise, the rain gone: "Motivasyon gelir, gider. Ama disiplin kalır." Title: MOTİVASYON BİTER. / DİSİPLİN KALIR.
// The same grammar as the reference hook: the power at work -> the number contrast -> the title (analiz/script.md).
import * as THREE from 'three';
import { card, lerp, clamp01, smoother, ramp, rng, mix } from '/engine/src/layer.js';
import { Stick, joints, armTo, mouthOf } from '/engine/src/stick.js';
import { CamPath } from '/engine/src/camera.js';
import { BARS, tightAt, barCues, tightColor } from '/engine/src/bars.js';
import * as P from '/stories/uykusuz/paint.js';
import * as Rm from '/stories/uykusuz/room.js';
import { drawHeld, readPose } from '/stories/uykusuz/props.js';
import * as S from './set.js';

export const NAME = 'disiplin'; export const FPS = 24; export const DUR = 30;
const FONT = 'Inter';
// voice lines: [id, start s] (voice/satir/*.wav, lengths in voice/sureler.json, words timed with Whisper)
//   "beşi" 1.5 · "kalkıyorsun" 7.1 · "Otuz yedi" 19.83 · "disiplin" 24.05 · "bugün" 28.24
export const LINES = [['L01', .5], ['L02', 4.75], ['L03', 6.65], ['L04', 8.5], ['L05', 10.1], ['L06', 11.55],
  ['L07', 14.7], ['L08', 18.1], ['L09', 19.75], ['L10', 21.5], ['L11', 23.75], ['L12', 26.9]];
// shots: [start, name]
const SH = [[0, 'sehir'], [2.4, 'pencere'], [4.6, 'yatak'], [6.6, 'kalk'], [8.4, 'kosu'], [10.0, 'yagmur'], [11.3, 'sinav'], [12.8, 'masa'],
  [14.4, 'kart'], [18.0, 'kart2'], [21.3, 'cati'], [23.6, 'cati2'], [25.6, 'baslik']];
const EXT = ['sehir', 'pencere', 'kosu', 'yagmur'], ROOM = ['yatak', 'kalk', 'sinav', 'masa'], CARD = ['kart', 'kart2'], ROOF = ['cati', 'cati2', 'baslik'];
// tight bars: discipline at work. They close on "kalkıyorsun" inside the shot and stay closed over the run, the push-ups
// and the desk; they open as the window turns to dawn. 6.45 s of 30 (21.5 %; the reference hooks spend 0-22 %).
const TIGHT = [[7.1, 13.55]];
const HIT = 19.83, LIGHT_ON = 3.9, TAP = 5.0, STAND = [7.1, 7.75], TITLE = 25.95, NOW = 28.24;
export const CUES = [];
const shotAt = t => { let i = 0; while (i + 1 < SH.length && SH[i + 1][0] <= t) i++; return i; };

const W = {};
const D2R = Math.PI / 180;
const NIGHT_EXT = new THREE.Color('#7a7fa8'), NIGHT_IN = new THREE.Color('#5f6796'), LAMP_IN = new THREE.Color('#8a84ac'), DAWN_IN = new THREE.Color('#ffd2a8'), DAWN_EXT = new THREE.Color('#e6b9a0');
const tintGroup = (grp, col) => grp.traverse(o => { if (o.isMesh && !o.userData.keep && o.material.color) o.material.color.copy(col); });
const keep = m => { m.userData.keep = true; return m; };
const rotp = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const blinkAt = (t, seed) => { const p = 2.6 + (seed % 3) * .7, x = (t + seed * .37) % p; return x < .12 ? 1 - Math.abs(x - .06) / .06 : 0; };

// ------------------------------------------------------------------ places (metres)
const RUN_V = 4.2, RUN_Z = -6.5, RX = t => -10 + RUN_V * (t - 8.4);       // the runner on the sidewalk
const LAMPS = [-42, -30, -18, -6, 6, 18, 30], LAMP_Z = -3.6;
const HU = 1.72 / 4.45;                                                    // one head unit of the hero, in metres
const BEDX = -3.1, BEDZ = -3.05, HIPX = -2.2, ME_Z = -2.92;                // the bed (centre), where he sits on its foot end
const STAND_X = -1.9;
const NS = { x: -1.55, z: -3.12 }, PHONE = [-1.6, .6, -3.0];               // nightstand, the phone on its stand
const PU = { x: -.55, z: -1.0 };                                            // push-ups: where the toes are
const ME = { x: -.62, z: -2.15 };                                           // at the desk (the uykusuz room layout)
const ROOFP = [0, 0, .6];                                                   // the hero on the roof
const SUN = [100, 0, -160];

export async function setup(ctx) {
  const { scene } = ctx;
  for (const f of [`900 64px ${FONT}`, `700 64px ${FONT}`, `600 40px ${FONT}`]) await document.fonts.load(f);
  const a = (x, y, z) => [x, y, z], b = (x, y, z) => [x + 1000, y, z], c = (x, y, z) => [x + 2000, y, z], d = (x, y, z) => [x + 3000, y, z];

  // ---------------------------------------------------------------- SET A: the street, 05:00, rain
  const A = new THREE.Group(); scene.add(A); W.A = A;
  W.sky = keep(card(A, 340, 150, (g, w, h) => P.sky(g, w, h, 'night'), { pos: [0, 50, -150], px: 9, order: 0 }));
  W.moon = keep(card(A, 7, 7, (g, w, h) => P.disc(g, w, h, '#f4ecd8'), { pos: [9, 64, -100], px: 30, order: 2 })); W.moon.material.color.setScalar(.82);
  W.moonG = keep(card(A, 40, 40, (g, w, h) => P.glow(g, w, h, '200,205,255', .08), { pos: [9, 64, -99.9], px: 7, add: true, order: 3, opacity: .5 }));
  card(A, 300, 40, (g, w, h) => P.skyline(g, w, h, { seed: 2, col: '#2b2650', lit: .006, minH: .3, maxH: .95 }), { pos: [0, 45, -90], px: 9, order: 5 });
  card(A, 200, 30, (g, w, h) => P.skyline(g, w, h, { seed: 7, col: '#1f1a3d', lit: .008, minH: .35, maxH: 1, bw: [.04, .1] }), { pos: [0, 25, -45], px: 12, order: 5 });
  // three facades side by side, the low middle one ours (uykusuz paint.js), two taller neighbours and two more beyond
  W.fac = card(A, P.FAC.W, P.FAC.H, P.facade, { pos: [0, P.FAC.H / 2, -12], px: 100, order: 8 });
  for (const [x, wm, hm, z, seed, base] of [[-19, 22, 37, -12.4, 3, '#47425c'], [19, 22, 34, -12.4, 5, '#4d4660'], [-41, 22, 40, -12.8, 8, '#433e58'], [41, 22, 36, -12.8, 9, '#4a4460']])
    card(A, wm, hm, (g, w, h) => S.blok(g, w, h, { Wm: wm, seed, base, rows: Math.round((hm - 6) / 3.1), cols: 6, lit: 0 }), { pos: [x, hm / 2, z], px: x * x > 900 ? 30 : 60, order: 7 });
  // our window: dark, then the light comes on at 05:00 (a warm room, his silhouette sitting up on the bed)
  const wx = P.FAC.X[3], wy = P.FAC.Y[3];
  W.win = keep(card(A, P.FAC.ww, P.FAC.wh, winLight, { pos: [wx, wy, -11.96], px: 220, order: 9, opacity: 0 }));
  W.winG = keep(card(A, 6, 6, (g, w, h) => P.glow(g, w, h, '255,196,120', .1), { pos: [wx, wy, -11.9], px: 30, add: true, order: 10, opacity: 0 }));
  // the street: wet road, sidewalk, lamp posts with light falling through the rain, trees, bollards near the lens
  W.ground = card(A, 160, 40, (g, w, h) => S.wetStreet(g, w, h, { Wm: 160, Dm: 40, walk: 9, road: 13, lampX: LAMPS }), { pos: [0, 0, 8], rot: [-Math.PI / 2, 0, 0], px: 20, order: 3 });
  for (const x of LAMPS) {
    card(A, 1.8, 6, P.lampPost, { pos: [x, 3, LAMP_Z], px: 90, order: 12 });
    const hx = x + .63;
    keep(card(A, 3.2, 3.2, (g, w, h) => P.glow(g, w, h, '255,210,150', .14), { pos: [hx, 5.62, LAMP_Z + .05], px: 40, add: true, order: 13, opacity: .9 }));
    keep(card(A, 3.4, 5.6, lampCone, { pos: [hx, 2.85, LAMP_Z + .02], px: 40, add: true, order: 13, opacity: .32 }));
    keep(card(A, 6, 4, (g, w, h) => P.glow(g, w, h, '255,186,110', .06), { pos: [hx, .03, LAMP_Z - .4], rot: [-Math.PI / 2, 0, 0], px: 24, add: true, order: 4, opacity: .7 }));
    keep(card(A, 10, 8, (g, w, h) => P.glow(g, w, h, '255,186,120', .04), { pos: [hx, 5, -11.85], px: 14, add: true, order: 11, opacity: .22 }));
  }
  for (const [x, s] of [[-12, 3], [12, 5], [24, 8], [-36, 9]]) card(A, 5, 7, (g, w, h) => P.tree(g, w, h, s), { pos: [x, 3.5, LAMP_Z - .3], px: 60, order: 12 });
  for (let x = -40; x <= 20; x += 5) card(A, .32, 1.0, S.bollard, { pos: [x, .5, 2.6], px: 200, order: 20 });
  // rain: streaks in a box that wraps around the camera (they stay put in the world while it tracks the runner)
  { const n = 2400, R = rng(31); W.rain0 = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { W.rain0[i * 4] = R() * 30; W.rain0[i * 4 + 1] = R() * 24; W.rain0[i * 4 + 2] = R() * 32; W.rain0[i * 4 + 3] = .75 + R() * .5; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3));
    W.rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#c9d3ff', transparent: true, opacity: .3, depthWrite: false, blending: THREE.AdditiveBlending }));
    W.rain.renderOrder = 40; W.rain.frustumCulled = false; scene.add(W.rain); }
  W.runner = new Stick(A, { order: 14, height: 1.74, hood: '#d8553a', hoodDark: '#9c3826', hat: 'beanie', hatColor: '#2f3550', rim: '#ffd29a', rimDir: [1, -.35], rimW: .06, px: 300, extra: sweat('runner') });

  // ---------------------------------------------------------------- SET B: the bedroom (x = 1000)
  const B = new THREE.Group(); B.position.set(1000, 0, 0); scene.add(B); W.B = B;
  W.rSkyN = keep(card(B, 60, 30, (g, w, h) => P.sky(g, w, h, 'night'), { pos: [3, 8, -40], px: 12, order: 0 }));
  W.rSkyD = keep(card(B, 60, 30, (g, w, h) => P.sky(g, w, h, 'dawn'), { pos: [3, 8, -39.9], px: 12, order: 1, opacity: 0 }));
  W.rMoon = keep(card(B, 2.2, 2.2, (g, w, h) => P.disc(g, w, h, '#f4ecd8'), { pos: [4.5, 9, -39.5], px: 60, order: 2 }));
  card(B, 70, 14, (g, w, h) => P.skyline(g, w, h, { seed: 31, col: '#241e44', lit: .03, minH: .3, maxH: 1, bw: [.04, .09] }), { pos: [3, 2.5, -30], px: 14, order: 2 });
  W.wall = card(B, Rm.ROOM.W, Rm.ROOM.H, Rm.wall, { pos: [0, Rm.ROOM.H / 2, -4], px: 160, order: 5 });
  W.floor = card(B, 12, 8, Rm.floor, { pos: [0, 0, 0], rot: [-Math.PI / 2, 0, 0], px: 100, order: 4 });
  W.door = card(B, 1.2, 2.3, Rm.door, { pos: [-4.8, 1.15, -3.97], px: 120, order: 6 });
  W.clock = card(B, .7, .7, null, { pos: [-.9, 3.55, -3.97], px: 400, order: 7 }); W.clockKey = -1;
  W.bed = card(B, S.BED.Wm, 1.1, S.bed, { pos: [BEDX, .55, BEDZ], px: 300, order: 8 });
  W.ns = card(B, .5, .55, S.nightstand, { pos: [NS.x, .275, NS.z], px: 400, order: 9 });
  W.phone = card(B, .1, .17, S.phone, { pos: PHONE, px: 1400, order: 10 }); W.phoneKey = '';
  W.phoneG = keep(card(B, 2.6, 2.6, (g, w, h) => P.glow(g, w, h, '170,190,255', .1), { pos: [PHONE[0], PHONE[1] + .05, PHONE[2] + .05], px: 50, add: true, order: 11, opacity: 0 }));
  W.chair = card(B, Rm.CHAIR.w, Rm.CHAIR.h, Rm.chair, { pos: [ME.x - Rm.CHAIR.hip + Rm.CHAIR.w / 2, Rm.CHAIR.h / 2, ME.z - .03], px: 420, order: 8 });
  W.desk = card(B, 2.6, 1.0, Rm.desk, { pos: [1.15, .5, -2.3], px: 300, order: 12 });
  W.deskTop = card(B, 2.6, .62, Rm.deskTop, { pos: [1.15, .8, -2.61], rot: [-Math.PI / 2, 0, 0], px: 300, order: 12 });
  W.lamp = card(B, .55, .75, Rm.lamp, { pos: [2.05, 1.172, -2.7], px: 500, order: 13 });
  W.lampGlow = keep(card(B, 5, 5, (g, w, h) => P.glow(g, w, h, '255,200,130', .1), { pos: [1.92, 1.2, -2.66], px: 60, add: true, order: 14, opacity: 0 }));
  W.lampPool = keep(card(B, 9, 5.5, (g, w, h) => P.glow(g, w, h, '255,176,100', .05), { pos: [1.9, 1.5, -3.95], px: 40, add: true, order: 6, opacity: 0 }));
  W.stack = card(B, .5, .3, (g, w, h) => { let y = h; for (let i = 0; i < 3; i++) { const bh = h * .3; y -= bh; Rm.book(g, w * (.8 - i * .08), bh, Rm.BOOKC[i * 3 % 10], i); g.translate(w * .03, 0); } }, { pos: [.3, .95, -2.55], px: 500, order: 13 });
  W.moonShaft = keep(card(B, 3.2, 3.6, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(170,190,255,0)'); gr.addColorStop(1, 'rgba(170,190,255,.5)'); g.fillStyle = gr; g.beginPath(); g.moveTo(w * .3, 0); g.lineTo(w * .7, 0); g.lineTo(w, h); g.lineTo(0, h); g.fill(); }, { pos: [2.5, .02, -1.9], rot: [-Math.PI / 2, 0, 0], px: 60, add: true, order: 5, opacity: .3 }));
  W.sunShaft = keep(card(B, 4.5, 6, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,190,120,0)'); gr.addColorStop(1, 'rgba(255,190,120,.6)'); g.fillStyle = gr; g.beginPath(); g.moveTo(w * .35, 0); g.lineTo(w * .65, 0); g.lineTo(w, h); g.lineTo(w * .1, h); g.fill(); }, { pos: [1.6, .03, -1.0], rot: [-Math.PI / 2, 0, -.35], px: 50, add: true, order: 5, opacity: 0 }));
  W.held = null; W.sweatK = 0; W.sweatPhi = 0;
  W.me = new Stick(B, { order: 15, height: 1.72, hood: '#d8553a', hoodDark: '#9c3826', rim: '#bccdff', rimDir: [1, -.35], px: 320, extra: (g, J, tx, ty, px, sil, when) => { drawHeld(W.held, g, J, tx, ty, px, sil, when); sweat('me')(g, J, tx, ty, px, sil, when); } });
  { const n = 90, pos = new Float32Array(n * 3), R5 = rng(9); for (let i = 0; i < n; i++) { pos[i * 3] = (R5() - .5) * 10; pos[i * 3 + 1] = R5() * 4.5; pos[i * 3 + 2] = -3.5 + R5() * 5; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    W.rdust = keep(new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffe8cc', size: .022, transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending })));
    W.rdust.renderOrder = 30; B.add(W.rdust); W.rdust0 = pos.slice(); }

  // ---------------------------------------------------------------- SET C: the 1 % card (x = 2000)
  const C = new THREE.Group(); C.position.set(2000, 0, 0); scene.add(C); W.C = C;
  card(C, 40, 22, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h * .55, 0, w / 2, h * .55, w * .6); gr.addColorStop(0, '#2a3460'); gr.addColorStop(.55, '#151b38'); gr.addColorStop(1, '#070a18'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, { pos: [0, 0, -12], px: 50, order: 0 });
  W.lines = card(C, 44, 24, null, { pos: [0, 0, -11], px: 45, order: 1, noDepth: true });
  W.chart = card(C, 22, 10.5, null, { pos: [0, -.4, -8], px: 90, order: 2 });
  W.mini = new Stick(C, { order: 5, height: 1.5, hood: '#d8553a', hoodDark: '#9c3826', rim: '#ffd29a', px: 130 });

  // ---------------------------------------------------------------- SET D: the rooftop at sunrise (x = 3000)
  const Dg = new THREE.Group(); Dg.position.set(3000, 0, 0); scene.add(Dg); W.D = Dg;
  W.dSky = keep(card(Dg, 420, 160, (g, w, h) => P.sky(g, w, h, 'dawn'), { pos: [0, 60, -200], px: 7, order: 0 }));
  W.sun = keep(card(Dg, 40, 40, (g, w, h) => P.glow(g, w, h, '255,226,180', .2), { pos: SUN, px: 12, add: true, order: 2 })); W.sun.material.color.setScalar(1.5);
  W.sunD = keep(card(Dg, 7, 7, (g, w, h) => P.disc(g, w, h, '#fff0d4'), { pos: [SUN[0], SUN[1], SUN[2] + .5], px: 30, order: 1 }));
  W.rays = keep(card(Dg, 240, 240, (g, w, h) => P.rays(g, w, h), { pos: [SUN[0], SUN[1], SUN[2] + 1], px: 5, add: true, order: 3, opacity: .28 }));
  card(Dg, 340, 40, (g, w, h) => P.skyline(g, w, h, { seed: 12, col: '#5a4566', lit: .02, minH: .35, maxH: .95, win: '#ffd59a' }), { pos: [0, -4, -150], px: 7, order: 4 });
  W.haze1 = keep(card(Dg, 340, 26, haze, { pos: [0, 2, -110], px: 4, add: true, order: 5, opacity: .55 }));
  card(Dg, 190, 24, (g, w, h) => P.skyline(g, w, h, { seed: 17, col: '#3e3050', lit: .04, minH: .4, maxH: .9, win: '#ffd59a', bw: [.04, .09] }), { pos: [0, -3.5, -70], px: 10, order: 6 });
  W.haze2 = keep(card(Dg, 190, 14, haze, { pos: [0, -1, -50], px: 5, add: true, order: 7, opacity: .4 }));
  card(Dg, 110, 14, (g, w, h) => P.skyline(g, w, h, { seed: 23, col: '#2e2440', lit: .05, minH: .55, maxH: 1, win: '#ffd59a', bw: [.05, .12] }), { pos: [0, -5, -30], px: 16, order: 8 });
  W.roof = card(Dg, 30, 14, (g, w, h) => S.roofFloor(g, w, h, { Wm: 30, Dm: 14 }), { pos: [0, 0, 5.5], rot: [-Math.PI / 2, 0, 0], px: 60, order: 9 });
  W.parapet = card(Dg, 30, 1.1, (g, w, h) => S.parapet(g, w, h, { Wm: 30 }), { pos: [0, .55, -1.5], px: 80, order: 10 });
  card(Dg, 3, 5, S.tank, { pos: [-6.5, 2.5, -.4], px: 80, order: 11 });
  card(Dg, 1.0, 1.6, S.vent, { pos: [3.8, .8, -.9], px: 120, order: 11 });
  card(Dg, 1.0, 1.4, S.vent, { pos: [-3.4, .7, 1.2], px: 120, order: 12 });
  card(Dg, 1.4, 4.5, S.antenna, { pos: [7.2, 2.25, -1.3], px: 90, order: 11 });
  W.birds = keep(card(Dg, 8, 2.5, (g, w, h) => { g.strokeStyle = '#3a2a44'; g.lineWidth = 6; g.lineCap = 'round'; for (const [x, y, s] of [[.2, .5, 1], [.38, .3, .8], [.55, .6, .9], [.7, .35, .7], [.85, .55, .6]]) { g.beginPath(); g.moveTo(w * x - 24 * s, h * y - 10 * s); g.quadraticCurveTo(w * x - 8 * s, h * y - 16 * s, w * x, h * y); g.quadraticCurveTo(w * x + 8 * s, h * y - 16 * s, w * x + 24 * s, h * y - 10 * s); g.stroke(); } }, { pos: [0, 9, -40], px: 50, order: 7 }));
  W.top = new Stick(Dg, { order: 15, height: 1.74, hood: '#d8553a', hoodDark: '#9c3826', hat: 'beanie', hatColor: '#2f3550', rim: '#ffd8a0', rimDir: [1, -.3], rimW: .06, px: 320, extra: breath });
  { const n = 140, pos = new Float32Array(n * 3), R2 = rng(5); for (let i = 0; i < n; i++) { pos[i * 3] = (R2() - .5) * 30; pos[i * 3 + 1] = R2() * 8; pos[i * 3 + 2] = -6 + R2() * 18; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    W.dust = keep(new THREE.Points(geo, new THREE.PointsMaterial({ color: '#fff0dc', size: .05, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending })));
    W.dust.renderOrder = 30; Dg.add(W.dust); W.dust0 = pos.slice(); }

  // ---------------------------------------------------------------- cameras
  W.path = new CamPath([
    { t: 0, pos: a(0, 6.5, 36), look: a(0, 14.5, -12), fov: 44, push: 1.3, drift: [.05, .03, 0] },
    { t: 2.4, move: 'cut', pos: a(1.6, 13.4, 8), look: a(3, 15.2, -12), fov: 24, push: 1.6 },
    { t: 4.6, move: 'cut', pos: b(-.95, 1.05, 1.75), look: b(-1.9, .72, -3), fov: 36, push: 1.2 },
    { t: 6.6, move: 'cut', pos: b(-.7, .5, -.5), look: b(-2.0, 1.02, -3), fov: 38, push: 0, drift: [0, .03, 0] },
    { t: 8.4, move: 'cut', pos: a(RX(8.4) + 1.6, 1.7, 3.2), look: a(RX(8.4) + 1.6, 1.55, RUN_Z), fov: 34, drift: [3.75, 0, 0] },
    { t: 10.0, move: 'cut', pos: a(RX(10) + .7, 1.15, -2.4), look: a(RX(10) + .7, 1.0, RUN_Z), fov: 36, drift: [RUN_V, 0, 0] },
    { t: 11.3, move: 'cut', pos: b(.45, .42, 1.75), look: b(.05, .32, -1.0), fov: 36, push: 1.0 },
    { t: 12.8, move: 'cut', pos: b(.2, 1.4, 3.2), look: b(.3, 1.05, -2.4), fov: 34, push: -1.15, drift: [.06, 0, 0] },
    { t: 14.4, move: 'cut', pos: c(0, 0, 12), look: c(0, -.2, -8), fov: 46, push: 0, drift: [.08, .02, 0] },
    { t: 18.0, move: 'cut', pos: c(1.5, .8, 9), look: c(2.0, .6, -8), fov: 46, push: 1.4 },
    { t: 21.3, move: 'cut', pos: d(-2.2, 1.25, 5.0), look: d(-.4, 1.1, -1), fov: 36, push: 1.0 },
    { t: 23.6, move: 'cut', pos: d(-1.6, 1.4, 3.2), look: d(1.2, 1.62, -3), fov: 26, push: 1.2 },
    { t: 25.6, move: 'cut', pos: d(-1.5, 1.7, 11), look: d(1.5, 3.6, -10), fov: 44, push: -1.0, drift: [.1, .03, 0] },
  ], { fps: FPS });
  W.path.kick(HIT, .8);

  // ---------------------------------------------------------------- sound cues (mix.py reads these)
  const m = (t, n) => CUES.push({ t, s: 'm', n });
  m(0, 'gece'); m(6.6, 'kalk'); m(7.1, 'montaj'); m(12.8, 'safak'); m(14.4, 'kart'); m(18.0, 'kart2'); m(HIT, 'vurus'); m(21.3, 'cati'); m(25.6, 'baslik'); m(DUR, 'son');
  CUES.push({ t: 1.5, s: 'flip' }, { t: LIGHT_ON, s: 'alarm', d: TAP - LIGHT_ON }, { t: LIGHT_ON, s: 'switch' }, { t: TAP, s: 'tap' }, { t: STAND[0], s: 'stand' },
    { t: 14.4, s: 'whoosh' }, { t: 21.3, s: 'whoosh2' }, { t: HIT, s: 'hit' }, { t: TITLE, s: 'boom' }, { t: 13.3, s: 'page' }, { t: 13.95, s: 'page' }, { t: 12.8, s: 'chair' });
  for (const t of [2.4, 4.6, 6.6, 8.4, 10.0, 11.3, 12.8, 23.6, 25.6]) CUES.push({ t, s: 'cut' });
  // footsteps: a foot lands at phase .25 and .75 of the run cycle (RUN_F cycles a second); louder and wetter up close
  for (let k = Math.ceil((8.4 * RUN_F - .25) * 2) / 2 + .25; k < 11.3 * RUN_F; k += .5) { const t = k / RUN_F; if (t > 8.4) CUES.push({ t, s: 'step', g: t < 10 ? .55 : 1 }); }
  for (const t of PUSH_TOPS) CUES.push({ t, s: 'breath' });
  CUES.push(...barCues(TIGHT));
  ctx.W = W;
}

// ------------------------------------------------------------------ painters that live with the story
function winLight(g, w, h) {      // the lit room behind our window, his silhouette on the bed (painted into the light)
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffd99a'); gr.addColorStop(.6, '#f6b56c'); gr.addColorStop(1, '#e89a58');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,240,215,.5)'; g.beginPath(); g.moveTo(w, 0); g.lineTo(w * .7, 0); g.quadraticCurveTo(w * .84, h * .5, w * .76, h); g.lineTo(w, h); g.fill();
  const ink = '#1a1020', s = w / 1.5;                     // 1.5 m wide window: a seated figure, head bowed, shoulders up
  g.fillStyle = ink; g.beginPath(); g.ellipse(w * .36, h * .62, .2 * s, .19 * s, 0, 0, 7); g.fill();
  g.beginPath(); g.moveTo(w * .2, h); g.quadraticCurveTo(w * .22, h * .76, w * .34, h * .74); g.quadraticCurveTo(w * .5, h * .74, w * .54, h); g.fill();
  g.fillStyle = '#1a1323'; g.fillRect(w / 2 - w * .033, 0, w * .066, h); g.fillRect(0, h * .38, w, h * .042);
}
function lampCone(g, w, h) {      // light falling from a street lamp, visible in the rain
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,214,160,.7)'); gr.addColorStop(1, 'rgba(255,214,160,0)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(w * .44, 0); g.lineTo(w * .56, 0); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill();
}
function haze(g, w, h) {          // a warm band of morning haze along the horizon
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,190,150,0)'); gr.addColorStop(.55, 'rgba(255,190,150,.5)'); gr.addColorStop(1, 'rgba(255,170,140,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}
// sweat drops falling off the head (world-down, whatever the figure's tilt): W.sweatK 0..1, W.sweatPhi = the tilt
function sweat(key) {
  return (g, J, tx, ty, px, sil, when) => {
    if (sil || when !== 'front' || !(W.sweat?.[key] > 0)) return;
    const k = W.sweat[key], phi = W.sweat[key + 'Phi'] || 0, dn = rotp([0, -1], phi), t = W.t;
    g.save(); g.fillStyle = '#d6ecff';
    for (const [ox, oy, ph] of [[.35, .25, 0], [.05, .45, .45], [.42, -.05, .7]]) {
      const f = ((t * 1.3 + ph) % 1), x = J.head[0] + ox + dn[0] * f * .9, y = J.head[1] + oy + dn[1] * f * .9;
      g.globalAlpha = k * Math.sin(f * Math.PI); g.beginPath(); g.ellipse(tx(x), ty(y), .045 * px, .065 * px, 0, 0, 7); g.fill();
    }
    g.restore();
  };
}
// the breath in the cold morning air: a puff from the mouth every 1.6 s, drifting forward and up
function breath(g, J, tx, ty, px, sil, when) {
  if (sil || when !== 'front' || !W.breathK) return;
  const M = mouthOf(J, W.top.face.look ?? .4);
  g.save();
  for (const off of [0, .8]) {
    const f = ((W.t + off) % 1.6) / 1.6; if (f > .75) continue;
    const k = f / .75;
    for (let i = 0; i < 4; i++) {
      const x = M[0] + .12 + k * (.5 + i * .12), y = M[1] + k * (.18 + i * .05), r = (.06 + k * .16) * (1 - i * .15);
      g.globalAlpha = W.breathK * .22 * Math.sin(k * Math.PI) * (1 - i * .2); g.fillStyle = '#fff4ea'; g.beginPath(); g.arc(tx(x), ty(y), r * px, 0, 7); g.fill();
    }
  }
  g.restore();
}

// ------------------------------------------------------------------ poses
const D = D2R;
// keeps the lower foot on the floor (bent legs would make the figure float)
function grounded(p) { const J = joints({ ...p, hipY: 0 }); return { ...p, hipY: (p.hipY || 0) - Math.min(J.legs[0][2][1], J.legs[1][2][1]) }; }
const RUN_F = 1.45;                                             // run cycles a second (2.9 steps a second)
function run(ph, amp = 1) {
  const s = Math.sin(ph * 2 * Math.PI), c = Math.cos(ph * 2 * Math.PI);
  const p = grounded({ lean: 13, head: 6, arms: [[-50 * s * amp + 6, 96], [50 * s * amp + 6, 96]],
    legs: [[40 * s * amp, -12 - 80 * Math.max(0, c) * amp], [-40 * s * amp, -12 - 80 * Math.max(0, -c) * amp]] });
  p.hipY += .09 * s * s * amp; return p;
}
// push-ups: k 0 = chest down, 1 = arms straight. The figure is turned about its toes (mesh rotation), the hands are put
// on the floor under the shoulders and the arms solved to reach them.
const PUSH_T = 11.3, PUSH_P = .95;
const PUSH_TOPS = [0, 1, 2].map(i => PUSH_T + .1 + i * PUSH_P);
const pushK = t => .5 + .5 * Math.cos((t - PUSH_T - .1) / PUSH_P * 2 * Math.PI);
function pushPose(k) {
  const th = lerp(15, 27, k) * D, phi = Math.PI / 2 - th;
  const base = { lean: 0, head: 10, legs: [[0, 0], [0, 0]] };
  const J = joints({ ...base, arms: [[0, 0], [0, 0]] });
  const sw = rotp(J.sh, -phi);
  const hf = rotp([sw[0] + .1, .1], phi), hb = rotp([sw[0] - .06, .1], phi);
  return { pose: { ...base, arms: [armTo(base, hf, -1), armTo(base, hb, -1)] }, phi };      // bend -1: the elbows go up and back, over the back
}

// ------------------------------------------------------------------ frame
export function frame(t, ctx) {
  const { cam } = ctx, s = shotAt(t), name = SH[s][1];
  W.t = t;
  W.A.visible = EXT.includes(name); W.B.visible = ROOM.includes(name); W.C.visible = CARD.includes(name); W.D.visible = ROOF.includes(name);
  W.rain.visible = W.A.visible;
  const look = { bars: BARS.rest, tight: tightAt(t, TIGHT, FPS), vignette: .58, vigSize: 1, grain: .022, bloom: .6, bloomAt: .8, sat: .9, contrast: 1.0, lift: [.045, .038, .062] };
  W.path.apply(cam, t);
  const fwd = cam.getWorldDirection(new THREE.Vector3());
  const focusOn = (p, range) => { const dd = Math.max(.5, new THREE.Vector3(...p).sub(cam.position).dot(fwd)); look.focus = dd; look.range = range * dd / 5; };

  // ---- the street
  if (W.A.visible) {
    tintGroup(W.A, NIGHT_EXT);
    const on = t < LIGHT_ON ? 0 : t < LIGHT_ON + .06 ? .5 : t < LIGHT_ON + .12 ? .15 : 1;
    W.win.material.opacity = on; W.winG.material.opacity = on * .6;
    W.win.material.color.setScalar(1.0); W.winG.material.color.setScalar(1.0);
    rain(t, cam);
    W.runner.mesh.visible = name === 'kosu' || name === 'yagmur';
    if (W.runner.mesh.visible) {
      const ph = t * RUN_F;
      W.sweat = { runner: name === 'yagmur' ? .8 : 0, runnerPhi: 0 };
      W.runner.at(RX(t), 0, RUN_Z).set(run(ph), { look: .5, expr: 'neutral', blink: blinkAt(t, 4) });
      W.runner.mesh.material.color.copy(new THREE.Color('#ffffff').lerp(NIGHT_EXT, .18));
    }
    const L = { sehir: { focus: 46, coc: 6, range: 16, nearK: 1.3, sat: .78 }, pencere: { focus: 20, coc: 9, range: 4, nearK: 2, sat: .78 },
      kosu: { coc: 9, nearK: 2, sat: .8 }, yagmur: { coc: 16, nearK: 2.5, sat: .82 } };
    Object.assign(look, L[name]);
    if (name === 'kosu') focusOn([RX(t), 1, RUN_Z], 3.2);
    if (name === 'yagmur') focusOn([RX(t), 1, RUN_Z], 1.6);
  }

  // ---- the bedroom
  if (W.B.visible) {
    const lampOn = name === 'sinav' || name === 'masa' ? 1 : 0, day = name === 'masa' ? .75 * smoother(ramp(t, 12.9, 14.3)) : 0;
    const set = NIGHT_IN.clone().lerp(LAMP_IN, lampOn * .8).lerp(DAWN_IN, day);
    tintGroup(W.B, set);
    W.me.mesh.material.color.copy(new THREE.Color('#ffffff').lerp(NIGHT_IN, .3 * (1 - day) * (1 - lampOn * .4)));
    W.rSkyD.material.opacity = day / .75; W.rMoon.visible = day < .5;
    W.lampGlow.material.opacity = .45 * lampOn * (1 - day * .5); W.lampPool.material.opacity = .9 * lampOn * (1 - day * .4);
    W.moonShaft.material.opacity = .3 * (1 - day / .75); W.sunShaft.material.opacity = .6 * day / .75;
    const ring = t < TAP && name === 'yatak' ? .5 + .5 * Math.sin(t * 18) : 0, phOn = name === 'yatak' || name === 'kalk';
    const pk = `${phOn}${ring.toFixed(1)}`;
    if (pk !== W.phoneKey) { W.phoneKey = pk; W.phone.userData.paint.redraw({ on: phOn, ring, time: '05:00', font: FONT }); }
    W.phoneG.material.opacity = phOn ? (t < TAP ? .55 + .35 * ring : .4) : 0;
    W.phone.material.color.setScalar(phOn ? 1.25 : .8);
    const mins = clockMins(t), key = Math.round(mins);
    if (key !== W.clockKey) { W.clockKey = key; const P2 = W.clock.userData.paint; P2.g.clearRect(0, 0, P2.w, P2.h); Rm.clockFace(P2.g, P2.w, P2.h, Math.floor(mins / 60), mins % 60); P2.tex.needsUpdate = true; }
    W.me.o.rim = lampOn || day ? '#ffcf96' : '#bccdff';
    W.me.mesh.rotation.z = 0; W.held = null; W.sweat = { me: 0 };
    let hero = [W.me.mesh.position.x - 1000, 1.0, ME_Z];
    if (name === 'yatak' || name === 'kalk') {
      // slumped on the foot of the bed; at TAP he reaches the phone and stops the alarm; on "kalkıyorsun" he stands
      const st = smoother(ramp(t, STAND[0], STAND[1])), reach = smoother(ramp(t, TAP - .3, TAP)) * (1 - smoother(ramp(t, TAP + .2, TAP + .65)));
      const lean = lerp(lerp(22, 30, reach), 2, st) + Math.sin(Math.PI * st) * 20, sit = 1 - st;
      const base = { sit, lean, head: lerp(-24, 2, st), legs: [[0, 2 * sit], [6 * sit, -2 * sit]] };
      const J = joints({ ...base, arms: [[0, 0], [0, 0]] });
      const x = lerp(HIPX, STAND_X, st);
      const knee = (i, dx, dy) => [J.legs[i][1][0] + dx, J.legs[i][1][1] + dy];
      const ph = [(PHONE[0] - x) / HU, (PHONE[1] + .02) / HU];
      let af = armTo(base, knee(0, -.25, .14)), ab = armTo(base, knee(1, -.3, .12));
      if (reach > 0) { const k0 = knee(0, -.25, .14), tg = [lerp(k0[0], ph[0], reach), lerp(k0[1], ph[1], reach)]; af = armTo(base, tg); }
      if (st > 0) { af = af.map((v, i) => lerp(v, [8, 4][i], st)); ab = ab.map((v, i) => lerp(v, [-8, -4][i], st)); }
      const breathe = Math.sin(t * 2.2) * 1.2 * (1 - st);
      W.me.at(x, 0, ME_Z).set({ ...base, lean: lean + breathe, arms: [af, ab] },
        { look: lerp(.2, .6, st), expr: t < STAND[0] ? 'tired' : 'neutral', blink: t < STAND[0] ? Math.max(blinkAt(t, 2), .35 + .3 * Math.sin(t * .9)) : blinkAt(t, 2) });
      hero = [x, .8, ME_Z];
    } else if (name === 'sinav') {
      const k = pushK(t), a = pushPose(k);
      W.sweat = { me: .9, mePhi: a.phi };
      W.me.at(PU.x, 0, PU.z).set(a.pose, { look: .35, expr: k < .4 ? 'angry' : 'neutral', blink: 0 });
      W.me.mesh.rotation.z = -a.phi;
      hero = [PU.x + .7, .3, PU.z];
    } else if (name === 'masa') {
      const flick = Math.min(1, [13.3, 13.95].map(x => Math.exp(-Math.pow((t - x) / .14, 2))).reduce((p, q) => p + q));
      const a = readPose({ sit: 1, lean: 7 + flick * 2, legs: [[0, 0], [6, -4]], head: -8 }, flick);
      W.held = a.held;
      W.me.at(ME.x, 0, ME.z).set(a.pose, { look: .7, expr: flick > .4 ? 'grin' : 'smile', blink: blinkAt(t, 1) });
      hero = [ME.x, 1.0, ME.z];
    }
    const L = { yatak: { coc: 12, sat: .8 }, kalk: { coc: 14, sat: .8 }, sinav: { coc: 16, nearK: 3, sat: .85 }, masa: { coc: 12, sat: .85, tint: [1.03, 1, .96] } };
    Object.assign(look, L[name]);
    focusOn([hero[0] + 1000, hero[1], hero[2]], name === 'masa' ? 3.2 : name === 'sinav' ? 1.6 : 2.2);
    const P0 = W.rdust0, p = W.rdust.geometry.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) { p[i] = P0[i] + Math.sin(t * .2 + i) * .25; p[i + 1] = P0[i + 1] + Math.sin(t * .17 + i * .5) * .2 + t * .01; }
    W.rdust.geometry.attributes.position.needsUpdate = true;
  }

  // ---- the 1 % card
  if (W.C.visible) {
    const dd = dayAt(t), P2 = W.chart.userData.paint; P2.g.setTransform(1, 0, 0, 1, 0, 0); P2.g.clearRect(0, 0, P2.w, P2.h);
    const tip = S.chart(P2.g, P2.w, P2.h, dd, { font: FONT, a: smoother(ramp(t, 14.5, 14.9)) }); P2.tex.needsUpdate = true;
    drawLines(t);
    const wx = (tip[0] - .5) * 22, wy = (tip[1] - .5) * 10.5 - .4;
    const slope = Math.min(1, Math.pow(1.01, dd) * Math.log(1.01) * 365 / 40 * 10.5 / 22 / 2.2);
    const win = smoother(ramp(t, HIT, HIT + .35));
    let pose = { ...run(t * 1.6, .85), lean: 12 + 28 * slope * (1 - win) };
    if (win > 0) pose = grounded({ lean: 0, head: 10, arms: [[lerp(20, 165, win), lerp(60, 10, win)], [lerp(-20, 170, win), lerp(60, -10, win)]], legs: [[6, -6], [-6, -6]], hipY: .25 * Math.sin(Math.PI * ramp(t, HIT, HIT + .5)) });
    W.mini.at(wx - .15, wy + .02, -7.9).set(pose, { look: .5, expr: win > .3 ? 'happy' : 'neutral', blink: 0 });
    W.mini.mesh.visible = t > 14.7;
    Object.assign(look, { coc: 0, vignette: .7, bloomAt: .7, bloom: .8 });
    look.flash = .55 * Math.exp(-Math.pow((t - 14.4) / .06, 2)) * (t >= 14.4 ? 1 : 0) + .35 * Math.exp(-Math.max(0, t - HIT) / .08) * (t >= HIT ? 1 : 0);
  }

  // ---- the rooftop
  if (W.D.visible) {
    tintGroup(W.D, DAWN_EXT);
    const sy = lerp(9, 17, ramp(t, 21.3, 30));
    for (const m of [W.sun, W.sunD, W.rays]) m.position.y = sy;
    W.rays.rotation.z = t * .02;
    W.birds.position.set(-30 + (t - 21.3) * 5, 9 + Math.sin(t) * .3, -40);
    W.top.mesh.material.color.setScalar(1);
    // cati: bent over, hands on the knees, catching his breath; at 22.75 he straightens and looks at the sun
    const up = name === 'cati' ? smoother(ramp(t, 22.75, 23.35)) : 1, pant = Math.sin(t * 5.2) * (1 - up);
    const base = { lean: lerp(38, 1, up) + pant * 2, head: lerp(28, 6, up), legs: [[lerp(16, 3, up), lerp(-22, 0, up)], [lerp(-4, -3, up), lerp(-14, 0, up)]] };
    const J = joints({ ...grounded({ ...base, arms: [[0, 0], [0, 0]] }) });
    const kf = [J.legs[0][1][0] - .05, J.legs[0][1][1] + .1], kb = [J.legs[1][1][0] - .1, J.legs[1][1][1] + .12];
    const g0 = grounded({ ...base, arms: [[0, 0], [0, 0]] });
    let af = armTo(g0, kf), ab = armTo(g0, kb);
    af = af.map((v, i) => lerp(v, [10, 6][i], up)); ab = ab.map((v, i) => lerp(v, [-10, -6][i], up));
    // cati2: on "disiplin" he lifts his chin and smiles a little
    const chin = name === 'cati2' ? smoother(ramp(t, 24.05, 24.5)) : name === 'baslik' ? 1 : 0;
    W.breathK = 1;
    W.top.at(ROOFP[0], 0, ROOFP[2]).set({ ...g0, head: g0.head + chin * 6, arms: [af, ab] },
      { look: lerp(.3, .75, up), expr: name === 'cati' && up < .5 ? 'tired' : chin > .5 ? 'smile' : 'neutral', blink: blinkAt(t, 5) });
    const L = { cati: { coc: 10, sat: .86, tint: [1.03, .99, .95] }, cati2: { coc: 14, sat: .9, tint: [1.04, .99, .94], bloomAt: .72 }, baslik: { coc: 6, sat: .88, tint: [1.03, .99, .95] } };
    Object.assign(look, L[name]);
    focusOn([3000 + ROOFP[0], 1.2, ROOFP[2]], name === 'cati2' ? 1.4 : name === 'baslik' ? 6 : 2.6);
    look.flash = .5 * Math.exp(-Math.max(0, t - 21.3) / .09) * (t >= 21.3 ? 1 : 0);
    look.fade = ramp(t, 29.35, 30);
    const P0 = W.dust0, p = W.dust.geometry.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) { p[i] = P0[i] + Math.sin(t * .3 + i) * .4 + t * .1; p[i + 1] = P0[i + 1] + Math.sin(t * .23 + i * .7) * .3; }
    W.dust.geometry.attributes.position.needsUpdate = true;
  }
  return look;
}

// the HUD clock: 04:59 until "beşi", then the routine in jumps from shot to shot
function clockMins(t) {
  const n = SH[shotAt(t)][1];
  const at = { sehir: 0, pencere: 0, yatak: 0, kalk: 1, kosu: 14, yagmur: 31, sinav: 64, masa: 98 }[n] ?? 0;
  return 4 * 60 + 59 + (t >= 1.5 ? 1 : 0) + at + (n === 'masa' ? (t - 12.8) * 1.6 : 0);
}
// days on the chart: slowly through the first three months, then the year rushes in before "Otuz yedi kat"
const dayAt = t => t < 18 ? 90 * smoother(ramp(t, 14.6, 17.6)) : 90 + 275 * Math.pow(smoother(ramp(t, 18.25, 19.78)), 1.3);

function rain(t, cam) {
  const p = W.rain.geometry.attributes.position.array, R0 = W.rain0, n = R0.length / 4, c = cam.position;
  const wrap = (v, L) => ((v % L) + L) % L;
  for (let i = 0; i < n; i++) {
    const v = 11 * R0[i * 4 + 3];
    const x = c.x - 15 + wrap(R0[i * 4] - c.x, 30), z = c.z - 28 + wrap(R0[i * 4 + 2] - c.z, 26.5);      // never closer than 1.5 m
    const y = c.y - 10 + wrap(R0[i * 4 + 1] - t * v - c.y, 24);
    p[i * 6] = x; p[i * 6 + 1] = y; p[i * 6 + 2] = z; p[i * 6 + 3] = x + .05; p[i * 6 + 4] = y + .42 * R0[i * 4 + 3]; p[i * 6 + 5] = z;
  }
  W.rain.geometry.attributes.position.needsUpdate = true;
}
function drawLines(t) {
  const P2 = W.lines.userData.paint, g = P2.g, w = P2.w, h = P2.h; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
  const R = rng(6), sp = t < 18 ? 1 : 1 + 4 * smoother(ramp(t, 18.25, 19.8)) * (1 - ramp(t, 20.2, 21));
  g.strokeStyle = 'rgba(170,185,230,.3)'; g.lineWidth = 2;
  for (let i = 0; i < 50; i++) { const y = R() * h, v = (40 + R() * 90) * sp, L = 60 + R() * 70 * sp, x = ((R() * w + t * v * (t < 18 ? 1 : 3)) % (w + L)) - L; g.beginPath(); g.moveTo(x, y); g.lineTo(x + L, y); g.stroke(); }
  P2.tex.needsUpdate = true;
}

// ------------------------------------------------------------------ 2D overlay: HUD clock, the chart's numbers, the title
const glowText = (g, txt, x, y, size, col = '#ffb45a', blur = 26, weight = 900, a = 1, align = 'center') => {
  g.save(); g.globalAlpha = a; g.font = `${weight} ${size}px ${FONT}`; g.textAlign = align; g.textBaseline = 'alphabetic';
  g.shadowColor = col; g.shadowBlur = blur; g.fillStyle = col; g.lineJoin = 'round'; g.lineWidth = size * .07; g.strokeStyle = col;
  g.strokeText(txt, x, y); g.fillText(txt, x, y); g.shadowBlur = 0; g.fillStyle = mix(col, '#ffffff', .3); g.fillText(txt, x, y); g.restore();
};
export function overlay(g, t, ctx, look) {
  const name = SH[shotAt(t)][1], kT = look?.tight ?? 0;
  // HUD clock (top right): from the first shot to the end of the montage; it rides down with the bar and takes the cold grade
  if (t < 14.4) {
    const mins = clockMins(t), a = ramp(t, .3, .8), dy = (BARS.tight - BARS.rest) * kT;
    const hh = String(Math.floor(mins / 60)).padStart(2, '0'), mm = String(Math.floor(mins % 60)).padStart(2, '0');
    const hudC = tightColor('#f2c27e', kT), hudT = tightColor('#ffb45a', kT), pop = Math.exp(-Math.max(0, t - 1.5) / .12) * (t >= 1.5 ? 1 : 0);
    g.save(); g.globalAlpha = a; g.translate(1700, 150 + dy);
    g.strokeStyle = hudC; g.lineWidth = 5; g.fillStyle = 'rgba(16,12,30,.75)'; g.beginPath(); g.arc(0, 0, 52, 0, 7); g.fill(); g.stroke();
    for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI * 2; g.beginPath(); g.moveTo(Math.sin(an) * 40, -Math.cos(an) * 40); g.lineTo(Math.sin(an) * 47, -Math.cos(an) * 47); g.stroke(); }
    const ha = ((mins / 60) % 12) / 12 * Math.PI * 2, ma = (mins % 60) / 60 * Math.PI * 2;
    g.lineCap = 'round'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.sin(ha) * 24, -Math.cos(ha) * 24); g.stroke();
    g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.sin(ma) * 36, -Math.cos(ma) * 36); g.stroke();
    g.restore();
    g.save(); g.translate(1700, 262 + dy); g.scale(1 + pop * .18, 1 + pop * .18);
    glowText(g, `${hh}:${mm}`, 0, 0, 58, hudT, 22 + pop * 30, 900, a); g.restore();
  }
  // the 1 % card
  if (name === 'kart' || name === 'kart2') {
    const dd = dayAt(t), v = Math.pow(1.01, dd);
    const a1 = smoother(ramp(t, 14.9, 15.4)) * (1 - ramp(t, HIT - .1, HIT + .1));
    if (a1 > 0) { glowText(g, 'HER GÜN %1 DAHA İYİ', 960, 190, 54, '#e9d9b0', 14, 900, a1); }
    const a2 = smoother(ramp(t, 15.2, 15.6));
    if (a2 > 0) {
      g.save(); g.globalAlpha = a2; g.font = `700 34px ${FONT}`; g.textAlign = 'left'; g.fillStyle = '#e9d9b0'; g.letterSpacing = '4px';
      g.fillText(`GÜN ${Math.round(dd)}`, 150, 200); g.restore();
      glowText(g, `${v.toFixed(2).replace('.', ',')}×`, 1770, 205, 56, '#ffb45a', 24, 900, a2 * (1 - ramp(t, HIT - .1, HIT + .1)), 'right');
    }
    const z = smoother(ramp(t, HIT, HIT + .22));
    if (z > 0) {
      const sc = 1 + .3 * (1 - z);
      g.save(); g.translate(760, 430); g.scale(sc, sc);
      g.globalAlpha = z; g.fillStyle = 'rgba(7,10,24,.62)'; g.beginPath(); g.roundRect(-430, -210, 860, 330, 24); g.fill(); g.globalAlpha = 1;
      glowText(g, '37 KAT', 0, 40, 190, '#ffb45a', 50, 900, z);
      g.globalAlpha = z; g.font = `700 40px ${FONT}`; g.textAlign = 'center'; g.fillStyle = '#e9d9b0'; g.fillText('1,01³⁶⁵ ≈ 37,8', 0, 100);
      g.restore();
      g.save(); g.globalAlpha = smoother(ramp(t, HIT + .5, HIT + .9)); g.font = `700 34px ${FONT}`; g.textAlign = 'right'; g.fillStyle = '#9fb3ff';
      g.fillText('0,99³⁶⁵ ≈ 0,03', 1700, 790); g.restore();
    }
  }
  // the title over the sunrise
  if (name === 'baslik') {
    const a = smoother(ramp(t, TITLE, TITLE + .8)) * (1 - ramp(t, 29.3, 29.9));
    if (a > 0) {
      const sp = 1 - smoother(ramp(t, TITLE, TITLE + 1.2));
      g.save(); g.globalAlpha = a; g.letterSpacing = `${6 + sp * 18}px`;
      glowText(g, 'MOTİVASYON BİTER.', 960, 200, 60, '#f6e7cf', 16);
      g.letterSpacing = `${4 + sp * 14}px`;
      glowText(g, 'DİSİPLİN KALIR.', 960, 330, 124, '#ffb04f', 36);
      g.globalAlpha = a * .8; g.fillStyle = '#f6e7cf'; g.fillRect(960 - 360 * a, 370, 720 * a, 3);
      const b = smoother(ramp(t, NOW, NOW + .5));
      g.globalAlpha = a * b; g.letterSpacing = '10px'; g.font = `800 36px ${FONT}`; g.textAlign = 'center'; g.fillStyle = '#f6e7cf'; g.fillText('BUGÜN BAŞLA.', 960, 425);
      g.restore();
    }
  }
}
