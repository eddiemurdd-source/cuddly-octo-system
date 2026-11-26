// story.js — "Parmak çıtlatınca ne olur?" A 3D explainer short, 9:16, ~59 s.
// Every frame is a pure function of t: render(t) picks the shot, poses the hands, moves the camera, draws the overlay.
import * as THREE from 'three';
import { makeHand } from '/engine/src/hand.js';
import { clamp, lerp, ss, ease, tw, keys, noise1, shake } from '/engine/src/anim.js';
import { studio } from './studio.js';
import { makeJoint } from './joint.js';
import { makeBottle } from './bottle.js';
import * as O from './overlay.js';

export const W = 1080, H = 1920, FPS = 30, NAME = 'citlatma', DUR = 59.4;
// line start times (s). Voice files: voice/satir/<id>.wav
export const LINES = [
  { id: 'L01', t: 1.25 }, { id: 'L02', t: 5.6 }, { id: 'L03', t: 10.0 }, { id: 'L04', t: 14.55 }, { id: 'L05', t: 19.95 }, { id: 'L06', t: 26.25 },
  { id: 'L07', t: 30.65 }, { id: 'L08', t: 37.45 }, { id: 'L09', t: 45.25 }, { id: 'L10', t: 47.6 }, { id: 'L11', t: 54.0 },
];
export const CUES = [];
const START = Object.fromEntries(LINES.map(l => [l.id, l.t]));
let ALT, WT, chunks;

// ---------------------------------------------------------------- poses
const RELAX = { I: [8, 12, 6], M: [10, 14, 7], R: [12, 16, 8], P: [14, 18, 9], T: [4, 8, 8] };
const FIST = { I: [86, 100, 50], M: [88, 102, 52], R: [90, 104, 54], P: [92, 104, 56], T: [28, 30, 32, -10] };
const mixP = (a, b, u) => { const o = {}; for (const k of Object.keys(a)) o[k] = a[k].map((x, i) => lerp(x, (b[k] || [])[i] ?? x, typeof u === 'number' ? u : u[k])); return o; };
// fingers fold one after another (pinky first); returns pose and the times each knuckle pops
const ROLL = ['P', 'R', 'M', 'I'];
function rollPose(t, t0, gap = 0.2, dur = 0.2, open = RELAX, closed = FIST) {
  const u = {}; ROLL.forEach((k, i) => u[k] = ease.inOut(clamp((t - t0 - i * gap) / dur)));
  u.T = ease.inOut(clamp((t - t0 - 4 * gap) / dur));
  return mixP(open, closed, u);
}
const rollPops = (t0, gap = 0.2, dur = 0.2) => ROLL.map((k, i) => ({ k, t: t0 + i * gap + dur * 0.82 }));

// ---------------------------------------------------------------- world
let A, J, B, handR, handL, handN, medal, cam, renderer, PX = 1000;
const HOOK_POPS = rollPops(0.12, 0.2, 0.2);
let T = {};   // named times, filled in init from the word timings

