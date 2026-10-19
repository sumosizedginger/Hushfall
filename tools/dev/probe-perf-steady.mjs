// STEADY-STATE RENDER COST per map and per layer (PT-054, the second job of the Glass Steppe stutter: the first, tools/dev/probe-perf.mjs, found spikes of the same size on EVERY map, i.e. first-time costs of this headless Chrome, and no difference between maps).
// Warm the page up (every shader compiled, every creature built), then at five vantage points along the canonical route time `render + gl.finish()` (the finish makes the GPU's work part of the number: on SwiftShader it is the CPU rasterising, so it
// follows the fragments and the vertices actually drawn, not the owner's GPU, but a map that costs twice another costs twice another), and at the WORST vantage hide one layer at a time (the sky, the level mesh, the creatures, the decals, the shadows)
// to see which layer the time is in. Result in <outDir>/steady.json and on the console. Run through tools/dev/low.ps1 with ABSOLUTE paths. The pointer lock is refused before any page script runs (count in the result, must be 0).
//   node tools/dev/probe-perf-steady.mjs <outDir> <ID[=routeFile]> ...
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const args = process.argv.slice(2), out = path.resolve(args[0] ?? path.join(root, 'review/probe-perf')), specs = args.slice(1).map((s) => { const [id, rf] = s.split('='); return { id, route: rf ?? path.join(root, 'routes', id + '.main.route.json') }; });
const W = +(process.env.VW ?? 960), H = +(process.env.VH ?? 540), POINTS = +(process.env.POINTS ?? 5), LEG = +(process.env.LEG ?? 160);
fs.mkdirSync(out, { recursive: true });
const results = { when: new Date().toISOString(), viewport: [W, H], maps: {}, errors: [] };
const save = () => fs.writeFileSync(path.join(out, 'steady.json'), JSON.stringify(results, null, 1));
const server = await createServer({ root, logLevel: 'error', server: { port: 5700 + (process.pid % 90), strictPort: false } });
await server.listen();
const browser = await puppeteer.launch({ headless: true, args: process.env.GPU ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H });
await page.evaluateOnNewDocument(() => { window.__lockCalls = 0; Element.prototype.requestPointerLock = function () { window.__lockCalls++; return Promise.reject(new DOMException('refused by the probe', 'NotAllowedError')); }; });
page.on('pageerror', (e) => results.errors.push('pageerror: ' + String(e).slice(0, 300)));
page.on('console', (m) => { if (m.type() === 'error') results.errors.push('console: ' + m.text().slice(0, 300)); });
await page.goto(`http://localhost:${server.config.server.port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 240000 });
results.renderer = await page.evaluate(() => { const c = document.createElement('canvas'), g = c.getContext('webgl2') || c.getContext('webgl'), e = g && g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; }); console.log('page ready; renderer:', results.renderer);

const run = (mapId, route, points, leg) => page.evaluate(async (id, rt, K, L) => {
  const t = window.__GAME_TEST__; t.newGame('normal', 1, { mapId: id }); t.tick(2); t.startBot(rt);
  const canvas = document.getElementById('c'), gl = canvas.getContext('webgl2') || canvas.getContext('webgl'); const med = (a) => { const s = a.slice().sort((x, y) => x - y); return +s[Math.floor(s.length / 2)].toFixed(1); };
  const frame = () => { const a = performance.now(); t.render(0.016); gl.finish(); return performance.now() - a; };
  for (let i = 0; i < 90; i++) { if (t.perfStep(true) !== 'ok') break; }                                     // warm-up: shaders, rigs
  const view = t.view(), vantages = [];
  for (let k = 0; k < K; k++) {
    for (let i = 0; i < L; i++) { if (t.perfStep(true) !== 'ok') break; }
    for (let i = 0; i < 4; i++) frame();
    const ts = []; for (let i = 0; i < 15; i++) ts.push(frame());
    const m = t.measureFrame(); const p = t.state().player; vantages.push({ k, ms: med(ts), calls: m.calls, triangles: m.triangles, at: [Math.round(p.x / 2), Math.round(p.z / 2)] });
  }
  const worst = vantages.slice().sort((a, b) => b.ms - a.ms)[0], layers = {};
  const timeIt = () => { for (let i = 0; i < 3; i++) frame(); const ts = []; for (let i = 0; i < 12; i++) ts.push(frame()); return med(ts); };
  layers.all = [timeIt(), t.measureFrame().calls];
  const toggle = (name, objs) => { const list = objs.filter(Boolean); const was = list.map((o) => o.visible); list.forEach((o) => { o.visible = false; }); layers[name] = [timeIt(), t.measureFrame().calls]; list.forEach((o, i) => { o.visible = was[i]; }); };
  toggle('noSky', [view.sky, view.skyBelow]); toggle('noLevel', [view.lvl?.group]); toggle('noDecals', [view.decals?.mesh]); toggle('noShadows', [view.shadows?.mesh]);
  toggle('noCreatures', [...(view.enemyViews?.values?.() ?? [])].flatMap((v) => [v.root, v.frozen]));
  let scene = 0, meshes = 0, lights = 0, transparent = 0; view.scene.traverse((o) => { scene++; if (o.isMesh) { meshes++; if (o.material?.transparent) transparent++; } if (o.isLight) lights++; });
  return { vantages, worstAt: worst.at, layers, scene: { objects: scene, meshes, lights, transparent }, enemies: view.enemyViews?.size ?? null };
}, mapId, route, points, leg);

for (const { id, route } of specs) {
  const t0 = Date.now();
  try { results.maps[id] = await run(id, JSON.parse(fs.readFileSync(route, 'utf8')), POINTS, LEG); } catch (e) { results.maps[id] = { error: String(e.stack ?? e).slice(0, 500) }; }
  const r = results.maps[id]; console.log(id.padEnd(10), r.error ? 'ERROR ' + r.error.slice(0, 200) : `vantages ms [${r.vantages.map((v) => v.ms).join(', ')}]  calls [${r.vantages.map((v) => v.calls).join(', ')}]  tris [${r.vantages.map((v) => Math.round(v.triangles / 1000) + 'k').join(', ')}]  worst at ${r.worstAt}  layers ${JSON.stringify(r.layers)}  scene ${JSON.stringify(r.scene)}  (${Math.round((Date.now() - t0) / 1000)} s)`);
  save();
}
results.lockCalls = await page.evaluate(() => window.__lockCalls); results.pointerLockElement = await page.evaluate(() => (document.pointerLockElement ? document.pointerLockElement.id : null));
console.log('pointer lock requests:', results.lockCalls, '| locked element:', results.pointerLockElement, '| errors:', results.errors.length, results.errors.slice(0, 2).join(' | '));
save(); await browser.close().catch(() => {}); await server.close().catch(() => {}); process.exit(0);
