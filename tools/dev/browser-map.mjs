// Per-map REAL-GAME evidence (Gate 3, R3): one map, or any set of maps, checked in the live game page in headless Chrome without running the whole 10+ minute browser check.
//   node tools/dev/browser-map.mjs <ID> [<ID> ...]      or      node tools/dev/browser-map.mjs --all
// For each map it runs EVERY route of the map (routes/<ID>.*.route.json) in the real game and compares tick count and state hash with the headless Node sim, watches the HUD
// (objective line, boss bar and shield note when the map has a boss), and runs the render-truth census (every enemy of this map drawn on the floor the sim stands it on, asleep, awake,
// every pose, dying, dead, moving floors, the boss encounter if there is one). It writes validation/browser/<ID>.json, stamped with the map's sha, its routes' sha, the source sets it
// depends on and the commit: validate.mjs derives AGENT_VERIFIED from it (and from the shared browser check, which is about code, not content).
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { textSha, sourceShas, routesSha } from '../textsha.mjs';
import { pickMaps } from '../mapset.mjs';
import { runRouteParity } from './route-parity.mjs';
import { runRenderCensus } from './render-census.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const args = process.argv.slice(2), portArg = args.indexOf('--port'), port = portArg >= 0 ? +args[portArg + 1] : 0;
let maps; try { maps = pickMaps(root, (portArg >= 0 ? args.filter((x, i) => i !== portArg && i !== portArg + 1) : args)); } catch (e) { console.error(e.message); process.exit(2); }
if (!maps.length) { console.error('usage: node tools/dev/browser-map.mjs <ID> [<ID> ...] | --all'); process.exit(2); }
const sh = (c) => { try { return execSync(c, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return null; } };
const { ENEMIES } = await import(pathToFileURL(path.join(root, 'src/engine/defs.js')).href);
fs.mkdirSync(path.join(root, 'validation/browser'), { recursive: true });

const server = await createServer({ root, logLevel: 'error', server: { port: port || 5340 + (process.pid % 40), strictPort: !!port } });
await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
let errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e)); page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(`http://localhost:${server.config.server.port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const visible = (id) => page.$eval('#' + id, (e) => !e.classList.contains('hidden'));
const text = (id) => page.$eval('#' + id, (e) => e.textContent);

let anyFailed = false;
for (const m of maps) {
  const id = m.id, t0 = Date.now(); errors = [];
  const checks = [], check = (name, ok, detail = '') => { checks.push({ name, ok: !!ok, detail: String(detail).slice(0, 700) }); console.log(ok ? 'PASS' : 'FAIL', `[${id}]`, name, String(detail).slice(0, 160)); };
  const src = JSON.parse(fs.readFileSync(path.join(root, 'maps', id + '.json'), 'utf8')), kinds = (src.entities ?? []).filter((e) => e.type === 'enemy').map((e) => e.kind);
  const hasBoss = kinds.some((k) => ENEMIES[k]?.boss), hasNodes = kinds.some((k) => ENEMIES[k]?.node);
  const hud = { objective: false, boss: false, shield: false }, routes = {};
  for (const name of m.routes) {
    const p = await runRouteParity({ T, root }, id, name, { onStep: async () => {
      hud.objective = hud.objective || (await text('objective')).startsWith('OBJECTIVE');
      if (hasBoss) { hud.boss = hud.boss || (await visible('boss')); hud.shield = hud.shield || (await text('boss-note')).includes('SHIELDED'); }
    } });
    routes[name] = p;
    check(`real-game route ${id}.${name}: completes in the browser`, p.ok, `status=${p.status} failed=${p.failed} ticks=${p.ticks} wall=${p.wallSeconds}s`);
    check(`real-game route ${id}.${name}: browser sim == Node sim (ticks + state hash)`, p.agree, `browser ${p.ticks}/${p.hash} vs node ${p.nodeTicks}/${p.nodeHash}`);
  }
  if (!m.routes.length) check(`${id} has a canonical route to play in the real game`, false, `routes/${id}.main.route.json is missing`);
  if (hasBoss) check(`${id}: the boss bar appeared during the route${hasNodes ? ' and said the Cantor is shielded while its ring stands' : ''}`, hud.boss && (!hasNodes || hud.shield), JSON.stringify(hud));
  const rt = []; const census = await runRenderCensus({ T, root, check: (name, ok, detail) => { rt.push({ name, ok: !!ok }); check(name, ok, detail); }, shot: null, log: () => {}, only: [id] });
  check('render truth: the census ran on this map (its enemies were really measured)', rt.length >= 4 && (census.maps[id]?.enemies ?? 0) === (src.entities ?? []).filter((e) => e.type === 'enemy').length, `${census.maps[id]?.enemies} enemies measured of ${kinds.length} placed`);
  check('no uncaught exceptions or console errors while this map was played', errors.length === 0, errors.slice(0, 3).join(' | '));
  const e = census.maps[id] ?? {}, brief = (j) => j && { rows: j.n, raised: j.raised, violations: j.bad.length, deepest: j.worstBuried, highest: j.worstFloat };
  const evidence = {
    mapId: id, when: new Date().toISOString(), commit: sh('git rev-parse --short HEAD'), dirtySource: (sh("git status --porcelain -- . ':!review' ':!validation'") ?? '').length > 0,
    env: { browser: 'headless Chrome', gl: 'SwiftShader (software GL)', note: 'NOT a real-GPU measurement' },
    mapSha: textSha(path.join(root, 'maps', id + '.json')), routesSha: routesSha(root, id), sources: sourceShas(root),
    routes: Object.fromEntries(Object.entries(routes).map(([k, v]) => [k, { ok: v.ok, ticks: v.ticks, hash: v.hash, nodeTicks: v.nodeTicks, nodeHash: v.nodeHash, agree: v.agree, kills: v.kills, secrets: v.secrets, wallSeconds: v.wallSeconds }])),
    hud, census: { enemies: e.enemies ?? 0, asleep: brief(e.asleep), awake: brief(e.awake), matrix: brief(e.matrix), dying: brief(e.dying), corpses: brief(e.corpses), movingFloors: census.movingFloors.map((f) => ({ sector: f.sector, low: f.low, high: f.high, phases: f.phases.map(brief) })), cantor: census.cantor ? { problems: census.cantor.problems } : null },
    checks, wallSeconds: Math.round((Date.now() - t0) / 1000),
  };
  fs.writeFileSync(path.join(root, 'validation/browser', id + '.json'), JSON.stringify(evidence, null, 2));
  const failed = checks.filter((c) => !c.ok); if (failed.length) anyFailed = true;
  console.log(`${id}: ${checks.length - failed.length}/${checks.length} real-game checks passed (${evidence.wallSeconds}s) -> validation/browser/${id}.json`);
}
await browser.close(); await server.close();
process.exit(anyFailed ? 1 : 0);