function makeMedal() {
  const g = new THREE.Group();
  const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
  const gr = x.createRadialGradient(256, 220, 40, 256, 256, 256); gr.addColorStop(0, '#fff3c4'); gr.addColorStop(1, '#c8962e'); x.fillStyle = gr; x.fillRect(0, 0, 512, 512);
  x.strokeStyle = '#8a6418'; x.lineWidth = 10; x.beginPath(); x.arc(256, 256, 220, 0, 7); x.stroke();
  for (let i = 0; i < 26; i++) { const a = Math.PI * 0.62 + i / 25 * Math.PI * 1.76; x.save(); x.translate(256 + Math.cos(a) * 185, 256 + Math.sin(a) * 185); x.rotate(a + 0.6); x.fillStyle = '#9a7020'; x.beginPath(); x.ellipse(0, 0, 18, 7, 0, 0, 7); x.fill(); x.restore(); }
  x.fillStyle = '#7a5410'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '900 92px Cap'; x.fillText('IG', 256, 190); x.fillText('NOBEL', 256, 285);
  x.font = '700 44px Lab'; x.fillText('2009', 256, 370);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xffd27a, metalness: 1, roughness: 0.22, clearcoat: 0.6, envMapIntensity: 1.6 });
  const face = new THREE.MeshPhysicalMaterial({ map: tex, metalness: 0.85, roughness: 0.3, envMapIntensity: 1.4, clearcoat: 0.5 });
  const disk = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.45, 96), [gold, face, face]); disk.rotation.set(Math.PI / 2, Math.PI / 2, 0); g.add(disk);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(3, 0.18, 16, 96), gold); g.add(rim);
  const rib = new THREE.MeshPhysicalMaterial({ color: 0x1f4fb5, roughness: 0.5, sheen: 1, sheenColor: new THREE.Color(0x88aaff) });
  for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(1.4, 7, 0.08), rib); r.position.set(s * 0.9, 5.6, -0.15); r.rotation.z = -s * 0.28; g.add(r); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export async function init(ctx) {
  renderer = ctx.renderer;
  ALT = await (await fetch('/stories/citlatma/voice/altyazi.json')).json();
  const byId = Object.fromEntries(ALT.map(l => [l.id, l.words]));
  WT = (id, i) => START[id] + byId[id][i].s;
  chunks = O.buildCaptions(ALT, START);
  T = {
    kemik: WT('L01', 6), kese: WT('L02', 9), ikiKemik: WT('L02', 4), sivi: WT('L03', 3), gaz: WT('L04', 3), tipki: WT('L04', 6),
    cekince: WT('L05', 4), acilir: WT('L05', 7), basinc: WT('L05', 10), duser: WT('L05', 12), pop: 25.72, cit: WT('L06', 7),
    tekrar: WT('L07', 5), gazin: WT('L07', 7), yirmi: WT('L07', 12), birDoktor: WT('L08', 6), altmis: WT('L08', 11), sol: WT('L08', 15),
    sag: WT('L09', 0), iki: WT('L10', 1), buDeney: WT('L10', 9), odul: WT('L10', 13), ama: WT('L11', 4), sinir: WT('L11', 6),
  };
  A = studio(renderer);
  handR = makeHand(); A.scene.add(handR.group);
  handL = makeHand({ left: true }); A.scene.add(handL.group);
  handN = makeHand({ color: 0x8e5a3e, rimColor: 0xff5a3a }); A.scene.add(handN.group);
  medal = makeMedal(); A.scene.add(medal);
  J = makeJoint(renderer);
  B = makeBottle(renderer);
  cam = new THREE.PerspectiveCamera(35, W / H, 0.3, 900);
  PX = ctx.H / (2 * Math.tan(35 / 2 * Math.PI / 180));                  // pixels per world unit at distance 1 (point sprites)
  J.gas.material.uniforms.uScale.value = PX;

  // sound cues for audio/mix.py
  const cue = (t, type, extra = {}) => CUES.push({ t: +t.toFixed(3), type, ...extra });
  HOOK_POPS.forEach((p, i) => cue(p.t, 'pop', { v: 1, pitch: 1 + i * 0.07 }));
  cue(T.kemik - 0.05, 'xray');
  cue(7.65, 'whoosh'); cue(8.0, 'dive');
  cue(T.kese - 0.1, 'swell'); cue(T.sivi - 0.1, 'liquid'); cue(T.gaz - 0.1, 'fizz');
  cue(T.tipki - 0.25, 'whoosh'); cue(T.tipki + 0.2, 'clink');
  cue(19.9, 'whoosh'); cue(22.55, 'whoosh');
  cue(T.acilir - 0.1, 'stretch'); cue(T.basinc - 0.15, 'gauge');
  cue(T.pop - 0.6, 'riser'); cue(T.pop, 'bigpop'); cue(T.pop + 0.05, 'bubble');
  cue(30.6, 'whoosh'); cue(T.tekrar + 0.35, 'thunk'); cue(T.tekrar + 0.9, 'error');
  cue(33.3, 'whoosh'); for (let k = 0; k < 14; k++) cue(33.5 + k * 0.27, 'tick', { v: 0.6 + 0.4 * (k % 2) }); cue(37.3, 'ding');
  cue(37.45, 'whoosh');
  for (let k = 0; ; k++) { const tt = T.birDoktor + 0.15 + k * 0.62 + 0.31; if (tt > T.sag) break; cue(tt, 'pop', { v: 0.35, pitch: 0.9 + (k % 3) * 0.08 }); }
  cue(T.altmis, 'counter', { dur: T.sag - T.altmis }); cue(T.sag - 0.15, 'whoosh');
  cue(T.iki - 0.2, 'xray'); cue(T.iki + 0.35, 'check'); cue(T.iki + 0.55, 'check', { pitch: 1.12 });
  cue(T.buDeney - 0.3, 'whoosh'); cue(T.buDeney + 0.35, 'medal');
  cue(53.95, 'whoosh');
  rollPops(54.15, 0.12, 0.16).forEach((p, i) => cue(p.t, 'pop', { v: 0.6, pitch: 1.05 + i * 0.06 }));
  cue(T.sinir, 'grr'); cue(58.85, 'pop', { v: 1.1, pitch: 0.95 }); cue(58.95, 'thud');
  CUES.sort((a, b) => a.t - b.t);
}

