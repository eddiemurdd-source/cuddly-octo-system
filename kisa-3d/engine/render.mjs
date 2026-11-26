// render.mjs — frame-exact capture: Playwright calls window.render(t) for each frame and pipes PNGs into ffmpeg. 9:16, 1080x1920.
//   node render.mjs <story>                       full video -> stories/<story>/out/<name>.mp4 (muxes stories/<story>/audio/mix.wav if present)
//   node render.mjs <story> --cues                only writes stories/<story>/audio/cues.json (for audio/mix.py)
//   node render.mjs <story> --stills=1,5.5,12     contact sheet of chosen seconds -> stories/<story>/out/stills.jpg
//   options: --scale=0.5 (draft)  --from=s --to=s (a part)  --crf=17  --workers=2 (parallel browsers)
import fs from 'node:fs'; import path from 'node:path'; import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
import { startServer } from './serve.mjs';

const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/usr/local/lib/node_modules_global/playwright')); }
const here = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(3).map(a => a.replace(/^--/, '').split(/=(.*)/s)).map(([k, v]) => [k, v ?? '1']));
const story = process.argv[2] || 'citlatma';
const SD = path.join(here, '..', 'stories', story), OUT = path.join(SD, 'out'); fs.mkdirSync(OUT, { recursive: true });
const scale = +(args.scale || 1);
const { server, port } = await startServer();

async function openPage() {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined,
    args: ['--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });
  const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
  let failed = null; page.on('pageerror', e => { console.log('PAGEERROR', e.message); failed = e; });
  page.on('console', m => { if ((['error', 'warning'].includes(m.type()) || /^hand mesh/.test(m.text())) && !/GPU stall|ReadPixels/.test(m.text())) console.log('CONSOLE', m.text()); });
  await page.goto(`http://127.0.0.1:${port}/engine/index.html?story=${story}&capture=1&scale=${scale}${args.r3d ? '&r3d=' + args.r3d : ''}`, { waitUntil: 'load' });
  for (let i = 0; !(await page.evaluate(() => !!window.__ready)); i++) { if (failed || i > 600) throw new Error('page did not start: ' + (failed?.message || 'timeout')); await new Promise(r => setTimeout(r, 250)); }
  return { browser, page };
}
const grab = async (page, t) => {
  const url = await page.evaluate(t => window.render(t), t);
  return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
};

const first = await openPage();
const meta = await first.page.evaluate(() => window.__meta);
fs.mkdirSync(path.join(SD, 'audio'), { recursive: true });
fs.writeFileSync(path.join(SD, 'audio', 'cues.json'), JSON.stringify({ DUR: meta.DUR, cues: meta.CUES, lines: meta.LINES }, null, 1));
if (args.cues) { console.log('cues written'); await first.browser.close(); server.close(); process.exit(0); }

if (args.stills) {
  const times = args.stills.split(',').map(Number);
  const dir = path.join(OUT, 'stills'); fs.mkdirSync(dir, { recursive: true });
  const files = [];
  for (const t of times) { const t0 = Date.now(); const f = path.join(dir, `s_${t.toFixed(2)}.png`); fs.writeFileSync(f, await grab(first.page, t)); files.push(f); console.log(`still ${t}s  ${Date.now() - t0} ms`); }
  const cols = Math.min(files.length, +(args.cols || 4)), cw = 360, ch = 640;
  const inputs = files.flatMap(f => ['-i', f]);
  const lay = files.map((_, i) => `${(i % cols) * cw}_${Math.floor(i / cols) * ch}`).join('|');
  const sheet = path.join(OUT, args.name || 'stills.jpg');
  const scaleF = files.map((_, i) => `[${i}:v]scale=${cw}:${ch}[v${i}]`).join(';');
  const filt = files.length === 1 ? `[0:v]scale=${cw}:${ch}` : `${scaleF};${files.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${files.length}:layout=${lay}:fill=black`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filt, '-q:v', '3', sheet]);
  console.log('sheet', sheet);
} else {
  const FPS = meta.FPS, from = +(args.from || 0), to = +(args.to || meta.DUR), N = Math.round((to - from) * FPS);
  const name = args.name || meta.NAME + (scale !== 1 ? `_x${scale}` : '');
  const W = +(args.workers || 1);
  const pages = [first]; for (let i = 1; i < W; i++) pages.push(await openPage());
  const frames = path.join(OUT, 'frames_' + name); fs.rmSync(frames, { recursive: true, force: true }); fs.mkdirSync(frames, { recursive: true });
  const t1 = Date.now(); let done = 0;
  await Promise.all(pages.map(async ({ page }, w) => {
    for (let i = w; i < N; i += W) {
      fs.writeFileSync(path.join(frames, `f${String(i).padStart(5, '0')}.png`), await grab(page, from + i / FPS));
      if (++done % 30 === 0) process.stdout.write(`frame ${done}/${N}  ${((Date.now() - t1) / 1000).toFixed(0)} s\n`);
    }
  }));
  console.log(`${N} frames in ${((Date.now() - t1) / 1000).toFixed(1)} s`);
  const mix = path.join(SD, 'audio', 'mix.wav'), final = path.join(OUT, name + '.mp4');
  const aud = fs.existsSync(mix) && !args.mute ? ['-ss', String(from), '-t', String(to - from), '-i', mix, '-map', '0:v:0', '-map', '1:a:0', '-c:a', 'aac', '-b:a', '256k', '-shortest'] : [];
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(frames, 'f%05d.png'), ...aud,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(args.crf || 17), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', final], { stdio: 'inherit' });
  if (!args.keep) fs.rmSync(frames, { recursive: true, force: true });
  console.log('->', final);
  for (const p of pages.slice(1)) await p.browser.close();
}
await first.browser.close(); server.close();
