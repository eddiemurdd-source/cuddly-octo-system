// hand.js — a procedural right hand: SDF -> surface nets mesh -> automatic skin weights -> SkinnedMesh.
// Units are centimetres. Wrist at the origin, fingers along +Y, back of the hand facing +Z, thumb on -X.
// Also builds the skeleton you see in x-ray (phalanges, metacarpals, carpals, radius, ulna) and the nails.
import * as THREE from 'three';
import { surfaceNets, sdRoundCone, sdEllipsoid, sdRoundBox, smin } from './sdfmesh.js';

const v3 = a => new THREE.Vector3(...a);
const add = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
const norm = a => { const l = Math.hypot(...a); return a.map(x => x / l); };
const deg = Math.PI / 180;

// ---------------------------------------------------------------- anatomy (cm)
const FINGERS = [
  { n: 'I', mcp: [-2.72, 9.05, 0.12], splay: 6.5, L: [4.0, 2.45, 1.95], R: [1.0, 0.9, 0.82, 0.74] },
  { n: 'M', mcp: [-0.9, 9.4, 0.16], splay: 1.5, L: [4.45, 2.8, 2.05], R: [1.04, 0.93, 0.84, 0.76] },
  { n: 'R', mcp: [0.92, 9.1, 0.12], splay: -4.5, L: [4.1, 2.65, 2.0], R: [0.98, 0.88, 0.8, 0.72] },
  { n: 'P', mcp: [2.62, 8.35, 0.02], splay: -11, L: [3.3, 1.95, 1.75], R: [0.86, 0.77, 0.69, 0.63] },
];
for (const f of FINGERS) {
  f.dir = norm([-Math.sin(f.splay * deg), Math.cos(f.splay * deg), 0]);
  f.nrm = [0, 0, 1];
  f.P = [f.mcp]; for (let s = 0; s < 3; s++) f.P.push(add(f.P[s], f.dir, f.L[s]));
}
const THUMB = { n: 'T', P: [[-2.25, 1.7, -0.55], [-4.7, 5.05, -1.3], [-5.9, 7.75, -1.7], [-6.55, 9.8, -1.9]], R: [1.42, 1.12, 1.0, 0.82] };
THUMB.dir = norm(add(THUMB.P[3], THUMB.P[1], -1));
{ // thumbnail faces outward and back: orthogonalise a guess against the thumb axis
  let n = [-0.78, 0.15, 0.6]; const d = THUMB.dir; const k = n[0] * d[0] + n[1] * d[1] + n[2] * d[2];
  THUMB.nrm = norm(add(n, d, -k));
}
THUMB.L = [0, 1, 2].map(s => Math.hypot(...add(THUMB.P[s + 1], THUMB.P[s], -1)));
const DIGITS = [...FINGERS, THUMB];

// ---------------------------------------------------------------- SDF parts
function palmD(x, y, z) {
  const f = 0.84 + 0.16 * Math.min(Math.max(y / 9, 0), 1);
  let d = sdRoundBox((x + 0.15) / f - 0.15, y, z, [-0.15, 4.4, -0.05], [2.8, 3.55, 0.36], 1.02);
  for (const F of FINGERS) d = smin(d, sdRoundCone(x, y, z, [F.mcp[0] * 0.45, 1.2, 0.2], add(F.mcp, [0, -0.15, 0.2]), 0.8, 0.97), 0.9);
  const fz = z * 1.55;
  d = smin(d, sdRoundCone(x, y, fz, [0, -9, 0], [0, 0.4, 0], 3.05, 2.8) / 1.25, 1.6);       // forearm, flattened
  d = smin(d, sdEllipsoid(x, y, z, [-2.45, 3.0, -0.8], [1.75, 2.35, 1.05]), 1.0);            // thenar
  d = smin(d, sdEllipsoid(x, y, z, [2.55, 3.4, -0.62], [1.25, 2.7, 0.8]), 0.9);             // hypothenar
  return Math.max(d, -(y + 6.8));                                                            // cut the forearm
}
const segD = (D, s, x, y, z) => {
  const zz = D === THUMB ? z : D.P[s][2] + (z - D.P[s][2]) * 1.1;                            // fingers slightly flattened
  return sdRoundCone(x, y, zz, D.P[s], D.P[s + 1], D.R[s], D.R[s + 1]);
};
function digitD(D, x, y, z) {
  let d = segD(D, 0, x, y, z);
  d = smin(d, segD(D, 1, x, y, z), 0.2);
  d = smin(d, segD(D, 2, x, y, z), 0.16);
  return d;
}
export function handSDF(x, y, z) {
  let d = palmD(x, y, z);
  for (const F of FINGERS) d = smin(d, digitD(F, x, y, z), 0.75);
  d = smin(d, digitD(THUMB, x, y, z), 1.0);
  return d;
}

