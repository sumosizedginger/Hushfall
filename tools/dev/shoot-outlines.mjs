// Outline-readability stills (appearance evidence, not correctness): the SAME fixed viewpoints every run, so a before/after pair differs only by the post pass.
// Environment views from the shipped maps plus enemy rows (a Tollbearer, Bellhand, Gaunt and Sexton moved in front of the camera at 4-13 m, in chase, mid-stride) against the real walls.
// Usage: node tools/dev/shoot-outlines.mjs <out-dir> [scene-name]      e.g. review/outlines/before
import { savePng } from './savepng.mjs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const root = path.resolve(import.meta.dirname, '../..');
const out = path.resolve(process.argv[2] ?? path.join(root, 'review/outlines/now')), only = process.argv[3];
fs.mkdirSync(out, { recursive: true });
const ROW = [['tollbearer', 4, -1.0], ['bellhand', 7, 1.2], ['gaunt', 10, -0.4], ['sexton', 13, 0.9]];     // [kind, metres ahead, metres to the side]
const SCENES = [
  { id: 'C1E1M02', name: 'm02-hall-entry', x: 23.5, z: 43.5, yaw: 'east', open: true },
  { id: 'C1E1M02', name: 'm02-gallery-up', x: 26, z: 45.5, yaw: 0.55, pitch: 0.22, open: true },
  { id: 'C1E1M02', name: 'm02-west-stairs', x: 24, z: 37, yaw: 'north', pitch: 0.1, open: true },
  { id: 'C1E1M02', name: 'm02-library-closeup', x: 23.5, z: 43.5, yaw: 'east', open: true, row: [['tollbearer', 2.8, 0.15]] },
  { id: 'C1E1M02', name: 'm02-hall-enemies', x: 23.5, z: 43.5, yaw: 'east', open: true, row: ROW },
  { id: 'C1E1M02', name: 'm02-dais-enemies', x: 40, z: 14, yaw: -1.0, open: true, row: ROW },
  { id: 'C1E1M04', name: 'm04-shop', x: 6.5, z: 14.5, yaw: 'east' },
  { id: 'C1E1M04', name: 'm04-wading', x: 19.5, z: 28.5, yaw: 'east' },
  { id: 'C1E1M04', name: 'm04-shop-enemies', x: 6.5, z: 14.5, yaw: 'east', row: ROW },
  { id: 'C1E1M05', name: 'm05-terrace-one', x: 8.5, z: 47.5, yaw: 'east' },
  { id: 'C1E1M05', name: 'm05-terrace-enemies', x: 8.5, z: 47.5, yaw: 'east', row: ROW },
  { id: 'C1E1M08', name: 'm08-chamber', x: 38.5, z: 31.5, yaw: 1.2, open: true, wake: true, ticks: 10 },
  { id: 'C1E1M08', name: 'm08-ring-node', x: 28.5, z: 31.5, yaw: 'south', open: true },
];
const YAW = { east: -Math.PI / 2, west: Math.PI / 2, north: 0, south: Math.PI };
const port = 5290 + (process.pid % 20);
const server = await createServer({ root, logLevel: 'error', server: { port, strictPort: false } });
await server.listen();
const actualPort = server.config.server.port;
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:${actualPort}/${process.env.OUTLINE === 'classic' ? '?outline=classic' : ''}`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
let loaded = null; const metrics = {}, enemyInk = {};
/** ink share INSIDE an enemy's drawn body: its screen box shrunk by 20% on every side (the silhouette lives on the rim; creases would show here). Same 1280x720 frame as the mask. */
const bodyInk = (buf, r) => { const png = PNG.sync.read(buf), w = png.width, h = png.height, x0 = Math.round((r.x0 + 0.2 * (r.x1 - r.x0)) * w), x1 = Math.round((r.x1 - 0.2 * (r.x1 - r.x0)) * w), y0 = Math.round((r.y0 + 0.2 * (r.y1 - r.y0)) * h), y1 = Math.round((r.y1 - 0.2 * (r.y1 - r.y0)) * h); let ink = 0, n = 0; for (let y = Math.max(0, y0); y < Math.min(h, y1); y++) for (let x = Math.max(0, x0); x < Math.min(w, x1); x++) { n++; if (png.data[(y * w + x) * 4] > 128) ink++; } return n < 200 ? null : +(ink / n).toFixed(4); };
/** share of pixels that carry ink, over the 3D view without the HUD strips and the weapon model (the same window every run) */
const inkShare = (buf) => { const png = PNG.sync.read(buf); let ink = 0, n = 0; for (let y = 60; y < png.height - 80; y++) for (let x = 0; x < png.width; x++) { if (x > 680 && y > 440) continue; n++; if (png.data[(y * png.width + x) * 4] > 128) ink++; } return +(ink / n).toFixed(4); };
for (const s of SCENES) {
  if (only && s.name !== only) continue;
  if (loaded !== s.id) { await T(`t.newGame('normal', 3, { mapId: '${s.id}' })`); await T('t.clearOverlays()'); loaded = s.id; }
  else await T('t.setup_player({ hp: 100000 })');
  if (s.open) await T('t.setup_openDoors()');
  const yaw = typeof s.yaw === 'string' ? YAW[s.yaw] : s.yaw;
  await T(`t.setup_teleport(${s.x * 2}, ${s.z * 2}, ${yaw}); t.setup_player({ pitch: ${s.pitch ?? 0}, hp: 100000, hurt: 0 })`);
  if (s.wake) await T('t.setup_wakeAll()');
  if (s.ticks) await T(`t.tick(${s.ticks})`);
  let placed = [];
  if (s.row) {
    // fwd = (-sin yaw, -cos yaw), right = (cos yaw, -sin yaw); an enemy faces the camera when its own yaw equals the camera yaw. One tick lets the sim settle their y; then they are posed mid-stride.
    await T(`const p = t.state().player, b = t.enemyBounds(), used = new Set(); for (const [kind, ahead, side] of ${JSON.stringify(s.row)}) { const e = b.find((q) => q.kind === kind && !used.has(q.id)); if (!e) continue; used.add(e.id); t.setup_enemy(e.id, { x: p.x - Math.sin(p.yaw) * ahead + Math.cos(p.yaw) * side, z: p.z - Math.cos(p.yaw) * ahead - Math.sin(p.yaw) * side, yaw: p.yaw, state: "chase", hp: 100000, attackT: -1, lungeT: -1, lastX: p.x, lastZ: p.z, lost: 0 }); } t.tick(1); for (const id of used) t.setup_enemy(id, { walk: 1, phase: 1.3 }); return JSON.stringify([...used].map((id) => ({ id, kind: t.enemyBounds().find((q) => q.id === id).kind })))`).then((j) => { placed = JSON.parse(j); });
  }
  await T('t.clearOverlays(); t.render(0.02)');
  await savePng(page, path.join(out, s.name + '.png'));
  await T('t.setup_postDebug(true); t.render(0.02)'); const mask = await page.screenshot(); await T('t.setup_postDebug(false)');
  fs.writeFileSync(path.join(out, s.name + '.ink.png'), mask); metrics[s.name] = inkShare(mask);
  for (const p of placed) { const r = await T(`JSON.stringify(t.enemyScreenRect(${p.id}))`); const rect = JSON.parse(r); const v = rect && bodyInk(mask, rect); if (v !== null && v !== undefined) (enemyInk[s.name] ??= {})[p.kind] = v; } console.log('shot', s.name, 'ink', metrics[s.name]);
}
const kinds = {}; for (const sc of Object.values(enemyInk)) for (const [k, v] of Object.entries(sc)) (kinds[k] ??= []).push(v);
const enemyMean = Object.fromEntries(Object.entries(kinds).map(([k, v]) => [k, +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(4)]));
fs.writeFileSync(path.join(out, 'ink-share.json'), JSON.stringify({ note: 'share of pixels carrying ink (3D view, HUD strips and weapon excluded); enemyBodyInk = ink INSIDE an enemy body (its screen box shrunk 20% per side), by scene and mean per kind', scenes: metrics, enemyBodyInk: enemyInk, enemyBodyInkMean: enemyMean, mean: +(Object.values(metrics).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(metrics).length)).toFixed(4) }, null, 1));
console.log(JSON.stringify({ errors }));
await browser.close(); await server.close();
process.exit(errors.length ? 1 : 0);
