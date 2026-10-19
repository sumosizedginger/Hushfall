// FRAME-COST PROFILE of the real game page, map against map (PT-054, the owner's report 2026-10-19: "Glass Steppe: major stutter and lag ... the other two seem just fine"; the owner's yes of the same day for this job).
// For each map: the canonical route bot plays it in the live page, one frame at a time through the dev hook (`stepBot(1)`: a bot tick, a sim step and a render), and every frame's time is recorded; at sampled frames the render alone is timed and renderer.info is read
// (draw calls, triangles, geometries, textures). Result: percentiles, the worst frames with their tick, the draw calls and triangles over the run, the JS heap at the start and at the end. Headless Chrome on SwiftShader is NOT the owner's GPU: absolute
// milliseconds mean little, DIFFERENCES between maps on the same machine and the shape of the spikes mean a lot (a map that costs five times the draw calls, a frame that costs fifty times the median).
//   node tools/dev/probe-perf.mjs <outDir> <ID[=routeFile]> ...        ids are shipped maps or dev maps (maps-dev/*.json); run it through tools/dev/low.ps1 with ABSOLUTE paths (idle priority, two cores).
// THE MOUSE: Element.prototype.requestPointerLock is replaced before any page script runs with a function that counts the call and refuses it (the count is in the result and must be 0); the page's own guard (lockpolicy.js) also refuses in a driven browser.
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const args = process.argv.slice(2), out = path.resolve(args[0] ?? path.join(root, 'review/probe-perf')), specs = args.slice(1).map((s) => { const [id, rf] = s.split('='); return { id, route: rf ?? path.join(root, 'routes', id + '.main.route.json') }; });
const FRAMES = +(process.env.FRAMES ?? 900), W = +(process.env.VW ?? 800), H = +(process.env.VH ?? 450);
fs.mkdirSync(out, { recursive: true });
const results = { when: new Date().toISOString(), viewport: [W, H], frames: FRAMES, maps: {}, errors: [] };
const save = () => fs.writeFileSync(path.join(out, 'perf.json'), JSON.stringify(results, null, 1));

