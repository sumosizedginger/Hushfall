// REAL-GAME probes of the Act B pieces that the node tests cannot see (PT-039), in ONE headless-Chrome job (idle priority, two cores: tools/dev/low.ps1): every one of the nine maps loads and is stepped and drawn without a page error,
// the Sub-Cantor is drawn as tall as the sim says, a ring that turns back is drawn on both legs, a Drowned wears a tint, the Echo Markets' hall and the dark of the Ossuary draw. Prints JSON {checks, errors}; exit 1 on a failed check.
//   node tools/dev/probe-actb.mjs
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..'), port = 5291;
const server = await createServer({ root, logLevel: 'error', server: { port, strictPort: true } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.evaluateOnNewDocument(() => { navigator.getGamepads = () => [null, null, null, null]; }); await page.setViewport({ width: 960, height: 540 });
const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const checks = [], check = (name, ok, detail = '') => { checks.push({ name, ok: !!ok, detail }); };
for (const id of ['C2M09', 'C2M10', 'C2M11', 'C2M12', 'C2S01', 'C2M13', 'C2M14', 'C2M15', 'C2M16']) {
  const n0 = errors.length; await T(`t.newGame('normal', 3, { mapId: '${id}' })`); await T('t.clearOverlays()'); await T('t.tick(120)'); for (let i = 0; i < 4; i++) await T('t.render(0.05)');
  const st = await T('t.state()'); check(`${id} loads, steps 2 s and draws without an error`, errors.length === n0 && st.player.hp > 0, `errors ${errors.length - n0}`);
}
{ await T("t.newGame('normal', 3, { mapId: 'C2M16' })"); await T('t.clearOverlays()'); await T('t.setup_clearEnemies()'); const p0 = (await T('t.state()')).player;
  const sc = await T(`t.setup_spawnEnemy('subcantor', ${p0.x + 9}, ${p0.z}, ${Math.PI / 2}, 'idle')`); await T('t.setup_player({ hp: 100000 })'); await T('t.tick(2)'); for (let i = 0; i < 4; i++) await T('t.render(0.05)');
  const eb = (await T('t.enemyBounds()')).find((q) => q.id === sc), hgt = eb && eb.max[1] - eb.min[1];
  check('the Sub-Cantor is drawn: a real box, as tall as the sim says (3.8 m)', !!eb && [...eb.min, ...eb.max].every(Number.isFinite) && Math.abs(hgt - 3.8) < 0.45, `height ${hgt?.toFixed?.(2)}`);
  await T('t.setup_clearEnemies()'); await T(`t.setup_pulse(${p0.x + 9}, ${p0.z}, 12)`); let outView = 0, backSeen = false, backView = 0;
  for (let i = 0; i < 80 && !backSeen; i++) { await T('t.tick(6)'); await T('t.render(0.02)'); const pr = await T('t.pulseProbe()'); outView = Math.max(outView, pr.views); if (pr.pulses.some((q) => q.back)) { backSeen = true; await T('t.render(0.02)'); backView = (await T('t.pulseProbe()')).views; } }
  check('a ring that turns back is drawn going out and coming home', backSeen && outView >= 1 && backView >= 1, `out ${outView}, turned ${backSeen}, back ${backView}`); }
{ await T("t.newGame('normal', 3, { mapId: 'C2M12' })"); await T('t.clearOverlays()'); await T('t.setup_clearEnemies()'); const p0 = (await T('t.state()')).player;
  const a = await T(`t.setup_spawnEnemy('tollbearer', ${p0.x + 3}, ${p0.z}, 0, 'idle')`), d = await T(`t.setup_spawnEnemy('tollbearer', ${p0.x + 5}, ${p0.z}, 0, 'idle', 'drowned')`); await T('t.tick(2)'); for (let i = 0; i < 3; i++) await T('t.render(0.05)');
  const ca = await T(`t.tintProbe(${a})`), cd = await T(`t.tintProbe(${d})`);
  check('a Drowned wears its kind\'s rig in a tint: the same Tollbearer in a different colour', ca != null && cd != null && ca !== cd, `plain ${ca?.toString?.(16)}, drowned ${cd?.toString?.(16)}`); }
{ await T("t.newGame('normal', 3, { mapId: 'C2M13' })"); await T('t.clearOverlays()'); await T('t.tick(2)'); for (let i = 0; i < 3; i++) await T('t.render(0.05)'); const lp = await T('t.lampProbe()');
  check('the Ossuary is dark with a held lantern and an oil gauge', !!lp.lamp && lp.hud.shown && /OIL/.test(lp.hud.label), JSON.stringify(lp.hud)); }
console.log(JSON.stringify({ checks, errors }, null, 1));
await browser.close(); await server.close(); process.exit(checks.every((c) => c.ok) && !errors.length ? 0 : 1);
