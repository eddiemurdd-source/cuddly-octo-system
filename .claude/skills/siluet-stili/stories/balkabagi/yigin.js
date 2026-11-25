// yigin.js : the pumpkin pile. Layout (circles packed in rows), and each pumpkin's path as a track of keys in WORLD time
// (story.js slows the world down for the collapse).
// A pumpkin is a billboard: a square card that turns to face the camera every frame, so it reads as a round thing from
// any angle; it rolls (turns in its own plane) by the distance it travels.
import { rng, lerp, smoother, clamp01 } from '/engine/src/layer.js';

// ------------------------------------------------------------------ layout
// circles: [x, y(centre), r]. A row sits in the hollows of the row below: the new centre is the upper intersection of
// the circles (x1, y1, r1 + r) and (x2, y2, r2 + r).
function nest(a, b, r) {
  const [x1, y1, r1] = a, [x2, y2, r2] = b, R1 = r1 + r, R2 = r2 + r;
  const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy);
  const k = (R1 * R1 - R2 * R2 + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, R1 * R1 - k * k));
  const mx = x1 + dx * k / d, my = y1 + dy * k / d;
  return [mx - dy * hh / d, my + dx * hh / d, r];
}
// front face of the pile: bottom row given by radii; the biggest sits in the bottom row (index BIG)
export const BOTTOM = [.27, .31, .29, .43, .3];
export const BIG = 3;
export function layout(seed = 4) {
  const R = rng(seed), rows = [];
  let x = -BOTTOM.reduce((a, r) => a + r, 0), row = [];
  for (const r of BOTTOM) { row.push([x + r, r, r]); x += 2 * r + .005; }
  rows.push(row);
  while (row.length > 1) {
    const nxt = [];
    for (let i = 0; i + 1 < row.length; i++) nxt.push(nest(row[i], row[i + 1], .25 + R() * .05));
    rows.push(nxt); row = nxt;
  }
  return rows;            // rows[0] bottom .. rows[4] top (one pumpkin)
}

// ------------------------------------------------------------------ tracks
// keys: [{ t, p:[x,y,z] }, { t0, t1, p:[x,y,z], arc (height of a hop), bounce (n small bounces at the end), ease }]
// A track holds its last position between moves. roll = -(distance travelled along x) / r (+ wobble from story.js).
export class Track {
  constructor(p, r) { this.r = r; this.k = [{ t: -1e9, p: p.slice() }]; this.end = p.slice(); this.endT = -1e9; }
  move(t0, t1, p, { arc = 0, bounce = 0, ease = 'smooth', spin = null } = {}) {
    this.k.push({ t0, t1, from: this.end.slice(), p: p.slice(), arc, bounce, ease, spin }); this.end = p.slice(); this.endT = t1; return this;
  }
  // ballistic fall from where it is: lands at p after dur seconds of free fall feel (arc = launch height)
  fall(t0, dur, p, opts = {}) { return this.move(t0, t0 + dur, p, { ease: 'fall', ...opts }); }
  at(t) {
    let p = this.k[0].p.slice();
    for (const k of this.k.slice(1)) {
      if (t <= k.t0) break;
      const u = clamp01((t - k.t0) / (k.t1 - k.t0)), F = k.from, P = k.p;
      if (k.ease === 'fall') {                     // gravity: the drop accelerates; with bounce, the last quarter hops and rolls on
        const ub = k.bounce ? Math.min(1, u / .75) : u, xl = k.bounce ? .85 : 1;
        p = [lerp(F[0], lerp(F[0], P[0], xl), ub), F[1] + (P[1] - F[1]) * ub * ub + k.arc * 4 * ub * (1 - ub), lerp(F[2], lerp(F[2], P[2], xl), ub)];
        if (k.bounce && u > .75) { const v = (u - .75) / .25; p = [lerp(lerp(F[0], P[0], xl), P[0], smoother(v)), P[1] + Math.abs(Math.sin(v * Math.PI * k.bounce)) * (1 - v) * .14, lerp(lerp(F[2], P[2], xl), P[2], smoother(v))]; }
      } else {
        const e = k.ease === 'lin' ? u : k.ease === 'out' ? 1 - (1 - u) * (1 - u) : k.ease === 'in' ? u * u : smoother(u);
        p = [lerp(F[0], P[0], e), lerp(F[1], P[1], e) + (k.arc || 0) * 4 * e * (1 - e), lerp(F[2], P[2], e)];
      }
      if (u >= 1) p = P.slice();
    }
    return { p, roll: -(p[0] - this.k[0].p[0]) / this.r };
  }
}
