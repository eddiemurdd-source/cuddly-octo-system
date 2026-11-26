// prof.mjs — time each stage (scene, dof, bloom, final, overlay+png) for a few frames:  node prof.mjs <story> t1,t2,... [scale]
import { createRequire } from 'node:module'; import { startServer } from './serve.mjs';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const [story, ts, scale = '1', extra = ''] = process.argv.slice(2);
const { server, port } = await startServer();
const b = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const p = await b.newPage(); await p.goto(`http://127.0.0.1:${port}/engine/index.html?story=${story}&capture=1&scale=${scale}${extra}`);
await p.waitForFunction(() => window.__ready, null, { timeout: 120000 });
for (const t of ts.split(',').map(Number)) {
  const r = await p.evaluate(t => { window.__prof = {}; window.__gprof = {}; const t0 = performance.now(); window.render(t); const all = performance.now() - t0; const P = window.__prof; delete P._m; delete P.start; window.__prof = null; const G = window.__gprof; delete G._t; window.__gprof = null; return { ...P, ...Object.fromEntries(Object.entries(G).map(([k, v]) => ['g_' + k, v])), total: all }; }, t);
  console.log(t, Object.entries(r).map(([k, v]) => `${k} ${v.toFixed(0)}`).join('  '));
}
await b.close(); server.close();