// ---------------------------------------------------------------- shots
const SHOTS = () => [
  { a: 0, b: 5.6, f: shotHook },
  { a: 5.6, b: 8.0, f: shotDive },
  { a: 8.0, b: T.tipki - 0.1, f: shotJoint },
  { a: T.tipki - 0.1, b: 19.95, f: shotBottle },
  { a: 19.95, b: 22.6, f: shotBend },
  { a: 22.6, b: 30.65, f: shotPop },
  { a: 30.65, b: 33.3, f: shotAgain },
  { a: 33.3, b: 37.45, f: shotDissolve },
  { a: 37.45, b: 47.6, f: shotExperiment },
  { a: 47.6, b: 54.0, f: shotResult },
  { a: 54.0, b: DUR, f: shotEnd },
];
let shotList;

function only(...hands) { for (const h of [handR, handL, handN]) h.group.visible = hands.includes(h); medal.visible = false; }
function look(pos, tgt, fov = 35, sway = 1, t = 0) {
  cam.fov = fov; cam.updateProjectionMatrix();
  cam.position.set(pos[0] + noise1(t * 0.6, 1) * 0.12 * sway, pos[1] + noise1(t * 0.5, 2) * 0.1 * sway, pos[2]);
  cam.lookAt(tgt[0] + noise1(t * 0.4, 3) * 0.05 * sway, tgt[1] + noise1(t * 0.45, 4) * 0.05 * sway, tgt[2]);
  cam.updateMatrixWorld();
}
const BASE_FX = { exposure: 0.86, bloom: 0.28, bloomThreshold: 0.9, vignette: 0.38, grain: 0.03 };
const studioFx = (focus, ap = 34, extra = {}) => ({ ...BASE_FX, focus, aperture: ap, ...extra });
const resetHand = h => { h.group.position.set(0, 0, 0); h.group.rotation.set(0, 0, 0); h.group.scale.x = h === handL ? -1 : 1; h.xray(0); h.pose(RELAX); };

// 0 — hook: the fist roll, four pops; "aslında kemiklerinden gelmiyor" -> x-ray
function shotHook(t, ov) {
  only(handR); resetHand(handR);
  handR.pose(rollPose(t, 0.12, 0.2, 0.2));
  handR.group.rotation.set(-0.2, 0.55 + t * 0.05, 0.1);
  handR.group.position.set(0, -2, 0);
  const x = ease.inOut(clamp((t - T.kemik + 0.1) / 0.5));
  handR.xray(x);
  let sh = 0; HOOK_POPS.forEach(p => sh += shake(t, p.t, 0.12, 0.25));
  const push = tw(t, 0, 5.6, 0, 1, ease.out);
  const c0 = handR.joint('M', 0);
  look([c0.x + lerp(7, 4, push) + sh, c0.y + lerp(7, 5.5, push), c0.z + lerp(40, 31, push)], [c0.x - 0.8, c0.y - 2.2, c0.z], 35, 0.6, t);
  HOOK_POPS.forEach((p, i) => { const [px, py] = O.project(handR.joint(p.k, 1), cam, W, H); ov.push(c => O.burst(c, W, H, W * (0.2 + i * 0.2), py - H * (0.1 + (i % 2) * 0.06), t, p.t, 'ÇIT!', 0.8, -0.2 + i * 0.13)); });
  // the misconception: "bones?" -> red cross on the bones
  const xa = clamp((t - T.kemik - 0.25) / 0.4) * (1 - ss(5.2, 5.55, t));
  if (xa > 0) {
    const [ax, ay] = O.project(handR.joint('M', 1), cam, W, H);
    ov.push(c => { O.label(c, W, H, [ax, ay], [ax + W * 0.16, ay - H * 0.1], 'KEMİK SESİ?', xa, '#ff6b5e'); O.check(c, W, H, ax + W * 0.16 + W * 0.33, ay - H * 0.1, clamp((t - T.kemik - 0.6) / 0.35), false); });
  }
  return { scene: A.scene, fx: studioFx(cam.position.distanceTo(new THREE.Vector3(0, 7, 0)), 30, { flash: HOOK_POPS.reduce((s, p) => s + (t > p.t ? 0.05 * Math.exp(-(t - p.t) * 25) : 0), 0) }) };
}

