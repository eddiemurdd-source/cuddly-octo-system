// joint.js — the macro set: a finger joint in cutaway. Metacarpal head below, phalanx base above, cartilage caps,
// a capsule opened toward the camera, synovial fluid, dissolved gas, and the cavitation bubble.
// state(t-driven): { capsule 0..1, fluid 0..1, gas 0..1, pull 0..1, bubble 0..1+, dissolve 0..1 }
import * as THREE from 'three';
import { backdrop } from './studio.js';
import { mulberry } from '/engine/src/hand.js';

const HEAD_R = 1.6, HEAD_C = -1.6;          // metacarpal head: sphere radius and centre (y)
const GAP0 = 0.24, PULL = 0.95;             // resting joint space, extra space when pulled

function noiseBump(mat, freq = 7, amp = 0.012, key = 'bump') {
  mat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('void main() {', 'varying vec3 vObj;\nvoid main() {').replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', `varying vec3 vObj;
      float hh(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float vn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(mix(hh(i), hh(i+vec3(1,0,0)), f.x), mix(hh(i+vec3(0,1,0)), hh(i+vec3(1,1,0)), f.x), f.y),
                   mix(mix(hh(i+vec3(0,0,1)), hh(i+vec3(1,0,1)), f.x), mix(hh(i+vec3(0,1,1)), hh(i+vec3(1,1,1)), f.x), f.y), f.z); }
      void main() {`).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        float hgt = ((vn(vObj * ${freq.toFixed(2)}) - 0.5) + (vn(vObj * ${(freq * 3.1).toFixed(2)}) - 0.5) * 0.45) * ${amp.toFixed(4)};
        { vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition), n0 = normal; vec3 R1 = cross(sy, n0), R2 = cross(n0, sx); float det = dot(sx, R1);
          normal = normalize(abs(det) * n0 - sign(det) * (dFdx(hgt) * R1 + dFdy(hgt) * R2)); }`);
  };
  mat.customProgramCacheKey = () => key;
  return mat;
}

const lathe = (pts, seg = 64, phiStart = 0, phiLen = Math.PI * 2) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), seg, phiStart, phiLen);
const arc = (cy, R, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [R * Math.cos(a), cy + R * Math.sin(a)]; });

function fibreTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 512, 512); const r = mulberry(5);
  for (let i = 0; i < 260; i++) {
    const x = r() * 512, w = 1 + r() * 4; g.strokeStyle = `rgba(${150 + r() * 60},${60 + r() * 40},${70 + r() * 30},${0.15 + r() * 0.3})`; g.lineWidth = w;
    g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - 0.5) * 60, 170, x + (r() - 0.5) * 60, 340, x + (r() - 0.5) * 30, 512); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}

