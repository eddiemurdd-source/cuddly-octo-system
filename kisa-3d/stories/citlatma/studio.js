// studio.js — the "outside" world: a dark studio backdrop with soft bokeh, three-point light, environment reflections.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const pad = b => [...b, ...Array(12 - b.length).fill([0, 0, 0.01, 0, 0])];   // GLSL arrays are uploaded at their declared size

export function backdrop({ top, bottom, glow, glowPos = [0, 0.15], bokeh = [], fibers = 0, radius = 400 }) {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uTop: { value: new THREE.Color(top) }, uBot: { value: new THREE.Color(bottom) }, uGlow: { value: new THREE.Color(glow) },
      uGlowPos: { value: new THREE.Vector2(...glowPos) }, uFib: { value: fibers }, uTime: { value: 0 }, uBright: { value: 1 },
      uBok: { value: pad(bokeh).map(b => new THREE.Vector4(...b)) }, uBokCol: { value: pad(bokeh).map(b => new THREE.Color(b[4] ?? 0xffd9a0)) }, uNB: { value: bokeh.length } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position.z = gl_Position.w * 0.99999; }',
    fragmentShader: `
      uniform vec3 uTop, uBot, uGlow; uniform vec2 uGlowPos; uniform float uFib, uTime, uBright; uniform vec4 uBok[12]; uniform vec3 uBokCol[12]; uniform int uNB;
      varying vec3 vDir;
      float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hh(i), hh(i+vec2(1,0)), f.x), mix(hh(i+vec2(0,1)), hh(i+vec2(1,1)), f.x), f.y); }
      void main(){
        vec3 d = normalize(vDir);
        vec2 sp = vec2(atan(d.x, -d.z), asin(clamp(d.y, -1., 1.)));     // azimuth, elevation (looking down -Z is 0,0)
        vec3 c = mix(uBot, uTop, smoothstep(-0.6, 0.7, sp.y));
        c += uGlow * exp(-dot(sp - uGlowPos, sp - uGlowPos) * 3.0);
        if (uFib > 0.0) {   // soft tissue fibres for the inside-the-body shots
          float f = vn(vec2(sp.x * 6.0 + sp.y * 2.0, sp.y * 26.0 + vn(sp * 4.0) * 3.0));
          f = smoothstep(0.35, 0.95, f) * (0.6 + 0.4 * vn(sp * 9.0 + uTime * 0.05));
          c *= 1.0 + (f - 0.35) * uFib;
        }
        for (int i = 0; i < 12; i++) { if (i >= uNB) break;
          vec2 q = sp - uBok[i].xy; float r = uBok[i].z;
          float disc = smoothstep(r, r * 0.86, length(q)) * (0.75 + 0.25 * smoothstep(r * 0.5, r, length(q)));
          c += uBokCol[i] * disc * uBok[i].w; }
        gl_FragColor = vec4(c * uBright, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), m);
  mesh.frustumCulled = false; mesh.renderOrder = -10;
  return mesh;
}

export function studio(renderer) {
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.8;
  const bd = backdrop({
    top: 0x141b26, bottom: 0x07090d, glow: 0x283548, glowPos: [0, 0.12],
    bokeh: [[-0.5, 0.35, 0.07, 0.35, 0xffc58a], [0.42, 0.28, 0.05, 0.25, 0x8ab8ff], [0.25, -0.12, 0.09, 0.18, 0xffb070], [-0.3, -0.2, 0.06, 0.15, 0x9fc4ff],
      [0.62, 0.55, 0.08, 0.2, 0xffd6a8], [-0.7, 0.05, 0.05, 0.2, 0xff9e7a], [0.05, 0.6, 0.045, 0.15, 0xc8dcff]],
  });
  scene.add(bd);
  const key = new THREE.DirectionalLight(0xfff0dd, 2.1); key.position.set(-8, 14, 16); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 80 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.04; key.shadow.radius = 3;
  key.target.position.set(0, 8, 0); scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0x9ab8ff, 0.55); fill.position.set(12, 3, 8); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xff8a60, 2.4); rim.position.set(5, 9, -12); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0x88aaff, 1.0); rim2.position.set(-10, 4, -8); scene.add(rim2);
  scene.add(new THREE.HemisphereLight(0x8899aa, 0x2a1d1d, 0.45));
  return { scene, key, fill, rim, backdrop: bd };
}