// 1 — open the hand under x-ray and dive into the index knuckle
function shotDive(t, ov) {
  only(handR); resetHand(handR);
  const u = ease.inOut(clamp((t - 5.6) / 0.9));
  handR.pose(mixP(FIST, { ...RELAX, I: [20, 14, 6] }, u));
  handR.group.rotation.set(-0.2 + 0.2 * u, 0.6 - 0.45 * u, 0.1 - 0.1 * u); handR.group.position.set(0, -2, 0);
  handR.xray(1);
  const k = handR.joint('I', 0);
  const d = ease.in(clamp((t - 6.0) / 2.0));
  const p0 = [3, 13.5, 34], p1 = [k.x + 0.6, k.y + 0.4, k.z + 2.2];
  look([lerp(p0[0], p1[0], d), lerp(p0[1], p1[1], d), lerp(p0[2], p1[2], d)], [lerp(0, k.x, d), lerp(6.2, k.y, d), lerp(0, k.z, d)], 35, 0.5, t);
  const la = clamp((t - T.ikiKemik) / 0.3) * (1 - ss(7.3, 7.6, t));
  if (la > 0) { const [ax, ay] = O.project(k, cam, W, H); ov.push(c => O.label(c, W, H, [ax, ay], [ax - W * 0.2, ay - H * 0.12], 'EKLEM', la)); }
  return { scene: A.scene, fx: studioFx(cam.position.distanceTo(k), 26, { zoom: ss(7.55, 8.0, t) * 0.35, flash: ss(7.8, 8.0, t) * 0.5 }) };
}

// macro camera: slow orbit around the joint, joint sits in the upper-middle of the frame
function jointCam(t, a0, a1, ta, tb, dist0 = 11.5, dist1 = 10.5, y = 0.6) {
  const u = ease.inOut(clamp((t - ta) / (tb - ta))), az = lerp(a0, a1, u), dist = lerp(dist0, dist1, u);
  look([Math.sin(az) * dist, y + 1.4, Math.cos(az) * dist], [0, -1.15, 0], 35, 0.8, t);
}
const jointFx = (extra = {}) => ({ ...BASE_FX, exposure: 0.95, focus: cam.position.length(), aperture: 10, bloom: 0.35, bloomThreshold: 0.85, ...extra });

// 2 — inside: bones, capsule ("kese"), fluid, dissolved gas
function shotJoint(t, ov) {
  const cap = ss(T.kese - 0.25, T.kese + 0.6, t), fl = ss(T.sivi - 0.2, T.sivi + 1.2, t), gas = ss(T.gaz - 0.2, T.gaz + 0.8, t);
  J.update(t, { capsule: cap, fluid: fl, gas, pull: 0, bubble: 0 });
  jointCam(t, -0.55, 0.45, 8.0, T.tipki, 12.5, 10.2);
  const P = v => O.project(v, cam, W, H);
  const lab = (from, to, anchor, off, text) => { const a = clamp((t - from) / 0.45) * (1 - ss(to - 0.3, to, t)); if (a > 0) { const [ax, ay] = P(anchor); ov.push(c => O.label(c, W, H, [ax, ay], [ax + off[0] * W, ay + off[1] * H], text, a)); } };
  lab(8.25, T.sivi - 0.3, J.anchors.bone(), [0.22, 0.02], 'KEMİK');
  lab(8.55, T.sivi - 0.3, J.anchors.cart(), [0.25, -0.12], 'KIKIRDAK');
  lab(T.kese + 0.05, T.gaz - 0.2, J.anchors.capsule(), [-0.04, -0.17], 'EKLEM KAPSÜLÜ');
  lab(T.sivi + 0.3, T.tipki, J.anchors.fluid(), [-0.42, -0.03], 'EKLEM SIVISI');
  lab(T.gaz + 0.3, T.tipki, J.anchors.gas(), [0.12, -0.2], 'ÇÖZÜNMÜŞ GAZ');
  return { scene: J.scene, fx: jointFx({ zoom: (1 - ss(8.0, 8.35, t)) * 0.35, flash: (1 - ss(8.0, 8.3, t)) * 0.5 }) };
}

