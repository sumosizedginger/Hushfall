// REAL-GAME stills for the PT-021 world pass, in ONE headless-Chrome job (the owner's mouse stops reaching the screen while my Chrome jobs run: idle priority, two cores, one job, and never without their go):
//   guns     the five guns at the hip and in the sights, in the bleached salt works (the hands, the materials, the size)
//   marks    what a fight leaves in the Cradle Annex's aisle: spatter on the floor and the wall behind, pools under bodies, a scorch, bullet pocks (events are fed to the view; the simulation is not involved)
//   rooms    the Annex's apses, cut corners, cradles with their captives and the growth, from the map's own vantage points; the Chandlery's hatch (lanterns, the dragged body, the growth through the seams)
//   shield   the Cantor with its shield up and an absorbed hit (the plates, the ring of sound)
//   ui       the title, the pause drawer with its settings open, the death screen and the intermission, at 1280x720 and 800x600 (with measurements)
//   node tools/dev/shoot-pt21.mjs [outDir] [guns,marks,rooms,shield,ui]       -> <outDir>/*.png (default review/pt-021/final)
import { savePng } from './savepng.mjs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..'), out = path.resolve(process.argv[2] ?? path.join(root, 'review/pt-021/final')), want = new Set((process.argv[3] ?? 'guns,marks,rooms,shield,ui').split(',')); fs.mkdirSync(out, { recursive: true });
const server = await createServer({ root, logLevel: 'error', server: { port: 5265, strictPort: true } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:5265/', { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const shot = async (name) => { await T('t.clearOverlays(); t.render(0.02)'); await savePng(page, path.join(out, name + '.png')); console.log('shot', name); };
const YAW = { east: -Math.PI / 2, west: Math.PI / 2, north: 0, south: Math.PI }, KIT = "weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc'], ammo: { flare: 12, shell: 12, rivet: 60, bolt: 8, cell: 80 }, hp: 100000, switchT: 0";
const goMap = async (id) => { await T(`t.newGame('normal', 3, { mapId: '${id}' })`); await T('t.clearOverlays()'); };
let opened = false; const views = (id) => JSON.parse(fs.readFileSync(path.join(root, 'maps-src', id + '.views.json'), 'utf8'));
const view = async (id, name, prefix = '') => {
  const v = views(id).find((x) => x.name === name); if (!v) { console.log('no view', id, name); return; }
  if (v.open && !opened) { await T('t.setup_openDoors()'); opened = true; }
  const yaw = typeof v.yaw === 'string' ? YAW[v.yaw] : v.yaw;
  await T(`t.setup_teleport(${v.x * 2}, ${v.z * 2}, ${yaw}); t.setup_player({ pitch: ${v.pitch ?? 0}, hp: 100, hurt: 0 })`);
  if (v.wake) await T('t.setup_wakeAll()');
  if (v.ticks) { await T(`t.setup_player({ hp: 100000 }); t.tick(${v.ticks})`); await T('t.setup_player({ hp: 100 })'); }
  await shot(prefix + id.toLowerCase() + '-' + name);
};

if (want.has('guns')) {
  await goMap('C1E2M02'); opened = false; await T("t.setup_clearEnemies(); t.setup_player({ " + KIT + ", weapon: 'flare' }); t.setup_teleport(96, 51, " + YAW.east + ")"); await T('t.tick(30)');
  for (const id of ['flare', 'scattergun', 'rivet', 'harpoon', 'arc']) {
    await T(`t.setup_player({ weapon: '${id}', switchT: 0 })`); await T('t.tick(40)'); await shot('gun-' + id + '-hip');
    await T("t.press('aim')"); await T('t.tick(16)'); await shot('gun-' + id + '-ads'); await T("t.release('aim')"); await T('t.tick(16)');
  }
}

if (want.has('marks')) {
  await goMap('C1E2M05'); opened = false; await T("t.setup_clearEnemies(); t.setup_player({ " + KIT + ", weapon: 'scattergun' })");
  const ev = (list) => page.evaluate((l) => { window.__GAME_TEST__.view().handleEvents(l); }, list);
  // the aisle: the player at cell (30, 22) looking south at the apses; the fight happens 6-10 m in front of them, against the south wall (z = 58)
  await T('t.setup_teleport(60, 44, ' + YAW.south + ')'); await T('t.tick(5)'); await T('t.render(0.02)');
  await shot('marks-0-before');
  const hits = []; for (const [x, z] of [[58, 52], [60, 53], [62, 52], [60, 51], [64, 53], [56, 53]]) hits.push({ type: 'enemy_hit', kind: 'tollbearer', id: 1, x, z });
  await ev([...hits, ...hits, { type: 'enemy_died', kind: 'tollbearer', id: 1, x: 60, z: 52 }, { type: 'enemy_died', kind: 'gill', id: 2, x: 66, z: 51 }, { type: 'enemy_died', kind: 'tollbearer', id: 3, x: 54, z: 51 }, { type: 'explode', x: 74, y: 0.5, z: 52 },
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ type: 'impact', x: 50 + i * 2.2, y: 0.8 + (i % 4) * 0.4, z: 58.4 })), { type: 'melee_hit', kind: 'axe', x: 60, z: 51, killed: false }]);
  await T('t.render(0.5)'); await T('t.render(2.5)'); await shot('marks-1-after');
  await T('t.setup_teleport(60, 49, ' + YAW.south + ')'); await T('t.setup_player({ pitch: -0.5 })'); await shot('marks-2-floor');
  await T('t.setup_player({ pitch: 0 })'); await T('t.setup_teleport(66, 46, ' + (Math.PI * 0.8) + ')'); await shot('marks-3-scorch');
}

