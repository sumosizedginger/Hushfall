// CPU PROFILE of the page's OWN frame loop, map against map (PT-054, the Glass Steppe stutter: the two probes that drive the sim and the renderer through the dev hook found no difference between maps; the shell's per-frame work (the minimap's model, the HUD, the audio, the automap, the door prompt)
// never ran in them). Here the page runs in REAL TIME (`realtime(true)`: its own requestAnimationFrame, its own fixed-step loop, the whole of frameBody in main.js) while the player walks forward along the road and turns, with every cell of the map marked explored (the worst case for anything that
// grows with what has been seen), and Chrome's sampling profiler records for N seconds. Result per map: frames per second, the longest frame gaps, and the top functions by SELF time (bundled source names, so read them as function name + file:line).
//   node tools/dev/probe-prof.mjs <outDir> <ID> ...        SECONDS=12 (default), WAKE=1 wakes every creature after the warm-up, FIRE=1 holds the trigger, INCL=1 prints the inclusive-time table, AUDIO=1 lets the audio context run without a click (the sound engine's own cost is then in the profile)        run it through tools/dev/low.ps1 with ABSOLUTE paths. The pointer lock is refused before any page script runs (count in the result: must be 0).
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const args = process.argv.slice(2), out = path.resolve(args[0] ?? path.join(root, 'review/probe-prof')), ids = args.slice(1), SECONDS = +(process.env.SECONDS ?? 12), W = +(process.env.VW ?? 800), H = +(process.env.VH ?? 450);
fs.mkdirSync(out, { recursive: true });
const results = { when: new Date().toISOString(), seconds: SECONDS, maps: {}, errors: [] };
const save = () => fs.writeFileSync(path.join(out, 'prof.json'), JSON.stringify(results, null, 1));
const server = await createServer({ root, logLevel: 'error', server: { port: 5800 + (process.pid % 90), strictPort: false } });
await server.listen();
const browser = await puppeteer.launch({ headless: true, protocolTimeout: 0, args: [...(process.env.GPU ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']), ...(process.env.AUDIO ? ['--autoplay-policy=no-user-gesture-required'] : [])] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H });
await page.evaluateOnNewDocument(() => { window.__lockCalls = 0; Element.prototype.requestPointerLock = function () { window.__lockCalls++; return Promise.reject(new DOMException('refused by the probe', 'NotAllowedError')); }; });
page.on('pageerror', (e) => results.errors.push('pageerror: ' + String(e).slice(0, 300)));
page.on('console', (m) => { if (m.type() === 'error') results.errors.push('console: ' + m.text().slice(0, 300)); });
await page.goto(`http://localhost:${server.config.server.port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 240000 });
const client = await page.createCDPSession(); await client.send('Profiler.enable'); await client.send('Profiler.setSamplingInterval', { interval: 400 });
results.renderer = await page.evaluate(() => { const c = document.createElement('canvas'), g = c.getContext('webgl2') || c.getContext('webgl'), e = g && g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; }); console.log('page ready; renderer:', results.renderer);

for (const id of ids) {
  const t0 = Date.now();
  try {
    await page.evaluate((mapId) => {
      const t = window.__GAME_TEST__; t.newGame('normal', 1, { mapId, realtime: true }); t.tick(2); const w = t.view().world; w.explored.fill(1); w.player.hp = 1e6;
      window.__frames = window.__frames ?? []; if (!window.__rafOn) { window.__rafOn = true; let last = performance.now(); const loop = (now) => { window.__frames.push(now - last); last = now; requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
      t.press('forward'); window.__turn = setInterval(() => t.addYaw(0.02 * Math.sin(performance.now() / 900)), 50);
    }, id);
    if (process.env.AUDIO) await page.evaluate(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft', bubbles: true })); });          // the page's own unlock listener (a synthetic event: no real key is pressed)
    await new Promise((r) => setTimeout(r, 2500));                                               // warm-up: shaders, the first rigs
    if (process.env.WAKE) await page.evaluate(() => { window.__GAME_TEST__.setup_wakeAll(); });                    // WAKE=1: every creature hunts from the first second (the worst case for the navigation)
    if (process.env.FIRE) await page.evaluate(() => { window.__GAME_TEST__.press('fire'); });                      // FIRE=1: the trigger is held (effects, projectiles, drops, debris)
    await page.evaluate(() => { window.__frames.length = 0; });
    await client.send('Profiler.start'); await new Promise((r) => setTimeout(r, SECONDS * 1000)); const { profile } = await client.send('Profiler.stop');
    const fr = await page.evaluate(() => { clearInterval(window.__turn); const t = window.__GAME_TEST__; t.release('forward'); t.release('fire'); const f = window.__frames.slice(); const st = t.state(); return { f, tick: st.tick, explored: st.explored, enemies: st.enemies.length, audio: { state: st.audio.state, played: st.audio.played, dropped: st.audio.dropped } }; });
    const self = new Map(), byId = new Map(profile.nodes.map((n) => [n.id, n])); const dt = (profile.timeDeltas ?? []); let total = 0;
    profile.samples.forEach((sid, i) => { const n = byId.get(sid), d = dt[i] ?? 0; total += d; const cf = n.callFrame, key = `${cf.functionName || '(anonymous)'} ${cf.url.split('/').slice(-2).join('/')}:${cf.lineNumber + 1}`; self.set(key, (self.get(key) ?? 0) + d); });
    // inclusive time: every sample charges every distinct function on its stack once
    const parent = new Map(); for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id); const incl = new Map();
    profile.samples.forEach((sid, i) => { const d = dt[i] ?? 0, seen = new Set(); for (let id = sid; id !== undefined; id = parent.get(id)) { const cf = byId.get(id).callFrame, key = `${cf.functionName || '(anonymous)'} ${cf.url.split('/').slice(-2).join('/')}:${cf.lineNumber + 1}`; if (!seen.has(key)) { seen.add(key); incl.set(key, (incl.get(key) ?? 0) + d); } } });
    const inclTop = [...incl.entries()].filter(([k]) => !k.startsWith('(')).sort((a, b) => b[1] - a[1]).slice(0, 26).map(([k, v]) => ({ fn: k, ms: Math.round(v / 1000), pct: +(100 * v / total).toFixed(1) }));
    const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => ({ fn: k, ms: Math.round(v / 1000), pct: +(100 * v / total).toFixed(1) }));
    const sorted = fr.f.slice().sort((a, b) => a - b), pct = (p) => +(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0).toFixed(1);
    results.maps[id] = { frames: fr.f.length, fps: +(fr.f.length / SECONDS).toFixed(1), gapP50: pct(0.5), gapP90: pct(0.9), gapP99: pct(0.99), gapMax: +Math.max(...fr.f).toFixed(1), over100: fr.f.filter((x) => x > 100).length, over250: fr.f.filter((x) => x > 250).length, idlePct: +(100 * (profile.nodes.find((n) => n.callFrame.functionName === '(idle)') ? (self.get('(idle)  :0') ?? 0) / total : 0)).toFixed(1), ticks: fr.tick, explored: fr.explored, enemies: fr.enemies, audio: fr.audio, gcMs: Math.round((self.get('(garbage collector) :0') ?? 0) / 1000), top, inclTop };
    const r = results.maps[id]; console.log(`${id}: ${r.frames} frames in ${SECONDS} s (${r.fps} fps)  gap p50 ${r.gapP50} p90 ${r.gapP90} p99 ${r.gapP99} max ${r.gapMax} ms  >100ms ${r.over100}  ticks ${r.ticks}  audio ${r.audio.state} played ${r.audio.played} dropped ${r.audio.dropped}  GC ${r.gcMs} ms`); for (const q of top.slice(0, 6)) console.log(`     self ${String(q.pct).padStart(5)}%  ${String(q.ms).padStart(5)} ms  ${q.fn}`); if (process.env.INCL) for (const q of inclTop) console.log(`     incl ${String(q.pct).padStart(5)}%  ${String(q.ms).padStart(5)} ms  ${q.fn}`);
  } catch (e) { results.maps[id] = { error: String(e.stack ?? e).slice(0, 400) }; console.log(id, 'ERROR', results.maps[id].error.slice(0, 200)); }
  await page.evaluate(() => { try { window.__GAME_TEST__.realtime(false); } catch {} }); save();
}
results.lockCalls = await page.evaluate(() => window.__lockCalls); results.pointerLockElement = await page.evaluate(() => (document.pointerLockElement ? document.pointerLockElement.id : null));
console.log('pointer lock requests:', results.lockCalls, '| locked element:', results.pointerLockElement, '| errors:', results.errors.length, results.errors.slice(0, 2).join(' | '));
save(); await browser.close().catch(() => {}); await server.close().catch(() => {}); process.exit(0);