// 3 — the sealed soda bottle
function shotBottle(t, ov) {
  B.update(t, PX);
  const u = clamp((t - (T.tipki - 0.1)) / (19.95 - T.tipki));
  look([lerp(-4, 4, ease.inOut(u)), 15, lerp(50, 45, u)], [0, 8.6, 0], 35, 0.6, t);
  const la = clamp((t - T.tipki - 0.5) / 0.4);
  const [ax, ay] = O.project(new THREE.Vector3(0, 21.3, 0), cam, W, H), [bx, by] = O.project(new THREE.Vector3(1.2, 9.5, 2.6), cam, W, H);
  ov.push(c => { O.label(c, W, H, [ax, ay], [ax + W * 0.14, ay - H * 0.05], 'KAPALI KAPAK', la); O.label(c, W, H, [bx, by], [bx - W * 0.2, by - H * 0.08], 'ÇÖZÜNMÜŞ GAZ', clamp((t - T.tipki - 0.9) / 0.4)); });
  return { scene: B.scene, fx: studioFx(cam.position.distanceTo(new THREE.Vector3(0, 10, 0)), 30, { zoom: (1 - ss(T.tipki - 0.1, T.tipki + 0.15, t)) * 0.25 }) };
}

// 4 — the finger bends (outside view)
function shotBend(t, ov) {
  only(handR); resetHand(handR);
  const u = ease.inOut(clamp((t - 20.3) / 1.6));
  handR.pose({ ...FIST, I: [lerp(0, 80, u), lerp(4, 30, u), lerp(2, 12, u)], T: [40, 45, 40, -10] });
  handR.group.rotation.set(0, Math.PI / 2 - 0.3, 0); handR.group.position.set(0, -2, 0);
  const k = handR.joint('I', 0), k1 = handR.joint('I', 1);
  look([k.x + 4, k.y + lerp(6, 5, u), k.z + lerp(32, 28, u)], [lerp(k.x, k1.x, 0.6) - 0.5, lerp(k.y, k1.y, 0.6) - 0.5, k.z], 35, 0.5, t);
  return { scene: A.scene, fx: studioFx(cam.position.distanceTo(k), 34, { zoom: (1 - ss(19.95, 20.2, t)) * 0.25 + ss(22.35, 22.6, t) * 0.3 }) };
}

// 5 — the space opens, pressure falls, POP: the bubble
function shotPop(t, ov) {
  const pull = ease.inOut(clamp((t - (T.acilir - 0.3)) / 1.3)) * 0.8 + ease.outExpo(clamp((t - T.pop) / 0.15)) * 0.2;
  const gasPull = ss(T.basinc, T.pop, t) * 0.45 + ss(T.pop, T.pop + 0.25, t) * 0.55;
  const bub = t < T.pop ? 0 : ease.outElastic(clamp((t - T.pop) / 0.6)) ;
  const wob = t < T.pop ? 0 : 0.35 + 0.65 * Math.exp(-(t - T.pop) * 1.2);
  J.update(t, { capsule: 1, fluid: 1, gas: 1, pull, bubble: bub, gasPull, wobble: wob, ring: clamp((t - T.pop) / 0.45) * (t > T.pop ? 1 : 0) });
  const sh = shake(t, T.pop, 0.22, 0.6, 22);
  jointCam(t, 0.35, -0.25, 22.6, 30.65, 12.5, 10.5, 0.4);
  cam.position.x += sh; cam.position.y += shake(t, T.pop, 0.15, 0.6, 17); cam.updateMatrixWorld();
  const ga = clamp((t - T.basinc + 0.3) / 0.35) * (1 - ss(T.pop + 0.4, T.pop + 0.8, t));
  const gv = 0.86 - 0.72 * ease.inOut(clamp((t - T.basinc) / (T.duser - T.basinc + 0.4)));
  ov.push(c => O.gauge(c, W, H, W * 0.5, H * 0.17, gv, ga));
  const [bx, by] = O.project(J.anchors.bubble(), cam, W, H);
  ov.push(c => O.burst(c, W, H, bx + W * 0.2, by + H * 0.08, t, T.pop + 0.02, 'ÇIT!', 1.25, -0.1));
  const la = clamp((t - (T.cit - 0.8)) / 0.4);
  ov.push(c => O.label(c, W, H, [bx - W * 0.08, by], [bx - W * 0.2, by - H * 0.13], 'GAZ KABARCIĞI', la));
  const fl = t > T.pop ? Math.exp(-(t - T.pop) * 7) * 0.75 : 0;
  return { scene: J.scene, fx: jointFx({ flash: fl, bloom: 0.35 + fl * 1.5, ca: 0.0015 + fl * 0.01, zoom: (1 - ss(22.6, 22.85, t)) * 0.3 + (t > T.pop ? Math.exp(-(t - T.pop) * 6) * 0.12 : 0) }) };
}