if (want.has('rooms')) {
  await goMap('C1E2M05'); opened = false;
  for (const n of ['02-the-inert-pods', '03-the-aisle', '04-rows-of-pods', '05-the-arch', '06-middle-bay', '08-table-room-door', '11-the-graft-table']) await view('C1E2M05', n);
  await T("t.setup_teleport(26, 44, " + YAW.south + ")"); await T('t.setup_player({ pitch: -0.05 })'); await shot('rooms-apse-south');
  await T("t.setup_teleport(26, 44, " + YAW.north + ")"); await T('t.setup_player({ pitch: -0.05 })'); await shot('rooms-apse-north');
  await T("t.setup_teleport(100, 40, -1.18)"); await T('t.setup_player({ pitch: 0.05 })'); await shot('rooms-table-corner');
  await goMap('C1E1M04'); opened = false;
  for (const n of ['09-office', '15-hatch-from-office', '16-vault-panel-tell', '17-vault-panel-near']) await view('C1E1M04', n);
  await T("t.setup_teleport(97, 53, " + YAW.south + ")"); await T('t.setup_player({ pitch: -0.12 })'); await shot('rooms-hatch-close');
}

if (want.has('shield')) {
  await goMap('C1E1M08'); opened = false;
  for (const n of ['10-cantor-close', '12-ring-node']) await view('C1E1M08', n);
  const c = await page.evaluate(() => { const e = window.__GAME_TEST__.view().world.enemies.find((x) => x.kind === 'cantor' && x.state !== 'dead'); return e ? { x: e.x, z: e.z } : null; });
  if (c) { await view('C1E1M08', '10-cantor-close'); await page.evaluate((p) => { window.__GAME_TEST__.view().handleEvents([{ type: 'shield_hit', id: 1, x: p.x, z: p.z }]); }, c); await T('t.render(0.12)'); await shot('shield-hit'); await T('t.render(0.4)'); await shot('shield-ripple'); }
}

const report = [];
if (want.has('ui')) {
  const complete = { stats: { kills: 38, items: 10, secrets: 0, time: 203, damageTaken: 37, total: { enemies: 44, items: 40, secrets: 1 } }, par: 800, rank: 'B', score: 0.69, gain: 1, difficulty: 'easy', record: { rank: 'B' }, mapName: 'The Drowned Chandlery', outro: 'Next: Lamplighter Hill. The survivors are signalling by lamp.', hasNext: true, nextName: 'Lamplighter Hill', progress: { salvage: 6, tiers: {} }, lockerNote: '' };
  const SCREENS = [['title', { canContinue: true, note: '' }], ['pause', { canLoad: true, note: '' }], ['dead', { canLoad: true }], ['complete', complete]];
  for (const [w, h] of [[1280, 720], [800, 600]]) {
    await page.setViewport({ width: w, height: h });
    for (const [name, data] of SCREENS) {
      await page.evaluate(`window.__GAME_TEST__.showScreen(${JSON.stringify(name)}, ${JSON.stringify(data)})`);
      if (name === 'pause') await page.evaluate("document.getElementById('settings-box').open = true");
      await new Promise((r) => setTimeout(r, 250));
      const m = await page.evaluate((n) => { const p = document.querySelector('#screen-' + n + ' .panel').getBoundingClientRect(), bad = []; for (const b of document.querySelectorAll('#screen-' + n + ' button')) { const r = b.getBoundingClientRect(); if (r.width && (r.right > innerWidth + 1 || r.left < -1)) bad.push(b.id || b.textContent); } return { panel: [Math.round(p.width), Math.round(p.height)], window: [innerWidth, innerHeight], fits: p.height <= innerHeight + 1, buttonsOutsideWindow: bad }; }, name);
      report.push({ screen: name, size: `${w}x${h}`, ...m }); await savePng(page, path.join(out, `ui-${name}-${w}x${h}.png`));
    }
  }
}
console.log(JSON.stringify({ errors, report }, null, 1));
await browser.close(); await server.close(); process.exit(errors.length ? 1 : 0);
