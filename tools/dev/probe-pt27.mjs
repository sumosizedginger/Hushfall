// A SHORT real-game probe of the PT-027 features (the mortar, a breathing gate, spore beds): the same three checks as tools/dev/browser-check.mjs (section "Episode 3, Batch B"), run alone in about a minute, so a
// mistake in them costs a minute and not a whole browser check. One headless-Chrome job: run it with tools/dev/low.ps1 (idle priority, two cores) while the machine-load rule stands.
//   node tools/dev/probe-pt27.mjs      -> JSON of the three probes, exit 1 on a console error or a failed expectation
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..');
const server = await createServer({ root, logLevel: 'error', server: { port: 5268, strictPort: true } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:5268/', { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const text = (id) => page.$eval('#' + id, (e) => e.textContent);
const R = { errors }; let ok = true; const check = (name, pass, detail) => { R[name] = { pass: !!pass, detail }; if (!pass) ok = false; console.log(pass ? 'PASS' : 'FAIL', name, detail ?? ''); };

await T("t.newGame('normal', 3, { mapId: 'C1E3M03' })"); await T('t.clearOverlays()');
{ await T('t.setup_clearEnemies(); t.setup_teleport(84, 47, -Math.PI / 2); t.setup_player({ pitch: -0.1 })'); const p = (await T('t.state()')).player; await T("t.setup_player({ weapons: ['flare'], weapon: 'flare', ammo: { flare: 8, rocket: 0 } })"); await T(`t.setup_addPickup('weapon_mortar', ${p.x}, ${p.z})`); await T('t.tick(3)'); await sleep(700);
  const st = await T('t.state()'); let hud = await text('hud-weapons'); for (let k = 0; k < 16 && !/MORTAR/.test(hud); k++) { await sleep(250); hud = await text('hud-weapons'); }          // the HUD is drawn by the page's own frame loop: wait for it
    const toast = await text('toasts'), label = await text('hud-ammo-label');
  check('mortar pickup equips it', st.player.weapon === 'mortar' && st.player.ammo.rocket === 6 && /0 MORTAR/.test(hud) && /ROCKETS/.test(label) && toast.includes('Bell-breaker'), JSON.stringify({ weapon: st.player.weapon, rockets: st.player.ammo.rocket, hud, label, toast: toast.replace(/\s+/g, ' ').trim().slice(0, 80) }));
  await T('t.tick(60)'); await T('t.render(0.02)'); const ring = (await T('t.breathProbe()')).ring;
  await T("t.press('fire')"); await T('t.tick(2)'); await T("t.release('fire')"); await T('t.tick(20)'); await T('t.render(0.02)'); const after = await T('t.state()'), fx = await T('t.breathProbe()');
  check('mortar ring and shot', !!ring?.visible && Math.abs(ring.y) < 0.5 && after.player.ammo.rocket === 4 && fx.shells === 1, JSON.stringify({ ring, rockets: after.player.ammo.rocket, shells: fx.shells })); }
await T("t.newGame('normal', 3, { mapId: 'C1E3M02', realtime: true })"); await T('t.setup_clearEnemies(); t.clearOverlays()');
{ await T('t.setup_teleport(40, 50.4, -Math.PI / 2)'); await T('t.render(0.02)'); const gate1 = (pr) => pr.gates.find((x) => x.cx === 23), g0 = gate1(await T('t.breathProbe()')); await T('t.tick(60 * 7)'); await T('t.render(0.02)'); const g1 = gate1(await T('t.breathProbe()')); await T('t.setup_teleport(44.8, 51.0, -Math.PI / 2)'); await sleep(900); const hint = await text('use-hint');
  check('breathing gate', g0.open === 1 && Math.abs(g0.y - g0.span) < 0.1 && g1.open === 0 && g1.y < 0.1 && /breathes in/.test(hint), JSON.stringify({ g0, g1, hint })); }
await T("t.newGame('normal', 3, { mapId: 'C1E3M03' })"); await T('t.setup_clearEnemies(); t.clearOverlays()');
{ await T('t.setup_teleport(57, 47, -Math.PI / 2); t.setup_player({ hp: 100, pitch: 0 })'); await T('t.tick(60)'); await T('t.render(0.02)'); const on = (await T('t.breathProbe()')).beds[0], hpOn = (await T('t.state()')).player.hp;
  await T('t.tick(60 * 4)'); await T('t.render(0.02)'); const off = (await T('t.breathProbe()')).beds[0], hp1 = (await T('t.state()')).player.hp; await T('t.tick(60)'); const hp2 = (await T('t.state()')).player.hp;
  check('spore beds', on.bed > 0.8 && on.mistVisible && hpOn < 100 && off.bed < 0.3 && !off.mistVisible && hp2 === hp1, JSON.stringify({ on, hpOn, off, hp1, hp2 })); }
console.log(JSON.stringify(R, null, 1));
await browser.close(); await server.close(); process.exit(errors.length || !ok ? 1 : 0);