// ---------------------------------------------------------------- build (geometry is shared by every hand)
let SHARED = null;
function buildShared() {
  const t0 = performance.now();
  const geo = surfaceNets(handSDF, [-8.4, -7.0, -3.7], [5.0, 20.4, 3.1], +(new URLSearchParams(location.search).get('voxel') || 0.105));
  // skin weights: bone 0 = palm/forearm, then 3 per finger, then 3 for the thumb
  const pos = geo.attributes.position.array, n = pos.length / 3;
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  const SIG = 0.42, ds = new Float32Array(16);
  for (let v = 0; v < n; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    ds[0] = palmD(x, y, z) + 0.12;
    DIGITS.forEach((D, di) => { for (let s = 0; s < 3; s++) ds[1 + di * 3 + s] = segD(D, s, x, y, z); });
    // a joint's skin follows the bone it belongs to: favour the distal side of a joint a little
    let mn = Infinity; for (let b = 0; b < 16; b++) mn = Math.min(mn, ds[b]);
    const w = []; for (let b = 0; b < 16; b++) w.push([b, Math.exp(-(ds[b] - mn) / SIG)]);
    w.sort((a, b) => b[1] - a[1]);
    const top = w.slice(0, 4), sum = top.reduce((s, q) => s + q[1], 0);
    top.forEach(([b, q], k) => { si[v * 4 + k] = b; sw[v * 4 + k] = q / sum; });
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  geo.computeBoundingSphere(); geo.boundingSphere.radius += 8;
  console.log(`hand mesh: ${n} verts, ${geo.index.count / 3} tris, ${(performance.now() - t0).toFixed(0)} ms`);
  SHARED = { geo, nail: nailGeometry(), bones: boneGeometries() };
}

// a nail: a grid bent onto a cylinder, rounded at the free edge
function nailGeometry() {
  const NU = 14, NV = 18, pos = [], uv = [], idx = [];
  for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
    const v = j / NV, u = i / NU * 2 - 1;
    const half = v > 0.7 ? Math.sqrt(Math.max(0, 1 - ((v - 0.7) / 0.32) ** 2)) : 0.92 + 0.08 * Math.sin(v / 0.7 * Math.PI / 2);
    const a = u * half * 0.95;                      // angle across the finger (radians around the axis)
    pos.push(Math.sin(a), v, Math.cos(a)); uv.push(u * 0.5 + 0.5, v);
  }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
    const a = j * (NU + 1) + i; idx.push(a, a + 1, a + NU + 2, a, a + NU + 2, a + NU + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}

// x-ray skeleton pieces: lathe profiles along +Y, length 1 (scaled per bone)
function boneGeometries() {
  const prof = (pts) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 20);
  const phal = prof([[0.001, 0], [0.42, 0.01], [0.55, 0.06], [0.52, 0.16], [0.33, 0.33], [0.29, 0.55], [0.33, 0.78], [0.45, 0.9], [0.44, 0.97], [0.3, 1.0], [0.001, 1.0]]);
  const tip = prof([[0.001, 0], [0.42, 0.01], [0.52, 0.08], [0.4, 0.25], [0.27, 0.5], [0.3, 0.75], [0.42, 0.88], [0.36, 0.97], [0.001, 1.0]]);
  const meta = prof([[0.001, 0], [0.38, 0.01], [0.48, 0.08], [0.3, 0.25], [0.24, 0.55], [0.3, 0.8], [0.46, 0.9], [0.5, 0.95], [0.38, 0.995], [0.001, 1.0]]);
  const longb = prof([[0.001, 0], [0.5, 0.0], [0.42, 0.3], [0.45, 0.8], [0.7, 0.95], [0.66, 0.995], [0.001, 1.0]]);
  return { phal, tip, meta, longb, carpal: new THREE.IcosahedronGeometry(1, 3) };
}

