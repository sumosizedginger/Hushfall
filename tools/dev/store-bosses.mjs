// FREEZE F16, the store frames of the bosses and of the guns firing (design/store/SHOTS.md): the real game on the machine's own graphics card, the player put at a vantage the NODE side has proved has a clear line to the boss (so no frame is a wall), facing it,
// the boss awake, and a few ticks played so it is mid-tell; then the same vantage with a gun fired at it. Appearance only: nothing here is a play result.
//   GPU=1 VW=1920 VH=1080 WIDTH=800 powershell -File D:/Doom/tools/dev/low.ps1 <log> D:/Doom/tools/dev/store-bosses.mjs <outDir> [mapId ...]
// Run it through low.ps1 (idle priority, two cores), one job at a time; the pointer lock is refused before any page script runs. It writes <outDir>/images/*.png and <outDir>/vantages.json.
import { savePng } from './savepng.mjs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { createWorld, rayClear, blockedCircle } from '../../src/engine/world.js';
import { loadMapFile } from '../../src/engine/harness.js';
import { ENEMIES, PLAYER, ALL_WEAPONS, AMMO_MAX } from '../../src/engine/defs.js';
import { floorAt } from '../../src/engine/terrain.js';

const root = path.resolve(import.meta.dirname, '../..'), [outArg, ...ids0] = process.argv.slice(2);
if (!outArg) { console.error('usage: store-bosses.mjs <outDir> [mapId ...]'); process.exit(2); }
const out = path.resolve(outArg), imgDir = path.join(out, 'images'); fs.mkdirSync(imgDir, { recursive: true });
const ids = ids0.length ? ids0 : ['C1E1M08', 'C1E3M08', 'C1E4M08', 'C2M24', 'C2M29'];

// ---- node side: where could the player stand? ----
const vantages = {};
for (const id of ids) {
  const map = loadMapFile(path.join(root, 'maps', id + '.json')), w = createWorld(map, { seed: 1, difficulty: 'normal' });
  const boss = w.enemies.find((e) => ENEMIES[e.kind].boss && !ENEMIES[e.kind].node) ?? w.enemies.find((e) => ENEMIES[e.kind].boss); if (!boss) { console.log(id, 'no boss'); continue; }
  const def = ENEMIES[boss.kind], cy = boss.y + (def.height ?? 2) * 0.55, found = [];
  for (const r of [6, 7, 8, 9, 10, 12, 14]) for (let k = 0; k < 36; k++) {
    const a = (k / 36) * Math.PI * 2, x = boss.x + Math.cos(a) * r, z = boss.z + Math.sin(a) * r;
    if (blockedCircle(w, x, z, PLAYER.radius + 0.1)) continue;
    const eyeY = floorAt(w, x, z) + 1.6; if (!rayClear(w, x, eyeY, z, boss.x, cy, boss.z)) continue;
    const dx = boss.x - x, dz = boss.z - z, d = Math.hypot(dx, dz);
    found.push({ x, z, r, a, yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(cy - eyeY, d), eyeY, score: Math.abs(r - 8) });
  }
  found.sort((p, q) => p.score - q.score); const picks = [];
  for (const f of found) { if (picks.length >= 2) break; if (picks.every((q) => Math.abs(Math.atan2(Math.sin(f.a - q.a), Math.cos(f.a - q.a))) > 1.0)) picks.push(f); }
  vantages[id] = { boss: { kind: boss.kind, x: boss.x, z: boss.z, y: boss.y }, picks }; console.log(id, boss.kind, 'candidates', found.length, 'picks', picks.map((p) => `${p.x.toFixed(1)},${p.z.toFixed(1)} r${p.r}`).join(' | '));
}
fs.writeFileSync(path.join(out, 'vantages.json'), JSON.stringify(vantages, null, 1));
if (process.env.DRY) process.exit(0);          // (the node half only: where the player would stand)

// ---- page side ----
const port = 5500 + (process.pid % 90), server = await createServer({ root, logLevel: 'error', server: { port, strictPort: false } }); await server.listen();
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
let n = 0; const shot = async (id, tag) => {                                                                                       // (the player is given a million hit points so a boss cannot end the take; the picture shows the ordinary hundred)
  n++; const f = `${id}__${String(n).padStart(2, '0')}__${tag}.png`; await T('t.setup_player({ hp: 100, armor: 50, hurt: 0 }); t.render(0.02)'); await savePng(page, path.join(imgDir, f)); await T('t.setup_player({ hp: 1000000 })'); console.log('shot', f);
};
const GUNS = [['flare', 'scattergun'], ['rivet', 'harpoon'], ['arc', 'carbine'], ['linethrower', 'rivet']];
try {
  for (const [id, V] of Object.entries(vantages)) {
    for (const [pi, p] of V.picks.entries()) {
      await T(`t.newGame('normal', 3, { mapId: '${id}' })`); await sleep(500); await T('t.clearOverlays()');
      await T(`t.setup_player({ weapons: ${JSON.stringify(ALL_WEAPONS)}, ammo: ${JSON.stringify(Object.fromEntries(Object.entries(AMMO_MAX).map(([k, v]) => [k, Math.round(v * 0.8)])))} })`);          // (every gun in the strip and its ammunition on the HUD: the picture shows what the player would hold at that point of the campaign)
      await T(`t.setup_wakeAll(); t.setup_player({ hp: 1000000, armor: 100 }); t.setup_teleport(${p.x}, ${p.z}, ${p.yaw}); t.setup_player({ pitch: ${p.pitch}, hurt: 0 }); t.clearOverlays()`);
      await T('t.tick(45)'); await T('t.setup_player({ hp: 1000000, hurt: 0 }); t.clearOverlays()'); await shot(id, `boss_v${pi}_a`);
      await T('t.tick(50)'); await T('t.setup_player({ hp: 1000000, hurt: 0 }); t.clearOverlays()'); await shot(id, `boss_v${pi}_b`);
      const [g1, g2] = GUNS[(pi + ids.indexOf(id)) % GUNS.length];
      for (const gun of [g1, g2]) {
        await T(`t.setup_player({ weapon: '${gun}', switchT: 0, hp: 1000000, hurt: 0, pitch: ${p.pitch} })`); await T('t.tick(25)'); await T("t.press('fire')"); await T('t.tick(3)');
        await T(`t.setup_player({ hp: 1000000, hurt: 0, pitch: ${p.pitch} }); t.clearOverlays()`); await shot(id, `fire_${gun}_v${pi}`); await T("t.release('fire')"); await T('t.tick(20)');
      }
    }
  }
} finally {
  const asks = await page.evaluate('window.__lockAsks'); console.log(JSON.stringify({ errors, pointerLockAsks: asks })); await browser.close(); await server.close();
}
