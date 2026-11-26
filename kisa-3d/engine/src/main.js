// main.js — boots a story: renderer, post chain, 2D overlay (captions, labels). window.render(t) draws frame t and returns a PNG data URL.
import * as THREE from 'three';
import { makePost } from './post.js';

const q = new URLSearchParams(location.search);
const story = q.get('story') || 'citlatma', scale = +(q.get('scale') || 1), capture = q.has('capture');
const mod = await import(`/stories/${story}/story.js`);
const W = Math.round(mod.W * scale), H = Math.round(mod.H * scale);
const gl = document.getElementById('gl'), out = document.getElementById('out');
gl.width = W; gl.height = H; out.width = W; out.height = H;
const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.autoClear = false;
const post = makePost(renderer, W, H);
const ctx = out.getContext('2d');
await Promise.all([document.fonts.load('900 40px Cap'), document.fonts.load('700 40px Lab')]);
const S = (await mod.init({ renderer, W, H, scale })) || mod;

window.render = t => {
  const f = S.frame(t);
  post.render(f.scene, f.camera, { time: t, ...f.fx });
  ctx.clearRect(0, 0, W, H); ctx.drawImage(gl, 0, 0);
  S.overlay?.(ctx, t, f);
  return capture ? out.toDataURL('image/png') : null;
};
window.__meta = { FPS: mod.FPS, DUR: mod.DUR, NAME: mod.NAME, CUES: mod.CUES, LINES: mod.LINES };
window.__ready = true;
if (!capture) { const t0 = performance.now() - (+(q.get('t') || 0)) * 1000; const loop = () => { window.render(((performance.now() - t0) / 1000) % mod.DUR); requestAnimationFrame(loop); }; loop(); }