export function makeJoint(renderer) {
  const scene = new THREE.Scene();
  scene.environment = null;
  const bd = backdrop({ top: 0x5a1414, bottom: 0x1a0406, glow: 0x7a2a1e, glowPos: [0, 0.1], fibers: 0.9 });
  scene.add(bd);
  const key = new THREE.DirectionalLight(0xffe6d0, 2.6); key.position.set(-6, 8, 10); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff7a6a, 2.4); rim.position.set(6, 3, -9); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffb4a0, 0.6); fill.position.set(8, -4, 6); scene.add(fill);
  scene.add(new THREE.HemisphereLight(0xffc0b0, 0x401010, 0.55));
  const glowL = new THREE.PointLight(0xfff0b0, 0, 9, 1.6); glowL.position.set(0, 0.2, 0.6); scene.add(glowL);
  const pm = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene(); envScene.add(backdrop({ top: 0xb04040, bottom: 0x300808, glow: 0xffd0b0, glowPos: [-0.4, 0.5], radius: 50 }));
  scene.environment = pm.fromScene(envScene, 0.02).texture;

  const boneMat = noiseBump(new THREE.MeshPhysicalMaterial({ color: 0xeadcc4, roughness: 0.62, clearcoat: 0.25, clearcoatRoughness: 0.6, side: THREE.DoubleSide, envMapIntensity: 0.6 }), 4.5, 0.02, 'bone');
  const cartMat = new THREE.MeshPhysicalMaterial({ color: 0xcfe0f0, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.1, side: THREE.DoubleSide, envMapIntensity: 1.2, transparent: true, opacity: 0.92, sheen: 0.5, sheenColor: new THREE.Color(0x9fc8ff) });

  // metacarpal (static) — shaft, neck flare, round head
  const meta = new THREE.Group(); scene.add(meta);
  const metaProf = [[0.0, -10], [1.02, -10], [1.0, -5.0], [1.08, -3.4], [1.38, -2.6], ...arc(HEAD_C, HEAD_R, -0.32, Math.PI / 2, 24)];
  meta.add(new THREE.Mesh(lathe(metaProf), boneMat));
  const cartHead = new THREE.Mesh(lathe(arc(HEAD_C, HEAD_R + 0.07, 0.62, Math.PI / 2, 20)), cartMat); meta.add(cartHead);

  // phalanx (moves up when pulled) — concave base cup concentric with the head
  const phal = new THREE.Group(); scene.add(phal);
  const RC = HEAD_R + GAP0;
  const cup = arc(HEAD_C, RC, Math.PI / 2, 0.86, 20);                   // from the axis outward
  const phalProf = [...cup, [1.52, -0.05], [1.6, 0.3], [1.5, 0.9], [1.12, 2.2], [0.96, 4.0], [0.98, 10], [0.0, 10]];
  phal.add(new THREE.Mesh(lathe(phalProf), boneMat));
  const cartCup = new THREE.Mesh(lathe(arc(HEAD_C, RC - 0.06, Math.PI / 2, 0.9, 20)), cartMat); phal.add(cartCup);

  // capsule: a sleeve from the metacarpal neck to the phalanx base, rebuilt every frame as it stretches
  const fib = fibreTexture();
  const capMat = new THREE.MeshPhysicalMaterial({ color: 0xd27a78, map: fib, roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.25, side: THREE.DoubleSide, transparent: true, opacity: 0.85, envMapIntensity: 0.9, sheen: 0.6, sheenColor: new THREE.Color(0xffb0a0), depthWrite: true });
  const ghostMat = new THREE.MeshPhysicalMaterial({ color: 0xe08a88, roughness: 0.3, clearcoat: 1, side: THREE.DoubleSide, transparent: true, opacity: 0.1, depthWrite: false, envMapIntensity: 1 });
  const fluidMat = new THREE.MeshPhysicalMaterial({ color: 0xf2d27a, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.3, depthWrite: false, envMapIntensity: 1.6, emissive: 0x806020, emissiveIntensity: 0.25, side: THREE.FrontSide });
  const OPEN = 1.25;                                                    // half-angle of the cut window facing the camera
  const capsule = new THREE.Mesh(new THREE.BufferGeometry(), capMat), ghost = new THREE.Mesh(new THREE.BufferGeometry(), ghostMat), fluid = new THREE.Mesh(new THREE.BufferGeometry(), fluidMat);
  capsule.renderOrder = 2; ghost.renderOrder = 4; fluid.renderOrder = 3;
  scene.add(capsule, ghost, fluid);
  const capProfile = (gap, suck) => {
    const top = gap - GAP0, pts = [];
    for (let i = 0; i <= 24; i++) {
      const u = i / 24, y = -2.75 + u * (2.75 + 1.45 + top);
      const bulge = Math.sin(u * Math.PI);
      pts.push([1.3 + bulge * (0.95 - suck * 0.42) + 0.08 * Math.sin(u * 19), y]);
    }
    return pts;
  };

  // dissolved gas: points that drift, and get pulled into the bubble
  const NG = 520, rng = mulberry(21), gp = new Float32Array(NG * 3), gs = new Float32Array(NG * 4);
  for (let i = 0; i < NG; i++) {
    let x, y, z, ok = false;
    while (!ok) {
      y = -2.4 + rng() * 4.0; const a = rng() * Math.PI * 2, r = 0.2 + Math.sqrt(rng()) * 2.0; x = Math.cos(a) * r; z = Math.sin(a) * r;
      const dh = Math.hypot(x, y - HEAD_C, z);
      const inBone = (y < HEAD_C && Math.hypot(x, z) < 1.45) || dh < HEAD_R + 0.04 || (y > -0.2 && Math.hypot(x, z) < 1.5 && dh > RC - 0.02);
      ok = !inBone && Math.hypot(x, z) < 1.3 + Math.sin(((y + 2.75) / 4.2) * Math.PI) * 0.9;
    }
    gp.set([x, y, z], i * 3); gs.set([rng(), rng(), rng(), rng()], i * 4);
  }
  const gGeo = new THREE.BufferGeometry(); gGeo.setAttribute('position', new THREE.BufferAttribute(gp, 3)); gGeo.setAttribute('aSeed', new THREE.BufferAttribute(gs, 4));
  const gMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 }, uPull: { value: 0 }, uEmit: { value: 0 }, uCenter: { value: new THREE.Vector3(0, 0.3, 0) }, uSize: { value: 0.08 }, uScale: { value: 1000 }, uMap: { value: dotTexture() }, uLift: { value: 0 } },
    vertexShader: `
      attribute vec4 aSeed; uniform float uTime, uPull, uEmit, uSize, uScale, uLift; uniform vec3 uCenter; varying float vA;
      void main(){
        vec3 p = position; p.y += uLift * smoothstep(-0.3, 0.5, p.y);
        float t = uTime * (0.25 + aSeed.x * 0.35);
        p += vec3(sin(t * 3.1 + aSeed.y * 40.0), sin(t * 2.3 + aSeed.z * 50.0), cos(t * 2.7 + aSeed.w * 30.0)) * 0.09;
        float k = clamp((uPull - aSeed.x * 0.75) / 0.25, 0.0, 1.0);          // each bubble of gas leaves at its own moment
        float e = clamp((uEmit - aSeed.y * 0.8) / 0.2, 0.0, 1.0);            // ... and comes back during dissolution
        float away = k * (1.0 - e);
        vec3 q = mix(p, uCenter + normalize(p - uCenter + 0.001) * 0.15, away * away);
        vA = (1.0 - smoothstep(0.75, 1.0, away)) * (0.55 + 0.45 * sin(uTime * (3.0 + aSeed.z * 5.0) + aSeed.w * 30.0));
        vec4 mv = modelViewMatrix * vec4(q, 1.0);
        gl_PointSize = uSize * uScale * (0.6 + aSeed.w * 0.8) / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform sampler2D uMap; uniform float uAlpha; varying float vA;
      void main(){ vec4 c = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vec3(0.85, 0.95, 1.0) * 1.6, c.a * vA * uAlpha); }`,
  });
  const gas = new THREE.Points(gGeo, gMat); gas.renderOrder = 6; gas.frustumCulled = false; scene.add(gas);

  // the bubble: fresnel shell with a wobbling surface
  const bubMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uWob: { value: 0 }, uA: { value: 1 } },
    vertexShader: `uniform float uTime, uWob; varying vec3 vN, vV;
      void main(){ vec3 p = position;
        float w = sin(p.x * 5.0 + uTime * 9.0) * sin(p.z * 4.0 + uTime * 7.0) + sin(p.y * 6.0 - uTime * 11.0) * 0.5;
        p *= 1.0 + w * 0.06 * uWob;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uA; varying vec3 vN, vV;
      void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.2);
        vec3 L = normalize(vec3(-0.5, 0.7, 0.6)); float s = pow(max(dot(reflect(-L, vN), vV), 0.0), 60.0);
        vec3 c = vec3(0.9, 0.97, 1.0) * (0.15 + f * 1.8) + s * 4.0;
        gl_FragColor = vec4(c, clamp((0.08 + f * 0.95 + s) * uA, 0.0, 1.0)); }`,
  });
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), bubMat); bubble.renderOrder = 7; scene.add(bubble);
  // shock ring at the moment of the pop
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xfff3d8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.0, 96), ringMat); ring.renderOrder = 8; scene.add(ring);

  const api = {
    scene, key, glowL, backdrop: bd, gas, bubble, phal, meta,
    anchors: {
      capsule: () => new THREE.Vector3(-2.05, -0.6, -0.3), fluid: () => new THREE.Vector3(1.55, -1.0, 0.85),
      cart: () => new THREE.Vector3(0.75, -0.25, 1.05), bone: () => new THREE.Vector3(-0.55, -4.5, 0.85),
      bubble: () => bubble.position.clone().add(new THREE.Vector3(-0.35, 0, 0.6)),
      gas: () => new THREE.Vector3(0.85, 0.85, 1.35),
    },
    // s: { capsule, fluid, gas, pull, bubble, dissolve, ring } all 0..1
    update(t, s) {
      const pull = s.pull ?? 0, gap = GAP0 + pull * PULL;
      phal.position.y = pull * PULL;
      const prof = capProfile(gap, pull * (1 - (s.bubble ?? 0) * 0.7));
      capsule.geometry.dispose(); capsule.geometry = lathe(prof, 72, OPEN, Math.PI * 2 - OPEN * 2);
      ghost.geometry.dispose(); ghost.geometry = lathe(prof, 36, -OPEN, OPEN * 2);
      fluid.geometry.dispose(); fluid.geometry = lathe(prof.map(([r, y]) => [r * 0.93, y]), 72);
      const cap = s.capsule ?? 1;
      capsule.visible = cap > 0.01; capMat.opacity = 0.85 * cap; ghostMat.opacity = 0.1 * cap; ghost.visible = cap > 0.01;
      capsule.scale.setScalar(0.9 + 0.1 * cap); ghost.scale.copy(capsule.scale);
      const fl = s.fluid ?? 0; fluid.visible = fl > 0.01; fluidMat.opacity = 0.3 * fl; fluidMat.emissiveIntensity = 0.25 * fl;
      glowL.intensity = 3 * fl;
      gMat.uniforms.uTime.value = t; gMat.uniforms.uAlpha.value = s.gas ?? 0; gMat.uniforms.uPull.value = s.gasPull ?? 0; gMat.uniforms.uEmit.value = s.dissolve ?? 0;
      gMat.uniforms.uCenter.value.set(0, phal.position.y + 0.12, 0); gMat.uniforms.uLift.value = phal.position.y;
      const b = s.bubble ?? 0; bubble.visible = b > 0.001;
      const by = HEAD_C + HEAD_R + 0.07 + (gap - 0.07) * 0.5;
      bubble.position.set(0, by + 0.02, 0);
      bubble.scale.set(1.05 * b, Math.max(0.05, (gap - 0.1) * 0.62) * b, 1.05 * b);
      bubMat.uniforms.uTime.value = t; bubMat.uniforms.uWob.value = s.wobble ?? 0; bubMat.uniforms.uA.value = s.bubbleA ?? 1;
      const r = s.ring ?? 0; ring.visible = r > 0 && r < 1; ring.position.copy(bubble.position); ring.scale.setScalar(0.6 + r * 6); ringMat.opacity = (1 - r) * 0.8;
      bd.material.uniforms.uTime.value = t;
    },
  };
  api.update(0, {});
  return api;
}