// ---------------------------------------------------------------- materials
export function skinMaterial(opts = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    color: opts.color || 0xc98468, roughness: 0.5, metalness: 0, sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffb59a),
    clearcoat: 0.12, clearcoatRoughness: 0.55, envMapIntensity: 0.55, transparent: true,
  });
  const J = [], JD = [];
  for (const D of DIGITS) for (let s = 0; s < 3; s++) { J.push(v3(D.P[s])); JD.push(v3(norm(add(D.P[Math.min(s + 1, 3)], D.P[s], -1)))); }
  m.userData.u = { uX: { value: 0 }, uRim: { value: opts.rim ?? 0.55 }, uRimColor: { value: new THREE.Color(opts.rimColor || 0xff6a4a) }, uXCol: { value: new THREE.Color(0xffd2bf) },
    uJ: { value: J }, uJD: { value: JD }, uBump: { value: 1 } };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, m.userData.u);
    sh.vertexShader = sh.vertexShader.replace('void main() {', 'varying vec3 vObj;\nvoid main() {').replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', `uniform float uX; uniform float uRim; uniform vec3 uRimColor; uniform vec3 uXCol; uniform vec3 uJ[15]; uniform vec3 uJD[15]; uniform float uBump;
      varying vec3 vObj;
      float hh(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float vn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(mix(hh(i), hh(i+vec3(1,0,0)), f.x), mix(hh(i+vec3(0,1,0)), hh(i+vec3(1,1,0)), f.x), f.y),
                   mix(mix(hh(i+vec3(0,0,1)), hh(i+vec3(1,0,1)), f.x), mix(hh(i+vec3(0,1,1)), hh(i+vec3(1,1,1)), f.x), f.y), f.z); }
      float skinH(vec3 p, out float knuck){
        float h = (vn(p * 9.0) - 0.5) * 0.35 + (vn(p * 26.0) - 0.5) * 0.18;
        knuck = 0.0;
        for (int i = 0; i < 15; i++) {
          vec3 q = p - uJ[i]; float a = dot(q, uJD[i]); vec3 perp = q - uJD[i] * a;
          bool thumb = i >= 12; float dors = thumb ? 1.0 : smoothstep(-0.2, 0.5, perp.z);
          float m = exp(-a * a / (thumb ? 0.25 : 0.12)) * dors * smoothstep(1.6, 0.6, length(perp));
          knuck = max(knuck, m * (i % 3 == 0 ? 0.5 : 1.0));
          h += m * (sin(a * 48.0 + vn(p * 5.0) * 4.0) * 0.5 + 0.5) * (i % 3 == 0 ? 0.35 : 1.0) * smoothstep(0.0, 0.5, 1.0 - abs(perp.x) / 1.2);
        }
        return h;
      }
      void main() {`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        float knuck; float hgt = skinH(vObj, knuck) * 0.012 * uBump;
        { vec3 vSigmaX = dFdx(-vViewPosition), vSigmaY = dFdy(-vViewPosition), vN = normal;
          vec3 R1 = cross(vSigmaY, vN), R2 = cross(vN, vSigmaX); float fDet = dot(vSigmaX, R1);
          vec3 vGrad = sign(fDet) * (dFdx(hgt) * R1 + dFdy(hgt) * R2);
          normal = normalize(abs(fDet) * vN - vGrad); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        { float k2; skinH(vObj, k2); float tipm = 0.0;
          diffuseColor.rgb *= mix(vec3(1.0), vec3(1.06, 0.86, 0.84), clamp(k2 * 0.8, 0.0, 1.0));
          diffuseColor.rgb *= 0.94 + 0.12 * vn(vObj * 2.3); }`)
      .replace('#include <opaque_fragment>', `
        float fres = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
        outgoingLight += uRimColor * pow(fres, 3.0) * uRim;                       // light bleeding through thin edges
        vec3 xc = mix(outgoingLight * 0.6, uXCol, 0.35) + uXCol * pow(fres, 2.0) * 0.9;
        outgoingLight = mix(outgoingLight, xc, uX);
        float a = mix(1.0, clamp(0.06 + 0.85 * pow(fres, 2.2), 0.0, 1.0), uX);
        gl_FragColor = vec4(outgoingLight, a * diffuseColor.a);`);
  };
  m.customProgramCacheKey = () => 'skin';
  return m;
}
const BONE_MAT = () => new THREE.MeshStandardMaterial({ color: 0xf1e7d4, roughness: 0.55, metalness: 0, emissive: 0x3a3025, emissiveIntensity: 0.4 });
const NAIL_MAT = () => new THREE.MeshPhysicalMaterial({ color: 0xd99a8a, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.25, envMapIntensity: 0.5, transparent: true });