// 6 — try again right away: nothing
function shotAgain(t, ov) {
  only(handR); resetHand(handR);
  const u = ease.inOut(clamp((t - (T.tekrar - 0.2)) / 0.55)) * (1 - ease.inOut(clamp((t - T.tekrar - 1.0) / 0.6)));
  handR.pose({ ...FIST, I: [lerp(0, 80, u), lerp(4, 30, u), lerp(2, 12, u)], T: [40, 45, 40, -10] });
  handR.group.rotation.set(0, Math.PI / 2 - 0.3, 0); handR.group.position.set(0, -2, 0);
  const k = handR.joint('I', 0), k1 = handR.joint('I', 1);
  look([k.x + 4, k.y + 5, k.z + 28], [lerp(k.x, k1.x, 0.6) - 0.5, lerp(k.y, k1.y, 0.6) - 0.5, k.z], 35, 0.5, t);
  const [ax, ay] = O.project(k, cam, W, H);
  ov.push(c => O.burst(c, W, H, ax, ay - H * 0.1, t, T.tekrar + 0.35, '...?', 0.7, 0.05));
  ov.push(c => O.check(c, W, H, ax + W * 0.2, ay - H * 0.12, clamp((t - T.tekrar - 0.9) / 0.35) * (1 - ss(33.0, 33.3, t)), false));
  return { scene: A.scene, fx: studioFx(cam.position.distanceTo(k), 34, { zoom: (1 - ss(30.65, 30.9, t)) * 0.25 }) };
}

// 7 — the bubble slowly dissolves back: about 20 minutes
function shotDissolve(t, ov) {
  const u = clamp((t - 33.5) / 3.7);
  J.update(t, { capsule: 1, fluid: 1, gas: 1, pull: lerp(0.95, 0.25, ease.inOut(u)), bubble: lerp(1, 0, ease.in(u)) , bubbleA: 1 - ss(0.85, 1, u), gasPull: 1, dissolve: u * 1.25, wobble: 0.25 });
  jointCam(t, -0.3, 0.3, 33.3, 37.45, 11, 12, 0.5);
  const ca = clamp((t - 33.6) / 0.35) * (1 - ss(37.15, 37.45, t));
  ov.push(c => O.clock(c, W, H, W * 0.5, H * 0.17, u, ca, String(Math.min(20, Math.floor(u * 20.99)))));
  return { scene: J.scene, fx: jointFx({ zoom: (1 - ss(33.3, 33.55, t)) * 0.3 }) };
}

