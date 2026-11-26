// anim.js — small deterministic animation helpers (everything is a pure function of time).
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const ease = {
  lin: t => t,
  inOut: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  outExpo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
  outBack: t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  outElastic: t => t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
};
// tween from a to b between times t0..t1 with easing
export const tw = (t, t0, t1, a, b, e = ease.inOut) => lerp(a, b, e(clamp((t - t0) / (t1 - t0))));
// keyframes: [[time, value], ...] (value may be a number or an array), eased between keys
export function keys(t, ks, e = ease.inOut) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 0; i < ks.length - 1; i++) {
    const [t0, a] = ks[i], [t1, b] = ks[i + 1];
    if (t <= t1) { const u = e(clamp((t - t0) / (t1 - t0))); return Array.isArray(a) ? a.map((x, k) => lerp(x, b[k], u)) : lerp(a, b, u); }
  }
  return ks[ks.length - 1][1];
}
// smooth 1D noise for handheld camera sway
export function noise1(x, seed = 0) {
  const h = n => { const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return s - Math.floor(s); };
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return (h(i) * (1 - u) + h(i + 1) * u) * 2 - 1;
}
// a decaying shake triggered at time t0
export const shake = (t, t0, amp = 1, dur = 0.5, freq = 28) => t < t0 || t > t0 + dur ? 0 : amp * Math.exp(-(t - t0) / dur * 4) * Math.sin((t - t0) * freq * 6.283);
