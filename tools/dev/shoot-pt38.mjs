// REAL-GAME stills of the Act B engine pieces (PT-038), in ONE headless-Chrome job (idle priority, two cores: tools/dev/low.ps1; LOW_CWD=<dir> from a worktree): the Deep Range's hall dark and with the lantern lit (the
// HUD's oil gauge), a Zealot sponge from the front, the back and a thrust, the tunnel's sleepers, the bowl, the chime grove (a chime struck, the tree playing its phrase) and the hit of a lance (the graft).
//   node tools/dev/shoot-pt38.mjs [outDir] [what,...]  -> <outDir>/*.png (default review/pt-038) and the probes as JSON      what = hall,zealot,bowl,grove
import { savePng } from './savepng.mjs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..'), out = path.resolve(process.argv[2] ?? path.join(root, 'review/pt-038'));
const want = new Set((process.argv[3] ?? 'hall,zealot,bowl,grove').split(','));
fs.mkdirSync(out, { recursive: true });
const port = 5279, server = await createServer({ root, logLevel: 'error', server: { port, strictPort: true } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.evaluateOnNewDocument(() => { navigator.getGamepads = () => [null, null, null, null]; }); await page.setViewport({ width: 1280, height: 720 });
const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const shot = async (name, wait = 900) => { await sleep(wait); await savePng(page, path.join(out, name + '.png')); console.log('shot', name); };
const R = { errors, probes: {} };
const deep = JSON.parse(fs.readFileSync(path.join(root, 'maps-dev/DEEP.json'), 'utf8'));
const first = (kind, f = () => true) => deep.entities.find((e) => (e.kind === kind) && f(e));
const frames = async (n = 5) => { for (let i = 0; i < n; i++) await T('t.render(0.05)'); };
/** stand `dist` metres south of a cell (looking north), at a yaw */
const stand = async (cx, cz, dist, pitch = -0.08, yaw = 0, side = 0) => { await T(`t.setup_teleport(${(cx + 0.5) * 2 + side}, ${(cz + 0.5) * 2 + dist}, ${yaw}); t.setup_player({ pitch: ${pitch}, hp: 100000 })`); await T('t.tick(3)'); await frames(4); };
await T("t.newGame('normal', 3, { mapId: 'DEEP' })"); await T('t.clearOverlays()');

if (want.has('hall')) {
  await T('t.setup_teleport(25, 121, -1.57); t.setup_player({ pitch: -0.05, hp: 100000 })'); await T('t.tick(2)'); await frames(6); await shot('hall-1-dark-lamp-out');
  await T("t.press('lamp')"); await T('t.tick(2)'); await T("t.release('lamp')"); await T('t.tick(30)'); await frames(8); R.probes.lamp = (await T('t.state()')).player; await shot('hall-2-lamp-lit');
  const oil = deep.entities.filter((e) => e.kind === 'oil')[1]; await stand(oil.at[0], oil.at[1], 0, -0.05, -1.57); await T('t.tick(40)'); await frames(6); await shot('hall-3-tunnel');
}
if (want.has('zealot')) {
  const sp = first('zealot', (e) => e.hold === 'inert'), sp2 = deep.entities.filter((e) => e.kind === 'zealot' && e.hold === 'inert')[1];
  await T("t.setup_wakeAll && 0"); await stand(sp.at[0], sp.at[1], 4.6, -0.12, 0); await shot('zealot-1-sponge-front');
  await stand(sp2.at[0], sp2.at[1], -4.6, -0.12, Math.PI); await shot('zealot-2-sponge-back');
  // a live Zealot lunging: wake the sleepers and let one reach us
  const live = deep.entities.filter((e) => e.kind === 'zealot' && !e.hold)[0]; await stand(live.at[0], live.at[1], 5.5, -0.1, 0); await T('t.setup_wakeAll()');
  for (let i = 0; i < 30; i++) { await T('t.tick(6)'); await frames(1); const st = await T('t.state()'); if ((st.player?.graft ?? 0) > 0) break; }
  await frames(3); await shot('zealot-3-live', 200); R.probes.afterZealot = { hp: (await T('t.state()')).player.hp };
}
if (want.has('bowl')) { await T('t.setup_teleport(46, 22, 3.14); t.setup_player({ pitch: -0.35, hp: 100000 })'); await T('t.tick(2)'); await T("t.press('lamp')"); await T('t.tick(2)'); await T("t.release('lamp')"); await T('t.tick(10)'); await frames(8); await shot('bowl-1-rim'); await T('t.setup_teleport(46, 34, 3.14); t.setup_player({ pitch: -0.1 })'); await T('t.tick(2)'); await frames(6); await shot('bowl-2-below'); }
if (want.has('grove')) {
  const tree = first('chimetree'), c = (n) => deep.entities.find((e) => e.id === 'c' + n);
  await stand(tree.at[0], tree.at[1], 7.5, -0.05, 0); await T("t.press('lamp')"); await T('t.tick(2)'); await T("t.release('lamp')"); await T('t.tick(10)'); await frames(8); await shot('grove-1');
  // use the tree: its fruit light in order
  await T(`t.setup_teleport(${(tree.at[0] + 0.5) * 2}, ${(tree.at[1] + 0.5) * 2 + 2.3}, 0); t.setup_player({ pitch: -0.1 })`); await T('t.tick(2)'); await T("t.press('use')"); await T('t.tick(2)'); await T("t.release('use')");
  await T('t.setup_teleport(' + ((tree.at[0] + 0.5) * 2) + ', ' + ((tree.at[1] + 0.5) * 2 + 4.2) + ', 0); t.setup_player({ pitch: 0.12 })'); await T('t.tick(50)'); await frames(4); await shot('grove-2-tree-playing-1', 100); await T('t.tick(42)'); await frames(4); await shot('grove-3-tree-playing-2', 100); await T('t.tick(120)');
  // strike a chime
  const c1 = c(1); await T(`t.setup_teleport(${(c1.at[0] + 0.5) * 2}, ${(c1.at[1] + 0.5) * 2 + 1.6}, 0); t.setup_player({ pitch: -0.2 })`); await T('t.tick(2)'); await T("t.press('use')"); await T('t.tick(2)'); await T("t.release('use')"); await T('t.tick(8)'); await frames(3); await shot('grove-4-chime-struck', 100);
  R.probes.chimes = await T('t.state()').then((s) => s.audio?.last);
}
console.log(JSON.stringify(R, null, 1));
await browser.close(); await server.close(); process.exit(errors.length ? 1 : 0);