// 8 — the experiment: left hand cracked for 60 years, right hand never
function shotExperiment(t, ov) {
  only(handR, handL); resetHand(handR); resetHand(handL);
  handL.group.position.set(-5.3, -1, 0); handL.group.rotation.set(-0.1, -0.15, 0.08);
  handR.group.position.set(5.3, -1, 0); handR.group.rotation.set(-0.1, 0.15, -0.08);
  handR.pose(RELAX);
  const c0 = T.birDoktor + 0.15, ph = t < c0 || t > T.sag ? 0 : ((t - c0) / 0.62) % 1;
  const f = Math.sin(Math.PI * ph) ** 2;
  handL.pose(mixP(RELAX, { I: [75, 30, 10], M: [77, 30, 10], R: [79, 30, 10], P: [80, 30, 10], T: [10, 14, 12] }, f));
  // camera: wide on both, then left, then pan right on "Sağ eline"
  const toL = ss(T.sol - 0.6, T.sol + 0.4, t), toR = ss(T.sag - 0.2, T.sag + 0.8, t);
  const cx = lerp(lerp(0, -5, toL), 5, toR), cz = lerp(68, lerp(50, 48, toR), Math.max(toL, toR));
  look([cx, 12, cz], [cx * 0.95, 6.8, 0], 35, 0.7, t);
  const P = v => O.project(v, cam, W, H);
  // "zarar verir mi?" -> big question
  const qa = clamp((t - 37.6) / 0.35) * (1 - ss(T.birDoktor - 0.2, T.birDoktor + 0.1, t));
  ov.push(c => O.bigText(c, W, H, W * 0.5, H * 0.2, 'ARTRİT?', qa, { size: 0.15, color: '#ff6b5e' }));
  // counters
  const ya = clamp((t - T.altmis + 0.2) / 0.35);
  const yrs = Math.round(60 * ease.inOut(clamp((t - T.altmis) / (T.sag - T.altmis - 0.3))));
  ov.push(c => O.bigText(c, W, H, W * 0.5, H * 0.13, `${yrs} YIL`, ya, { size: 0.12 }));
  const [lx, ly] = P(new THREE.Vector3(-5.3, 3.5, 1)), [rx, ry] = P(new THREE.Vector3(5.3, 3.5, 1));
  const cr = Math.round(36500 * ease.inOut(clamp((t - T.altmis) / (T.sag - T.altmis - 0.3))));
  const ca = clamp((t - T.birDoktor - 0.3) / 0.35);
  ov.push(c => O.bigText(c, W, H, lx, H * 0.55, 'SOL EL', ca * (1 - toR), { size: 0.075, subSize: 0.6, sub: `${cr.toLocaleString('tr-TR')}${cr >= 36500 ? '+' : ''} ÇIT` }));
  ov.push(c => O.bigText(c, W, H, rx, H * 0.55, 'SAĞ EL', ca * (1 - toL * (1 - toR)), { size: 0.075, subSize: 0.6, sub: '0 ÇIT', subColor: '#9fd8ff' }));
  // small bursts on the left hand
  for (let k = 0; ; k++) { const tt = c0 + k * 0.62 + 0.31; if (tt > T.sag) break; if (Math.abs(t - tt) < 0.8) { const [px, py] = P(handL.joint(['I', 'M', 'R', 'P'][k % 4], 1)); ov.push(c => O.burst(c, W, H, px, py - H * 0.05, t, tt, 'ÇIT', 0.4, (k % 3 - 1) * 0.15)); } }
  return { scene: A.scene, fx: studioFx(cz, 44, { zoom: (1 - ss(37.45, 37.7, t)) * 0.25 }) };
}

// 9 — result: x-ray both hands, no arthritis; then the award
function shotResult(t, ov) {
  only(handR, handL); resetHand(handR); resetHand(handL);
  handL.group.position.set(-5.3, -1, 0); handL.group.rotation.set(-0.1, -0.15, 0.08);
  handR.group.position.set(5.3, -1, 0); handR.group.rotation.set(-0.1, 0.15, -0.08);
  handR.pose(RELAX); handL.pose(RELAX);
  const x = ss(T.iki - 0.25, T.iki + 0.25, t) * (1 - ss(T.buDeney - 0.3, T.buDeney + 0.2, t));
  handR.xray(x); handL.xray(x);
  const md = ss(T.buDeney - 0.25, T.buDeney + 0.2, t);
  look([0, 12, lerp(68, 62, ease.inOut(clamp((t - 47.6) / 6.4)))], [0, 6.8, 0], 35, 0.6, t);
  const P = v => O.project(v, cam, W, H);
  if (x > 0) for (const [h, d] of [[handL, 1], [handR, 2]]) {
    const ks = ['I', 'M', 'R', 'P'];
    ks.forEach((k, i) => { const [px, py] = P(h.joint(k, 0)); ov.push(c => O.check(c, W, H, px, py - H * 0.012, clamp((t - T.iki - 0.3 - i * 0.07 - d * 0.15) / 0.3) * clamp(x * 2) * 0.8)); });
    const [lx, ly] = P(new THREE.Vector3(h === handL ? -5.3 : 5.3, 20.5, 0));
    ov.push(c => O.bigText(c, W, H, lx, ly, 'ARTRİT YOK', clamp((t - T.iki - 0.6) / 0.35) * clamp(x * 2), { size: 0.065, color: '#5ef0a0' }));
  }
  if (md > 0) {
    medal.visible = true;
    const u = clamp((t - T.buDeney + 0.25) / 0.9);
    medal.position.set(0, lerp(26, 10.5, ease.outBack(u)), 8); medal.rotation.set(0.12, (1 - ease.out(clamp((t - T.buDeney + 0.25) / 1.6))) * Math.PI * 4 + Math.sin(t * 1.3) * 0.25, 0.05);
    medal.scale.setScalar(0.85);
    const la = clamp((t - T.odul) / 0.35);
    const [mx, my] = P(new THREE.Vector3(0, 6.5, 8));
    ov.push(c => O.bigText(c, W, H, mx, my + H * 0.03, 'IG NOBEL ÖDÜLÜ', la, { size: 0.07, color: '#ffd27a', sub: 'TIP · 2009', subColor: '#ffffff' }));
  }
  return { scene: A.scene, fx: studioFx(cam.position.z, 44, { exposure: 0.86 + md * 0.04, bloom: 0.28 + md * 0.25 }) };
}

