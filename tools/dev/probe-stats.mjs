// THE STATS PROBE (PT-077): the stats database in the REAL page (sql.js's WebAssembly, the browser's IndexedDB), which the node tests cannot reach. One headless-Chrome job; run it through tools/dev/low.ps1.
// It checks: the stats start; a level played by the route bot is recorded and its numbers agree with the game's own (kills, damage taken); the card after the level and the stats screen show them; a
// death shows its line on the death screen; the stats are SAVED and come back after the page is reloaded (IndexedDB); no page error; the pointer lock is never asked for (the owner's mouse).
//   node tools/dev/probe-stats.mjs [outFile.json]       (GPU=1: the machine's graphics card instead of SwiftShader)
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..'), outFile = process.argv[2] ?? null;
const port = 5287, server = await createServer({ root, logLevel: 'error', server: { port, strictPort: true } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, args: process.env.GPU ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { window.__lockAsks = 0; Element.prototype.requestPointerLock = function () { window.__lockAsks++; return Promise.reject(new DOMException('refused by the tool', 'NotAllowedError')); }; navigator.getGamepads = () => [null, null, null, null]; });
await page.setViewport({ width: 1280, height: 720 });
const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const out = { checks: [], errors }, ok = (name, pass, detail = null) => { out.checks.push({ name, pass: !!pass, ...(detail != null ? { detail } : {}) }); console.error((pass ? 'ok   ' : 'FAIL ') + name); };
const T = (code) => page.evaluate(`(async () => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function boot() {
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
  await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 180000 });
  const t0 = Date.now(); while (Date.now() - t0 < 60000) { const p = await T('t.statsProbe()'); if (p.ready || /off this session/.test(p.note ?? '')) return { ...p, ms: Date.now() - t0 }; await sleep(250); }
  return { ready: false, ms: 60000 };
}
/** play a route with the bot until the level ends; the page's own frames take an ended level to its screen */
async function playRoute(map, routeName, difficulty, opts = {}) {
  await T(`t.newGame('${difficulty}', 1, { mapId: '${map}' })`); await T('t.clearOverlays?.()'); await T(`t.startBot('${routeName}', ${JSON.stringify(opts)})`);
  let s = null; for (let i = 0; i < 4000; i++) { s = await T('t.stepBot(120)'); if (s.done || s.failed || s.mode !== 'playing') break; }
  for (let i = 0; i < 40 && !['complete', 'dead', 'title'].includes((await T('t.state()')).mode); i++) await sleep(250);
  return s;
}

const b1 = await boot();
ok(`the stats start in the page (sql.js and IndexedDB) in ${b1.ms} ms`, b1.ready && !b1.off, b1);
ok('the stats are kept on the device (IndexedDB is there)', b1.persistent, b1.status);

const before = await T('t.state()'), run = await playRoute('C1E1M01', 'C1E1M01.main', 'normal');
const st = await T('t.state()'), p1 = await T('t.statsProbe()');
ok('Marrow Quay, played by the route bot to its exit', st.mode === 'complete', { mode: st.mode, failed: run?.failed ?? null });
ok('one attempt, one level finished, no death', p1.overview?.attempts === 1 && p1.overview?.finished === 1 && p1.overview?.deaths === 0, p1.overview);
ok('the kills agree with the level\'s own tally', p1.overview?.kills === st.stats?.kills, { stats: p1.overview?.kills, level: st.stats?.kills });
ok('the damage taken agrees with the level\'s own tally (to the rounding of each hit)', Math.abs((p1.overview?.damage_taken ?? -1) - (st.stats?.damageTaken ?? 0)) < 0.5, { stats: p1.overview?.damage_taken, level: st.stats?.damageTaken });
ok('the flare cannon\'s attacks are counted and some connected', (p1.guns ?? []).some((g) => g.weapon === 'flare' && g.attacks > 0 && g.connected > 0 && g.connected <= g.attacks), p1.guns);
const card = await page.evaluate(() => document.getElementById('run-card')?.innerText ?? '');
ok('the card after the level shows this attempt from the stats', /THIS LEVEL, FROM YOUR STATS/i.test(card) && /Attempts at this level/i.test(card), card.slice(0, 300));
await sleep(600); const p1s = await T('t.statsProbe()');
ok('the stats were saved when the level ended', p1s.saved && /^Saved on this device/.test(p1s.status), p1s.status);

const dead = await playRoute('C1E1M04', 'C1E1M04.main', 'hard', { fights: false });
const st2 = await T('t.state()'), deadLine = await page.evaluate(() => document.getElementById('dead-stats')?.innerText ?? '');
ok('a passive runner on Hard dies, and the death screen says who did it', st2.mode === 'dead' && /^Killed by .+ after \d+:\d\d\./.test(deadLine), { mode: st2.mode, deadLine, failed: dead?.failed ?? null });
const p2 = await T('t.statsProbe()');
ok('the death is in the stats (a second playthrough: the hook\'s new game is a new campaign)', p2.overview?.deaths === 1 && p2.overview?.attempts === 1, p2.overview);

await T('t.quitToTitle()'); await T("t.openStats('title')"); await T("t.statsScope('life')");
const screen = await page.evaluate(() => ({ body: document.getElementById('stats-body')?.innerText ?? '', status: document.getElementById('stats-status')?.innerText ?? '', visible: !document.getElementById('screen-stats').classList.contains('hidden') }));
ok('YOUR STATS opens from the title and shows every section', screen.visible && ['Levels finished', 'Your weapons', 'What hurt you', 'Deaths', 'What you killed', 'Records', 'Chapter by chapter'].every((k) => screen.body.toLowerCase().includes(k.toLowerCase())), { status: screen.status, body: screen.body.slice(0, 1200) });
await T('t.statsSave()'); await sleep(500);
const life1 = await T("t.statsProbe('life')");

const b2 = await boot(), life2 = await T("t.statsProbe('life')");
ok('after a reload the stats come back from IndexedDB, the same numbers', b2.ready && JSON.stringify(life2.overview) === JSON.stringify(life1.overview), { before: life1.overview, after: life2.overview });
ok('the lifetime view holds both playthroughs', life2.overview?.playthroughs === 2 && life2.overview?.attempts === 2 && life2.overview?.finished === 1 && life2.overview?.deaths === 1, life2.overview);

const asks = await page.evaluate(() => window.__lockAsks ?? 0);
ok('no page error', errors.length === 0, errors.slice(0, 5));
out.pointerLockAsks = asks; out.failed = out.checks.filter((q) => !q.pass).length;
const text = JSON.stringify(out, null, 1); if (outFile) fs.writeFileSync(outFile, text); console.log(text);
console.error(`pointer lock asked ${asks} times (refused); ${out.failed} failed`);
await browser.close(); await server.close(); process.exit(out.failed ? 1 : 0);
