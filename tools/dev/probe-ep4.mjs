// REAL-GAME probes of the Episode 4 engine pieces that the node tests cannot see (PT-033): what the live page DRAWS against what the sim says. One headless-Chrome job (run it with tools/dev/low.ps1: the machine-load rule).
//   node tools/dev/probe-ep4.mjs        -> PASS / FAIL lines; exit code 1 if any fails
//   1. the Mirror Array (M04): turning the lesson mirror lights its receiver, the view draws bars of light, the receiver glows
//   2. a vent across the Hollow Stair (M07): the plate throws the player (the sim's arc), they land, the view has four plates
//   3. the Gate Warden (M08): the lid is shut and no beam is drawn while it waits; during the tell the lid is up; during the sweep the view draws the beam from the sim's own line; afterwards nothing is drawn
//   4. the Warden's shield: drawn while a seal stands, gone when none does
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..'), port = 5299;
const server = await createServer({ root, logLevel: 'error', server: { port, strictPort: true } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.setViewport({ width: 960, height: 540 });
const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const results = []; const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : JSON.stringify(detail)); };
const mapJson = (id) => page.evaluate(`fetch('/maps/${id}.json').then((r) => r.json())`);

// 1. the Mirror Array
await T("t.newGame('normal', 3, { mapId: 'C1E4M04' })"); await T('t.clearOverlays(); t.setup_openDoors(); t.setup_clearEnemies()');
{ await T('t.setup_teleport(25, 67, 0); t.setup_player({ pitch: 0, hp: 100000 })'); await T('t.tick(2)'); await T('t.render(0.02)'); const dark = await T('t.beamProbe()');
  await T('t.setup_mirrors({ m0: 3 })'); await T('t.tick(20)'); for (let i = 0; i < 30; i++) await T('t.render(0.05)'); const lit = await T('t.beamProbe()');
  check('the Mirror Array in the live game: a turned mirror lights its receiver, the view draws bars of light and the receiver glows', !dark.lit.includes('r0') && lit.lit.includes('r0') && lit.bars > dark.bars && lit.glow.r0 > 0.5, { dark: dark.lit, lit: lit.lit, bars: [dark.bars, lit.bars], glow: lit.glow.r0 }); }

// 2. a vent over the Hollow Stair
await T("t.newGame('normal', 3, { mapId: 'C1E4M07' })"); await T('t.setup_clearEnemies(); t.clearOverlays()');
{ const m = await mapJson('C1E4M07'), v = m.vents[0], x = (v.at[0] + 0.5) * 2, z = (v.at[1] + 0.5) * 2;
  await T('t.tick(2)'); await T('t.render(0.02)'); const ground = await T('t.airProbe()');                                          // at the start, on the ground
  await T(`t.setup_teleport(${x}, ${z}, -0.8); t.setup_player({ pitch: 0, hp: 100000 })`); await T('t.tick(2)');
  await T('t.tick(90)'); await T('t.render(0.02)'); const flying = await T('t.airProbe()'); await T(`t.tick(${Math.round((v.time + 1.5) * 60)})`); await T('t.render(0.02)'); const landed = await T('t.airProbe()');
  check('a vent across the Hollow in the live game: the plate throws the player up and across, they land, and the view draws four plates', ground.air === false && flying.air && flying.y > 6 && !landed.air && flying.ventViews === 4, { ground, flying, landed }); }

// 3. the Gate Warden
await T("t.newGame('normal', 3, { mapId: 'C1E4M08' })"); await T('t.clearOverlays(); t.setup_openDoors()');
{ await T('t.setup_teleport(101, 55, -1.57); t.setup_player({ pitch: 0.1, hp: 100000 })'); await T('t.render(0.02)'); const rest = await T('t.sweepProbe()'); const sh1 = (await T('t.encounterProbe()')).shield;
  await T('t.tick(60 * 7.5)'); await T('t.render(0.02)'); const tell = await T('t.sweepProbe()');
  await T('t.tick(60 * 1.5)'); await T('t.render(0.02)'); const beam = await T('t.sweepProbe()');
  await T('t.tick(60 * 3)'); await T('t.render(0.02)'); const done = await T('t.sweepProbe()');
  check('the Gate Warden in the live game: lid shut and nothing drawn at rest; in the tell the lid is up; in the sweep the view draws the beam from the sim\'s line; afterwards nothing', rest.lid > -0.5 && rest.drawn === 0 && tell.sweepT >= 0 && tell.sweepT < 2.4 && tell.lid < -0.9 && !tell.beam && beam.beam && beam.drawn >= 3 && beam.linePts >= 2 && done.sweepT < 0 && done.drawn === 0, { rest, tell, beam, done });
  await T('t.setup_killNodes()'); await T('t.render(0.02)'); const sh0 = (await T('t.encounterProbe()')).shield;
  check('the Warden\'s shield is drawn while the three seals stand and gone when none does', rest.seals === 3 && !!sh1 && sh0 === null, { seals: rest.seals, sh1, sh0 }); }

console.log(JSON.stringify({ errors }));
await browser.close(); await server.close();
const failed = results.filter((r) => !r.ok).length + errors.length; console.log(failed ? `${failed} problem(s)` : 'all probes pass'); process.exit(failed ? 1 : 0);
