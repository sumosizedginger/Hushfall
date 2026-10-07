// Look assessment captures (appearance evidence only). One page, many frames, same conditions, written outside the tracked review stills.
//   node tools/dev/shoot-assessment.mjs env  <outDir> [ID ...]     every vantage in maps-src/<ID>.views.json (all maps when no ID)
//   node tools/dev/shoot-assessment.mjs pick <outDir> <ID:view> ... named frames, flat file names
//   node tools/dev/shoot-assessment.mjs enemies <outDir>            every creature, awake at 3 m / 8 m and dead, on one open spot
// Views use CELL coordinates exactly as tools/dev/shoot-map.mjs.
import { savePng } from './savepng.mjs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const [mode, outArg, ...rest] = process.argv.slice(2);
if (!mode || !outArg) { console.error('usage: shoot-assessment.mjs env|pick|enemies <outDir> [...]'); process.exit(2); }
const out = path.resolve(outArg);
fs.mkdirSync(out, { recursive: true });
const server = await createServer({ root, logLevel: 'error', server: { port: 5290, strictPort: true } });
await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:5290/', { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const YAW = { east: -Math.PI / 2, west: Math.PI / 2, north: 0, south: Math.PI };
const viewsOf = (id) => { const f = path.join(root, 'maps-src', id + '.views.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : []; };
const ALL = ['C1E1M01', 'C1E1M02', 'C1E1M03', 'C1E1M04', 'C1E1M05', 'C1E1M06', 'C1E1M07', 'C1E1M08', 'C1E1S01', 'C1E2M01', 'C1E2M02', 'C1E2M03', 'C1E2M04', 'C1E2M05', 'C1E2M06', 'C1E2M07', 'C1E2M08', 'C1E2S01'];

async function shootViews(id, only, dest, flat) {
  await T(`t.newGame('normal', 3, { mapId: '${id}' })`); await T('t.clearOverlays()');
  let opened = false;
  for (const v of viewsOf(id)) {
    if (only && !only.includes(v.name)) continue;
    if (v.open && !opened) { await T('t.setup_openDoors()'); opened = true; }
    const yaw = typeof v.yaw === 'string' ? YAW[v.yaw] : v.yaw;
    await T(`t.setup_teleport(${v.x * 2}, ${v.z * 2}, ${yaw}); t.setup_player({ pitch: ${v.pitch ?? 0}, hp: 100, hurt: 0 })`);
    if (v.wake) await T('t.setup_wakeAll()');
    if (v.ticks) { await T(`t.setup_player({ hp: 100000 }); t.tick(${v.ticks})`); await T('t.setup_player({ hp: 100 })'); }
    if (v.ambient != null) await T(`t.setup_ambient(${v.ambient})`);
    await T('t.clearOverlays(); t.render(0.02)');
    const name = flat ? `${id}-${v.name}.png` : path.join(id, v.name + '.png');
    fs.mkdirSync(path.dirname(path.join(dest, name)), { recursive: true });
    await savePng(page, path.join(dest, name)); console.log('shot', name);
  }
}

if (mode === 'env') {
  for (const id of (rest.length ? rest : ALL)) await shootViews(id, null, out, false);
} else if (mode === 'pick') {
  const by = {}; for (const r of rest) { const [id, v] = r.split(':'); (by[id] ??= []).push(v); }
  for (const [id, names] of Object.entries(by)) await shootViews(id, names, out, true);
} else if (mode === 'enemies') {
  const KINDS = ['tollbearer', 'gaunt', 'bellhand', 'sexton', 'wardengraft', 'gill', 'cantor', 'bellnode', 'graftmother', 'feeder'];
  // the same open spot for everyone: the Marrow Quay plaza, daylight-ish dusk, the player faces east
  await T("t.newGame('normal', 3)"); await T('t.clearOverlays()');
  await T("t.setup_clearEnemies(); t.setup_player({ weapons: ['flare'], weapon: 'flare', hp: 100000 }); t.setup_teleport(11, 33, -Math.PI / 2)"); await T('t.tick(10)');
  for (const k of KINDS) {
    const big = ['cantor', 'graftmother', 'wardengraft'].includes(k);
    for (const [tag, d, state] of [['near', big ? 7 : 3.2, 'chase'], ['mid', big ? 14 : 8, 'chase'], ['dead', big ? 7 : 3.2, 'dead']]) {
      await T('t.setup_clearEnemies(); for (const e of window.__GAME_TEST__.state().enemies) window.__GAME_TEST__.setup_enemy(e.id, { x: -200, z: -200 })');   // earlier creatures: dead, and moved far off the map
      const id = await T(`t.setup_spawnEnemy('${k}', ${11 + d}, 33, ${-Math.PI / 2}, 'chase')`);
      await T(`t.setup_enemy(${id}, { walk: 1, phase: 0.6 })`);
      if (state === 'dead') await T(`t.setup_enemy(${id}, { state: 'dead', dead: 1, attackT: -1 })`);
      await T('t.render(0.02)'); await T('t.clearOverlays(); t.render(0.02)');
      await savePng(page, path.join(out, `${k}-${tag}.png`)); console.log('shot', k, tag);
    }
  }
} else if (mode === 'weapons') {
  // every gun in hand on the same spot (hip), one frame while firing, then the pickups
  const KIT = "weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc'], ammo: { flare: 8, shell: 12, rivet: 120, bolt: 8, cell: 80 }, hp: 100000";
  await T("t.newGame('normal', 3)"); await T('t.clearOverlays()');
  await T("t.setup_clearEnemies(); t.setup_player({ " + KIT + ", weapon: 'flare' }); t.setup_teleport(11, 33, -Math.PI / 2)"); await T('t.tick(10)');
  for (const [i, w] of ['flare', 'scattergun', 'rivet', 'harpoon', 'arc'].entries()) {
    await T("t.setup_player({ weapon: '" + w + "' })"); await T('t.setup_player({ cooldown: 0 })'); await T('t.tick(60)'); await T('t.clearOverlays(); t.render(0.02)');
    await savePng(page, path.join(out, 'weapon-' + (i + 1) + '-' + w + '-hip.png'));
    await T("t.setup_arcLife(0.9); t.press('fire')"); await T('t.tick(3)'); await T('t.render(0.02)');
    await savePng(page, path.join(out, 'weapon-' + (i + 1) + '-' + w + '-fire.png')); await T("t.release('fire')"); await T('t.tick(50)');
    console.log('shot', w);
  }
} else if (mode === 'sil') {
  // silhouette test: an empty frame, then every creature standing on the same spot, same distance, same pose (tools/dev/silhouettes.mjs turns the frames into masks)
  await T("t.newGame('normal', 3)"); await T('t.clearOverlays()');
  await T("t.setup_clearEnemies(); t.setup_player({ weapons: ['flare'], weapon: 'flare', hp: 100000 }); t.setup_teleport(11, 33, -Math.PI / 2)"); await T('t.tick(10)');
  await T('t.clearOverlays(); t.render(0.02)'); await savePng(page, path.join(out, 'sil-bg.png'));
  for (const k of ['tollbearer', 'bellhand', 'sexton', 'wardengraft', 'gaunt', 'cantor', 'gill', 'graftmother']) {
    await T('t.setup_clearEnemies(); for (const e of window.__GAME_TEST__.state().enemies) window.__GAME_TEST__.setup_enemy(e.id, { x: -200, z: -200 })');
    const d = ['cantor', 'graftmother'].includes(k) ? 10 : 5.2;
    const id = await T(`t.setup_spawnEnemy('${k}', ${11 + d}, 33, ${-Math.PI / 2}, 'chase')`); await T(`t.setup_enemy(${id}, { walk: 1, phase: 0.6 })`);
    await T('t.render(0.02)'); await T('t.clearOverlays(); t.render(0.02)'); await savePng(page, path.join(out, 'sil-' + k + '.png')); console.log('shot', k);
  }
} else if (mode === 'ui') {
  // title (dev picker visible), pause, the Locker/intermission, the HUD on the quay
  await savePng(page, path.join(out, 'ui-title.png'));
  await T("t.newGame('normal', 3)"); await T('t.tick(30); t.clearOverlays(); t.render(0.02)'); await savePng(page, path.join(out, 'ui-hud-quay.png'));
  await T('t.pause()'); await sleep(400); await savePng(page, path.join(out, 'ui-pause.png')); await T('t.resume()');
}
console.log(JSON.stringify({ errors }));
await browser.close(); await server.close();
process.exit(errors.length ? 1 : 0);
