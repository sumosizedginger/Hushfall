// BOOT PROBE (PT-043, the owner: "all 4 of your dev levels are this black screen" = engine.js:92 threw on the title because AudioEngine.update read the player before its guard, and the per-frame loop died):
// the page's own frame loop with a RUNNING AudioContext (the flag below and a real unlock), on the title screen and in each dev map, with no page error and the loop still alive. A suspended context (headless Chrome's default) returns from
// AudioEngine.update before the code that failed, which is why no earlier browser job saw it. One headless-Chrome job, short: run with tools/dev/low.ps1.
//   node tools/dev/probe-boot.mjs [MAPID ...]      -> JSON; exit code 1 when a check fails
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..'), ids = process.argv.slice(2).length ? process.argv.slice(2) : ['HIVE', 'HIVEBOSS', 'BELLBOSS', 'HIVEEND'];
const port = 5285, server = await createServer({ root, logLevel: 'error', server: { port, strictPort: true } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage(); await page.evaluateOnNewDocument(() => { navigator.getGamepads = () => [null, null, null, null]; }); await page.setViewport({ width: 960, height: 540 });
const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const out = { checks: [], errors }, ok = (name, pass, detail = null) => out.checks.push({ name, pass: !!pass, ...(detail != null ? { detail } : {}) });
// the loop is alive when requestAnimationFrame callbacks of the page keep coming AND the shell's own frame keeps updating the audio clock
const alive = async (ms = 1500) => page.evaluate(`new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < ${ms}) requestAnimationFrame(f); else res(n); }; requestAnimationFrame(f); })`);
await T('t.audioUnlock()'); await new Promise((r) => setTimeout(r, 800));
const st = await T('t.state()'); ok('the audio context is running (the case that crashed)', st.audio?.state === 'running', st.audio);
const clock0 = await T('t.audioClock()'); await alive(1200); const clock1 = await T('t.audioClock()');
ok('the title screen: the shell\'s frame loop keeps calling the audio update (its clock advances)', clock1 > clock0 + 0.5, { clock0, clock1 });
ok('the title screen: no page error', errors.length === 0, errors.slice(0, 3));
for (const id of ids) {
  await T(`t.newGame('easy', 3, { mapId: '${id}' })`); await T('t.clearOverlays()');
  const c0 = await T('t.audioClock()'); await alive(1500); const c = await T('t.audioClock()');
  ok(`${id}: the frame loop is alive in the map with the audio running (clock ${c0.toFixed?.(2) ?? c0} -> ${c.toFixed?.(2) ?? c})`, c > c0 + 0.5, { c0, c });
  ok(`${id}: no page error so far`, errors.length === 0, errors.slice(0, 3));
}
const fails = out.checks.filter((q) => !q.pass); out.failed = fails.length;
console.log(JSON.stringify(out, null, 1));
await browser.close(); await server.close(); process.exit(fails.length || errors.length ? 1 : 0);