// ---------------------------------------------------------------- one hand
export function makeHand({ left = false, color, rim, rimColor } = {}) {
  if (!SHARED) buildShared();
  const group = new THREE.Group();
  const root = new THREE.Bone(); root.name = 'root';
  const bones = [root], digit = {};
  for (const D of DIGITS) {
    let parent = root, prev = [0, 0, 0]; const list = [];
    for (let s = 0; s < 3; s++) {
      const b = new THREE.Bone(); b.name = D.n + s;
      b.position.set(D.P[s][0] - prev[0], D.P[s][1] - prev[1], D.P[s][2] - prev[2]);
      parent.add(b); bones.push(b); list.push(b); parent = b; prev = D.P[s];
    }
    const dir = v3(norm(add(D.P[3], D.P[0], -1))), n = v3(D.nrm);
    const axis = new THREE.Vector3().crossVectors(dir, n).normalize();
    digit[D.n] = { D, bones: list, axis, abd: n.clone() };
  }
  const skel = new THREE.Skeleton(bones);
  const skinMat = skinMaterial({ color, rim, rimColor });
  const mesh = new THREE.SkinnedMesh(SHARED.geo, skinMat);
  mesh.add(root); mesh.bind(skel); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  group.add(mesh);

  // nails
  const nailMat = NAIL_MAT();
  for (const D of DIGITS) {
    const b = digit[D.n].bones[2], L = D.L[2], rm = (D.R[2] + D.R[3]) / 2, zr = (D === THUMB ? rm : rm / 1.1) + 0.035;
    const nail = new THREE.Mesh(SHARED.nail, nailMat);
    const dir = v3(norm(add(D.P[3], D.P[2], -1))), n = v3(D.nrm), side = new THREE.Vector3().crossVectors(dir, n);
    const basis = new THREE.Matrix4().makeBasis(side, dir, n);
    nail.quaternion.setFromRotationMatrix(basis);
    nail.scale.set(rm * 0.86, L * 0.62, zr);
    nail.position.copy(dir.clone().multiplyScalar(L * 0.3));
    nail.castShadow = true; nail.renderOrder = 3;
    b.add(nail);
  }

  // x-ray skeleton
  const boneMat = BONE_MAT(), xbones = new THREE.Group(); const xb = [];
  const place = (geo, a, b, rad, parent, origin) => {
    const m = new THREE.Mesh(geo, boneMat), d = new THREE.Vector3().subVectors(v3(b), v3(a)), L = d.length();
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    m.scale.set(rad, L, rad); m.position.copy(v3(a)).sub(v3(origin)); parent.add(m); xb.push(m); return m;
  };
  const gap = 0.16;
  for (const D of DIGITS) {
    const list = digit[D.n].bones;
    for (let s = 0; s < 3; s++) {
      const dir = norm(add(D.P[s + 1], D.P[s], -1));
      const a = add(D.P[s], dir, gap * 0.5), b = add(D.P[s + 1], dir, s === 2 ? -D.R[3] * 0.55 : -gap * 0.5);
      place(s === 2 ? SHARED.bones.tip : SHARED.bones.phal, a, b, D.R[s] * (s === 2 ? 0.95 : 1.0), list[s], D.P[s]);
    }
    if (D !== THUMB) {   // metacarpal, fixed to the palm
      const end = add(D.P[0], D.dir, -gap * 0.5);
      place(SHARED.bones.meta, [D.mcp[0] * 0.5, 1.7, 0.0], end, 1.15, xbones, [0, 0, 0]);
    }
  }
  // carpals and forearm bones
  const crng = mulberry(7);
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(SHARED.bones.carpal, boneMat);
    m.position.set(-2.1 + (i % 4) * 1.35 + crng() * 0.25, 0.55 + Math.floor(i / 4) * 0.85 + crng() * 0.2, -0.1 + crng() * 0.2);
    m.scale.set(0.62 + crng() * 0.2, 0.5 + crng() * 0.15, 0.55);
    if (i === 8) m.position.set(-2.3, 1.3, -0.5);
    xbones.add(m); xb.push(m);
  }
  place(SHARED.bones.longb, [-1.3, -9, -0.1], [-1.35, 0.05, -0.1], 1.25, xbones, [0, 0, 0]);   // radius (thumb side)
  place(SHARED.bones.longb, [1.5, -9, -0.15], [1.6, -0.25, -0.15], 0.95, xbones, [0, 0, 0]);   // ulna
  root.add(xbones);
  for (const m of xb) { m.visible = false; m.castShadow = false; m.renderOrder = 1; }

  if (left) group.scale.x = -1;

  const api = {
    group, mesh, skel, digit, root, skinMat, nailMat, boneMat, xbones: xb,
    // pose: { I: [mcp, pip, dip, abd], M: …, R: …, P: …, T: [cmc, mcp, ip, abd] } in degrees of flexion
    pose(P = {}) {
      for (const k of Object.keys(digit)) {
        const a = P[k] || [0, 0, 0, 0], d = digit[k];
        d.bones.forEach((b, s) => {
          b.quaternion.setFromAxisAngle(d.axis, -(a[s] || 0) * deg);
          if (s === 0 && a[3]) b.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(d.abd, a[3] * deg));
        });
      }
    },
    xray(x) {
      skinMat.userData.u.uX.value = x; skinMat.depthWrite = x < 0.35;
      nailMat.opacity = 1 - Math.min(1, x * 1.6); nailMat.depthWrite = x < 0.35;
      for (const m of xb) m.visible = x > 0.02;
      boneMat.emissiveIntensity = 0.4 + x * 0.6;
    },
    // world position of a joint (digit k, joint index 0..3) — for labels and effects
    joint(k, j) {
      const d = digit[k]; group.updateMatrixWorld(true);
      if (j < 3) return new THREE.Vector3().setFromMatrixPosition(d.bones[j].matrixWorld);
      const tip = v3(add(d.D.P[3], d.D.P[2], -1)); return tip.applyMatrix4(d.bones[2].matrixWorld);
    },
  };
  api.pose({}); api.xray(0);
  return api;
}

export function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const ANATOMY = { FINGERS, THUMB };
