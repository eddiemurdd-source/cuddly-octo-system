// bottle.js — a sealed glass soda bottle with gas dissolved in the drink (the "closed soda" comparison).
import * as THREE from 'three';
import { studio } from './studio.js';
import { mulberry } from '/engine/src/hand.js';

const lathe = (pts, seg = 72) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), seg);

export function makeBottle(renderer) {
  const S = studio(renderer); const scene = S.scene;
  S.backdrop.material.uniforms.uGlow.value.set(0x3a2a20);
  const g = new THREE.Group(); scene.add(g);
  // outer glass profile (cm): base, body, shoulder, neck, lip
  const outer = [[0, 0], [2.6, 0], [3.05, 0.35], [3.15, 1.2], [3.15, 10.5], [2.9, 12.2], [1.9, 14.6], [1.32, 16.6], [1.25, 19.6], [1.45, 19.8], [1.45, 20.6], [1.2, 20.75]];
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xa8dcbc, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 2.2, specularIntensity: 1 });
  const bottle = new THREE.Mesh(lathe(outer), glass); bottle.renderOrder = 5; g.add(bottle);
  const liquidProf = [[0, 0.3], [2.85, 0.3], [2.95, 1.2], [2.95, 10.5], [2.7, 12.2], [1.7, 14.6], [1.12, 16.4], [0.0, 16.4]];
  const liquid = new THREE.Mesh(lathe(liquidProf), new THREE.MeshPhysicalMaterial({ color: 0x7a3414, roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.88, depthWrite: false, envMapIntensity: 1.2, emissive: 0x2a0c04, emissiveIntensity: 0.6 }));
  liquid.renderOrder = 3; g.add(liquid);
  // crown cap
  const capMat = new THREE.MeshPhysicalMaterial({ color: 0xc8202a, metalness: 0.75, roughness: 0.3, clearcoat: 1, envMapIntensity: 1.4 });
  const capGeo = new THREE.CylinderGeometry(1.55, 1.72, 0.75, 21, 1); const pos = capGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i); const a = Math.atan2(z, x); const k = y < 0 ? 1 + 0.06 * Math.cos(a * 21) : 1; pos.setX(i, x * k); pos.setZ(i, z * k); }
  capGeo.computeVertexNormals();
  const cap = new THREE.Mesh(capGeo, capMat); cap.position.y = 20.95; cap.castShadow = true; g.add(cap);
  // label band
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#f2efe6'; x.fillRect(0, 0, 1024, 256); x.fillStyle = '#c8202a'; x.fillRect(0, 30, 1024, 196);
  x.fillStyle = '#fff'; x.font = '900 120px Cap, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('GAZOZ', 256, 132); x.fillText('GAZOZ', 768, 132);
  const lt = new THREE.CanvasTexture(c); lt.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(new THREE.CylinderGeometry(3.19, 3.19, 3.6, 72, 1, true), new THREE.MeshPhysicalMaterial({ map: lt, roughness: 0.45, clearcoat: 0.3 }));
  label.position.y = 6.2; label.rotation.y = -0.4; g.add(label);
  // dissolved gas, held in by the cap
  const N = 420, r = mulberry(9), p = new Float32Array(N * 3), sd = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) { const a = r() * 6.283, rr = Math.sqrt(r()) * 2.6, y = 0.6 + r() * 10.5; p.set([Math.cos(a) * rr, y, Math.sin(a) * rr], i * 3); sd.set([r(), r(), r(), r()], i * 4); }
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(p, 3)); gg.setAttribute('aSeed', new THREE.BufferAttribute(sd, 4));
  const dot = document.createElement('canvas'); dot.width = dot.height = 64; const d = dot.getContext('2d'); const gr = d.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); d.fillStyle = gr; d.fillRect(0, 0, 64, 64);
  const gm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uMap: { value: new THREE.CanvasTexture(dot) }, uScale: { value: 1000 } },
    vertexShader: `attribute vec4 aSeed; uniform float uTime, uScale; varying float vA;
      void main(){ vec3 q = position + vec3(sin(uTime * 1.3 + aSeed.x * 30.0), sin(uTime * 1.1 + aSeed.y * 40.0), cos(uTime * 1.7 + aSeed.z * 20.0)) * 0.12;
        vA = 0.45 + 0.55 * sin(uTime * (2.0 + aSeed.w * 4.0) + aSeed.x * 50.0);
        vec4 mv = modelViewMatrix * vec4(q, 1.0); gl_PointSize = 0.09 * uScale * (0.5 + aSeed.w) / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D uMap; varying float vA; void main(){ vec4 c = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vec3(1.0, 0.85, 0.65) * 1.3, c.a * vA * 0.7); }` });
  const gas = new THREE.Points(gg, gm); gas.renderOrder = 4; gas.frustumCulled = false; g.add(gas);
  return { scene, group: g, update(t, scale) { gm.uniforms.uTime.value = t; gm.uniforms.uScale.value = scale; g.rotation.y = t * 0.25; } };
}
