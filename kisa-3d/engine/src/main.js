// main.js — boots a story: renderer, post chain, 2D overlay (captions, labels). window.render(t) draws frame t and returns a PNG data URL.
import * as THREE from 'three';
import { makePost } from './post.js';

const q = new URLSearchParams(location.search);
const story = q.get('story') || 'citlatma', scale = +(q.get('scale') || 1), capture = q.has('capture');
const mod = await import(`/stories/${story}/story.js`);
// the 3D layer can render below the output size (r3d) and is scaled up; text and overlays are always drawn at full size
const W = Math.round(mod.W * scale), H = Math.round(mod.H * scale), R3 = +(q.get('r3d') || 1);
const GW = Math.round(W * R3 / 2) * 2, GH = Math.round(H * R3 / 2) * 2;
const gl = document.getElementById('gl'), out = document.getElementById('out');
gl.width = GW; gl.height = GH; out.width = W; out.height = H;
const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(GW, GH, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.autoClear = false;
const post = makePost(renderer, GW, GH);
const ctx = out.getContext('2d');
await Promise.all([document.fonts.load('900 40px Cap'), document.fonts.load('700 40px Lab')]);
const S = (await mod.init({ renderer, W: GW, H: GH, scale })) || mod;
ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';

window.render = t => {
  const P = window.__prof, m = k => { if (P) { const n = performance.now(); P[k] = n - (P._m ?? n); P._m = n; } };
  m('start');
  const f = S.frame(t); m('frame');
  post.render(f.scene, f.camera, { time: t, ...f.fx }); m('post');
  ctx.clearRect(0, 0, W, H); ctx.drawImage(gl, 0, 0, W, H); m('readback');
  S.overlay?.(ctx, t, f); m('overlay');
  const url = capture ? out.toDataURL(q.get('fmt') === 'jpg' ? 'image/jpeg' : 'image/png', 0.95) : null; m('encode');
  return url;
};
window.__meta = { FPS: mod.FPS, DUR: mod.DUR, NAME: mod.NAME, CUES: mod.CUES, LINES: mod.LINES };
window.__ready = true;
if (!capture) { const t0 = performance.now() - (+(q.get('t') || 0)) * 1000; const loop = () => { window.render(((performance.now() - t0) / 1000) % mod.DUR); requestAnimationFrame(loop); }; loop(); }
