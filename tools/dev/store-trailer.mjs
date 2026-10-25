// FREEZE F17, the trailer's footage (design/store/SHOTS.md): consecutive frames of the real game on the machine's own graphics card, 30 a second, with the sim's events written beside them so the SOUND can be made from the game's own event-to-sound mapping
// (tools/dev/store-trailer-mix.mjs). Each clip is a few seconds of a map played by its route bot (or, for a boss, the player put at a vantage with a clear line to it); WHERE a clip starts is found in node (the sim is deterministic and the page's equals it),
// so no clip begins in a corridor. Appearance only.
//   GPU=1 VW=1920 VH=1080 WIDTH=800 powershell -File D:/Doom/tools/dev/low.ps1 <log> D:/Doom/tools/dev/store-trailer.mjs <outDir> [clip ...]
// One job at a time, idle priority, two cores, the pointer lock refused before any page script runs (the count is printed: it must be 0). Writes <outDir>/<clip>/%05d.png and <outDir>/<clip>/events.json.
import { savePng } from './savepng.mjs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { loadMapFile, loadRouteFile, runRoute } from '../../src/engine/harness.js';
import { createWorld, rayClear, blockedCircle } from '../../src/engine/world.js';
import { ENEMIES, PLAYER, ALL_WEAPONS, AMMO_MAX } from '../../src/engine/defs.js';
import { floorAt } from '../../src/engine/terrain.js';

const root = path.resolve(import.meta.dirname, '../..'), [outArg, ...pick] = process.argv.slice(2);
if (!outArg) { console.error('usage: store-trailer.mjs <outDir> [clip ...]'); process.exit(2); }
const out = path.resolve(outArg), FPS = 30, STEP = 2;           // two sim ticks (60 a second) per frame
const awake = (e) => e.state !== 'dead' && e.state !== 'idle' && !ENEMIES[e.kind].peaceful;
const CLIPS = {
  quay:    { map: 'C1E1M01', seconds: 9,  kind: 'fight', range: 13, before: 1.0 },
  nave:    { map: 'C1E3M04', seconds: 9,  kind: 'fight', range: 14, before: 1.0 },
  foundry: { map: 'C2M21',   seconds: 9,  kind: 'fight', range: 14, before: 1.0 },
  stair:   { map: 'C1E4M07', seconds: 8,  kind: 'vent', plate: [20, 44], to: [44, 20] },          // (no route rides a vent: the player is put on the plate and the launch is the clip)
  warden:  { map: 'C1E4M08', seconds: 10, kind: 'boss', before: 0 },
};
const wanted = pick.length ? pick : Object.keys(CLIPS);

// ---- node: where does each clip begin? (a tick of the route, or a vantage in front of the boss) ----
const plan = {};
for (const name of wanted) {
  const c = CLIPS[name], map = loadMapFile(path.join(root, 'maps', c.map + '.json'));
  if (c.kind === 'vent') { const cs = map.cell, x = (c.plate[0] + 0.5) * cs, z = (c.plate[1] + 0.5) * cs, dx = c.to[0] - c.plate[0], dz = c.to[1] - c.plate[1]; plan[name] = { vantage: { x, z, yaw: Math.atan2(-dx, -dz), pitch: -0.12 } }; continue; }
  if (c.kind === 'boss') {
    const w = createWorld(map, { seed: 3, difficulty: 'normal' }), boss = w.enemies.find((e) => ENEMIES[e.kind].boss && !ENEMIES[e.kind].node), def = ENEMIES[boss.kind], cy = boss.y + def.height * 0.55; let best = null;
    for (let k = 0; k < 72; k++) for (const r of [8, 9, 7, 10]) {
      const a = (k / 72) * Math.PI * 2, x = boss.x + Math.cos(a) * r, z = boss.z + Math.sin(a) * r; if (blockedCircle(w, x, z, PLAYER.radius + 0.1)) continue;
      const eyeY = floorAt(w, x, z) + 1.6; if (!rayClear(w, x, eyeY, z, boss.x, cy, boss.z)) continue; const dx = boss.x - x, dz = boss.z - z; best = { x, z, yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(cy - eyeY, Math.hypot(dx, dz)) }; break;
    }
    plan[name] = { vantage: best }; continue;
  }
  const route = loadRouteFile(path.join(root, 'routes', c.map + '.main.route.json')); let at = null;
  runRoute(map, route, { seed: 3, difficulty: 'easy', maxTicks: 60 * 60 * 6, onTick: (w, tick) => {
    if (at != null) return; const p = w.player;
    if (c.kind === 'air' && p.air) at = tick;
    if (c.kind === 'fight' && tick > 600) for (const e of w.enemies) if (awake(e) && Math.hypot(e.x - p.x, e.z - p.z) < c.range && p.cooldown > 0) { at = tick; break; }
  } });
  plan[name] = { tick: at == null ? null : Math.max(0, at - Math.round(c.before * 60)) };
  console.log(name, JSON.stringify(plan[name]));
}
for (const [n, p] of Object.entries(plan)) if ((p.tick == null && !p.vantage)) { console.error('no start for', n); process.exit(1); }