// 10 — ending: crack again, the neighbour is not amused
function shotEnd(t, ov) {
  only(handR, handN); resetHand(handR); resetHand(handN);
  handR.group.position.set(3.6, -1.6, 6); handR.group.rotation.set(-0.15, 0.55, 0.12);
  handR.pose(t < 58.3 ? rollPose(t, 54.15, 0.12, 0.16) : mixP(FIST, { ...FIST, I: [100, 108, 55] }, ss(58.5, 58.85, t)));
  handN.group.position.set(-4.5, 2.5, -16); handN.group.rotation.set(-0.05, -0.45, -0.12);
  const clench = ease.inOut(clamp((t - T.sinir + 0.1) / 0.45));
  const tremble = clench * (Math.sin(t * 60) * 0.012 + Math.sin(t * 43) * 0.01);
  handN.group.rotation.z += tremble; handN.group.position.x += tremble * 6;
  handN.pose(mixP(RELAX, { ...FIST, T: [30, 30, 40, -10] }, clench));
  const rack = ss(T.ama - 0.2, T.ama + 0.5, t);
  look([7, 13, 44], [lerp(1.5, -1.5, rack), 6.5, lerp(2, -4, rack)], 35, 0.6, t);
  const dR = cam.position.distanceTo(new THREE.Vector3(3.6, 6, 6)), dN = cam.position.distanceTo(new THREE.Vector3(-4.5, 9, -16));
  const [nx, ny] = O.project(handN.joint('M', 0), cam, W, H);
  ov.push(c => O.label(c, W, H, [nx, ny], [nx + W * 0.06, ny - H * 0.13], 'YANINDAKİ', clamp((t - T.ama) / 0.4) * (1 - ss(58.2, 58.5, t)), '#ffd83a'));
  const [px, py] = O.project(handR.joint('I', 1), cam, W, H);
  ov.push(c => O.burst(c, W, H, px, py - H * 0.07, t, 58.85, 'ÇIT!', 0.9, 0.1));
  return { scene: A.scene, fx: studioFx(lerp(dR, dN, rack), 46, { zoom: (1 - ss(54.0, 54.25, t)) * 0.25, fade: ss(59.05, 59.15, t) }) };
}

// ---------------------------------------------------------------- frame
export function frame(t) {
  shotList ||= SHOTS();
  const s = shotList.find(s => t >= s.a && t < s.b) || shotList[shotList.length - 1];
  const ov = [];
  const r = s.f(t, ov);
  return { scene: r.scene, camera: cam, fx: r.fx, ov };
}
export function overlay(ctx, t, f) {
  if ((f.fx.fade || 0) > 0.5) return;                                     // the closing cut to black takes the text with it
  ctx.save(); ctx.scale(ctx.canvas.width / W, ctx.canvas.height / H);     // overlays are laid out in 1080x1920
  for (const d of f.ov) d(ctx);
  O.drawCaptions(ctx, W, H, chunks, t);
  ctx.restore();
}