const server = await createServer({ root, logLevel: 'error', server: { port: 5600 + (process.pid % 90), strictPort: false } });
await server.listen();
const browser = await puppeteer.launch({ headless: true, protocolTimeout: 0, args: process.env.GPU ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H });
await page.evaluateOnNewDocument(() => { window.__lockCalls = 0; Element.prototype.requestPointerLock = function () { window.__lockCalls++; return Promise.reject(new DOMException('refused by the probe', 'NotAllowedError')); }; });
page.on('pageerror', (e) => results.errors.push('pageerror: ' + String(e).slice(0, 300)));
page.on('console', (m) => { if (m.type() === 'error') results.errors.push('console: ' + m.text().slice(0, 300)); });
await page.goto(`http://localhost:${server.config.server.port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 240000 });
results.renderer = await page.evaluate(() => { const c = document.createElement('canvas'), g = c.getContext('webgl2') || c.getContext('webgl'), e = g && g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; }); console.log('page ready; renderer:', results.renderer);

const profile = (mapId, route, frames) => page.evaluate(async (id, rt, n) => {
  const t = window.__GAME_TEST__; t.newGame('normal', 1, { mapId: id }); t.tick(2); t.startBot(rt);
  const heap = () => (performance.memory ? performance.memory.usedJSHeapSize : 0), all = [], sim = [], rend = [], samples = [], worst = [], spikes = [];
  const h0 = heap(); let done = null, ticks = 0;
  for (let i = 0; i < n; i++) {
    const a = performance.now(), r = t.perfStep(false), b = performance.now(); if (r !== 'ok') { done = r; break; } t.render(0.016); const c = performance.now(); all.push(c - a); sim.push(b - a); rend.push(c - b); ticks++;
    if (c - a > 100 && spikes.length < 40) { const st = t.state(); spikes.push({ frame: i, ms: Math.round(c - a), simMs: Math.round(b - a), tick: st.tick, awake: st.enemies.filter((e) => e.state !== 'idle' && e.state !== 'dead').length, alive: st.enemies.filter((e) => e.state !== 'dead').length, cell: [Math.round(st.player.x / 2), Math.round(st.player.z / 2)], geometries: t.gl().geometries }); }
    if (i % 30 === 0) { const m = t.measureFrame(); samples.push({ i, calls: m.calls, triangles: m.triangles, geometries: m.geometries, textures: m.textures, heapMB: +(heap() / 1048576).toFixed(1) }); }
  }
  const P = (arr, p) => { const q = arr.slice().sort((x, y) => x - y); return +q[Math.min(q.length - 1, Math.floor(q.length * p))].toFixed(1); }, sorted = all.slice().sort((x, y) => x - y), pct = (p) => P(all, p);
  all.forEach((ms, i) => worst.push([ms, i])); worst.sort((x, y) => y[0] - x[0]);
  const sum = (k) => samples.reduce((s, q) => s + q[k], 0) / Math.max(1, samples.length);
  return { frames: ticks, end: done, p50: pct(0.5), p90: pct(0.9), p99: pct(0.99), max: +sorted[sorted.length - 1].toFixed(1), over100: all.filter((x) => x > 100).length, over250: all.filter((x) => x > 250).length,
    spikes, worst: worst.slice(0, 8).map(([ms, i]) => ({ frame: i, ms: +ms.toFixed(0) })), calls: { mean: Math.round(sum('calls')), max: Math.max(...samples.map((q) => q.calls)) }, triangles: { mean: Math.round(sum('triangles')), max: Math.max(...samples.map((q) => q.triangles)) },
    geometries: [samples[0]?.geometries, samples.at(-1)?.geometries], textures: [samples[0]?.textures, samples.at(-1)?.textures], sim: { p50: P(sim, 0.5), p99: P(sim, 0.99), max: P(sim, 1) }, render: { p50: P(rend, 0.5), p99: P(rend, 0.99), max: P(rend, 1) }, heapMB: [+(h0 / 1048576).toFixed(1), samples.at(-1)?.heapMB], samples: samples.filter((_, i) => i % 3 === 0) };
}, mapId, route, frames);

for (const { id, route } of specs) {
  const rt = JSON.parse(fs.readFileSync(route, 'utf8')); const t0 = Date.now();
  try { results.maps[id] = await profile(id, rt, FRAMES); } catch (e) { results.maps[id] = { error: String(e.stack ?? e).slice(0, 400) }; }
  const r = results.maps[id]; console.log(id.padEnd(10), r.error ? 'ERROR ' + r.error.slice(0, 120) : `frames ${r.frames} (${r.end ?? 'ran out'})  p50 ${r.p50}  p90 ${r.p90}  p99 ${r.p99}  max ${r.max} ms  >100ms: ${r.over100}  calls ${r.calls.mean}/${r.calls.max}  tris ${r.triangles.mean}/${r.triangles.max}  geom ${r.geometries.join('>')}  tex ${r.textures.join('>')}  sim p50 ${r.sim.p50} p99 ${r.sim.p99} max ${r.sim.max}  render p50 ${r.render.p50} p99 ${r.render.p99} max ${r.render.max}  heap ${r.heapMB.join('>')} MB  (${Math.round((Date.now() - t0) / 1000)} s)`);
  save();
}
results.lockCalls = await page.evaluate(() => window.__lockCalls); results.pointerLockElement = await page.evaluate(() => (document.pointerLockElement ? document.pointerLockElement.id : null));
console.log('pointer lock requests:', results.lockCalls, '| locked element:', results.pointerLockElement, '| errors:', results.errors.length);
save(); await browser.close().catch(() => {}); await server.close().catch(() => {}); process.exit(0);