// ---- the page ----
const port = 5700 + (process.pid % 90), server = await createServer({ root, logLevel: 'error', server: { port, strictPort: false } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, args: process.env.GPU ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { navigator.getGamepads = () => [null, null, null, null]; window.__lockAsks = 0; Element.prototype.requestPointerLock = function () { window.__lockAsks++; return Promise.reject(new DOMException('refused by the tool', 'NotAllowedError')); }; });
await page.setViewport({ width: Number(process.env.VW) || 1920, height: Number(process.env.VH) || 1080 });
const errors = []; page.on('pageerror', (e) => errors.push('pageerror: ' + e)); page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
await page.goto(`http://localhost:${server.config.server.port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 180000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.evaluate(`window.__GAME_TEST__.setSetting('autoQuality', false); window.__GAME_TEST__.setSetting('internalWidth', ${Number(process.env.WIDTH) || 800})`);
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
try {
  for (const name of wanted) {
    const c = CLIPS[name], P = plan[name], dir = path.join(out, name); fs.mkdirSync(dir, { recursive: true }); for (const f of fs.readdirSync(dir)) fs.rmSync(path.join(dir, f));
    await T(`t.newGame('easy', 3, { mapId: '${c.map}' })`); await sleep(500); await T('t.clearOverlays()');
    if (c.kind === 'vent') await T(`t.setup_teleport(${P.vantage.x}, ${P.vantage.z}, ${P.vantage.yaw}); t.setup_player({ pitch: ${P.vantage.pitch}, hurt: 0 }); t.clearOverlays()`);
    else if (c.kind === 'boss') await T(`t.setup_player({ weapons: ${JSON.stringify(ALL_WEAPONS)}, ammo: ${JSON.stringify(Object.fromEntries(Object.entries(AMMO_MAX).map(([k, v]) => [k, Math.round(v * 0.8)])))}, weapon: 'rivet', switchT: 0 }); t.setup_wakeAll(); t.setup_player({ hp: 1000000, armor: 100 }); t.setup_teleport(${P.vantage.x}, ${P.vantage.z}, ${P.vantage.yaw}); t.setup_player({ pitch: ${P.vantage.pitch}, hurt: 0 }); t.clearOverlays()`);
    else { await T(`t.startBot('${c.map}.main')`); let s = await T('t.state()'); while (s.tick < P.tick && s.mode === 'playing') s = await T(`t.stepBot(${Math.min(120, P.tick - s.tick)})`); await T('t.clearOverlays()'); }
    const frames = c.seconds * FPS, ev = []; let hp = 100;
    for (let f = 0; f < frames; f++) {
      if (c.kind === 'boss' && f === 45) await T("t.press('fire')");                                                            // (the player opens fire a second and a half in: the stream of rivets is what moves on screen)
      const r = c.kind === 'boss' ? await T(`t.tick(${STEP}); t.setup_player({ hp: 1000000 }); return t.state()`) : c.kind === 'vent' ? await T(`t.tick(${STEP}); return t.state()`) : await T(`t.stepBot(${STEP})`);
      const p = r.player ?? {}; const events = await T('t.drainEvents()');
      if (c.kind === 'fight' && p.hp < 45) await T('t.setup_player({ hp: 100 })');
      ev.push({ f, t: r.tick, player: { x: p.x, z: p.z, yaw: p.yaw }, events: events.map((e) => ({ ...e })) });
      await T(`${c.kind === 'boss' ? 't.setup_player({ hp: 100, armor: 50, hurt: 0 }); ' : ''}t.render(${1 / FPS})`); await savePng(page, path.join(dir, String(f).padStart(5, '0') + '.png'));
      if (c.kind === 'boss') await T('t.setup_player({ hp: 1000000 })');
      if (r.mode && r.mode !== 'playing') { console.log(name, 'the run left play at frame', f, r.mode); break; }
    }
    fs.writeFileSync(path.join(dir, 'events.json'), JSON.stringify({ name, fps: FPS, step: STEP, frames: ev }));
    console.log('clip', name, ev.length, 'frames');
  }
} finally { const asks = await page.evaluate('window.__lockAsks'); console.log(JSON.stringify({ errors, pointerLockAsks: asks })); await browser.close(); await server.close(); }
