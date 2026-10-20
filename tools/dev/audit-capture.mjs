// The look audit's capture (2026-10-13, "run the same audit yourself"): real-game stills of a map played by its canonical route bot, chosen by GAME STATE
// (the first enemy in view, a close one, a shot fired at one, a hit taken, a message, the boss bar, the automap, the exit and the intermission screen),
// not at fixed ticks. Appearance evidence only; the bot is not a person, and the frames are what a person would see at those moments.
// Usage:  node tools/dev/audit-capture.mjs <outDir> maps <ID[=lite]> ...   |   weapons   |   ui
// Run it through tools/dev/low.ps1 (idle priority, two cores). Writes <outDir>/images/*.png and appends <outDir>/index.jsonl.
import { savePng } from './savepng.mjs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const [outArg, mode = 'maps', ...rest] = process.argv.slice(2);
if (!outArg) { console.error('usage: audit-capture.mjs <outDir> maps <ID[=lite]>... | weapons | ui'); process.exit(2); }
const out = path.resolve(outArg), imgDir = path.join(out, 'images'); fs.mkdirSync(imgDir, { recursive: true });
const port = 5400 + (process.pid % 90);
const server = await createServer({ root, logLevel: 'error', server: { port, strictPort: false } });
await server.listen();
const realPort = server.config.server.port;
// GPU=1 uses the machine's own graphics card (the store pictures: PT-071 R23); VW / VH set the page size, WIDTH the game's render width (320..800)
const browser = await puppeteer.launch({ headless: true, args: process.env.GPU ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { navigator.getGamepads = () => [null, null, null, null]; Element.prototype.requestPointerLock = function () { return Promise.reject(new DOMException('refused by the tool', 'NotAllowedError')); }; });          // the owner's mouse: no page script of a driven browser may take the pointer lock
await page.setViewport({ width: Number(process.env.VW) || 1280, height: Number(process.env.VH) || 720 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e)); page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
await page.goto(`http://localhost:${realPort}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 180000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
if (process.env.WIDTH) await page.evaluate(`window.__GAME_TEST__.setSetting('autoQuality', false); window.__GAME_TEST__.setSetting('internalWidth', ${Number(process.env.WIDTH)})`);
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const log = (o) => fs.appendFileSync(path.join(out, 'index.jsonl'), JSON.stringify(o) + '\n');
const dom = () => page.evaluate(() => {
  const vis = (id) => { const e = document.getElementById(id); return !!e && !e.classList.contains('hidden') && getComputedStyle(e).display !== 'none' && e.textContent.trim().length > 0; };
  const t = window.__GAME_TEST__; const v = t.view();
  return { comms: vis('comms'), boss: vis('boss'), toast: (document.getElementById('toasts')?.children.length ?? 0) > 0, tip: vis('tips'), prompt: vis('use-hint'), hurt: v ? v.post.uniforms.uDamage.value : 0, mapOpen: t.mapOpen() };
});

async function runMap(spec) {
  const [id, flag] = spec.split('='); const lite = flag === 'lite';
  let n = 0, last = -1e9; const t0 = Date.now(); const counts = {};
  const shot = async (tag, extra = {}, force = false) => {
    const tick = (await T('t.state()')).tick;
    if (!force && tick - last < 80) return false; last = tick; n++;
    const file = `${id}__${String(n).padStart(2, '0')}__${tag}.png`;
    await T('t.render(0.02)'); await savePng(page, path.join(imgDir, file)); log({ file, map: id, tag, tick, ...extra }); console.log('shot', file); return true;
  };
  const cap = (k, max) => (counts[k] = (counts[k] ?? 0) + 1) <= max;
  await T(`t.newGame('easy', 3, { mapId: '${id}' })`); await sleep(500);
  await shot('arrival_card', {}, true);
  await T('t.clearOverlays()'); await shot('arrival', {}, true);
  const ops = (await T(`t.startBot('${id}.main')`)).ops;
  let s = await T('t.state()'), prevHp = s.player.hp, firstSight = false, close = false, fights = 0, hurts = 0, auto = false, done = false, tickCap = Number(process.env.TICKCAP) || 14000;
  const N = lite ? 4 : 8, progDone = new Set();
  while (true) {
    const near = Math.min(...s.enemies.filter((e) => e.state !== 'dead' && e.state !== 'idle').map((e) => Math.hypot(e.x - s.player.x, e.z - s.player.z)), 99);
    const r = await T(`t.stepBot(${near < 10 ? 6 : 30})`); s = r;
    if (r.mode === 'cinematic') { if (!counts.scene) { counts.scene = 1; await shot('scene', { hp: r.player?.hp }, true); } await T('t.skip_cinematic()'); s = await T('t.state()'); continue; }          // PT-063: a story scene stops the sim; the capture takes one frame of it and skips it
    if (r.mode === 'dying' || r.mode === 'dead') { await shot('death', { hp: r.player?.hp }, true); break; }
    if (r.done || r.mode === 'ending' || r.mode === 'complete') { done = true; break; }
    if (r.failed) { await shot('bot_failed', { op: r.op, ops }, true); break; }
    if (r.mode !== 'playing') break;
    const p = r.player, d = await dom();
    const fwd = [-Math.sin(p.yaw), -Math.cos(p.yaw)];
    const seen = r.enemies.filter((e) => e.state !== 'dead').map((e) => { const dx = e.x - p.x, dz = e.z - p.z, dist = Math.hypot(dx, dz); return { e, dist, ang: Math.acos(Math.max(-1, Math.min(1, (dx * fwd[0] + dz * fwd[1]) / (dist || 1)))) }; }).filter((o) => o.ang < 0.6).sort((a, b) => a.dist - b.dist);
    const view = seen[0];
    const extra = { hp: p.hp, weapon: p.weapon, op: r.op, ops, near: view ? +view.dist.toFixed(1) : null, kills: r.stats?.kills };
    if (p.hp < prevHp - 1 && hurts < 2 && d.hurt > 0.05) { if (await shot('hurt', { ...extra, flash: +d.hurt.toFixed(2), lost: prevHp - p.hp }, true)) hurts++; }      // PT-047 V1: the flash now follows the size of the hit (0.12 for a scratch), so fire on hit points lost and record the flash value
    else if (view && !firstSight && view.dist < 40) { if (await shot('first_sight', extra)) firstSight = true; }
    else if (view && !close && view.dist < 4) { if (await shot('close_enemy', extra)) close = true; }
    else if (view && p.cooldown > 0 && view.dist < 16 && fights < (lite ? 1 : 3) && (await shot('fight', extra))) fights++;
    else if (d.boss && cap('boss', 3) && !(await shot('boss', extra))) counts.boss--;
    else if (d.comms && cap('comms', lite ? 1 : 2) && !(await shot('message', extra))) counts.comms--;
    else if (d.prompt && cap('prompt', 1) && !(await shot('prompt', extra))) counts.prompt--;
    else if (d.toast && cap('toast', 1) && !(await shot('pickup_toast', extra))) counts.toast--;
    if (!auto && r.op / ops > 0.55 && r.tick > 600) {
      auto = true; await T("t.press('map'); t.tick(1); t.release('map')"); await sleep(350);          // (the map key opens the Journal and PAUSES since U2: resume afterwards or the run stops here)
      await shot('automap', extra, true); if ((await T('t.state()')).mode === 'paused') await T('t.resume()'); await sleep(150);
    }
    for (let k = 1; k <= N; k++) if (!progDone.has(k) && r.op / ops >= (k - 0.5) / N) { progDone.add(k); await shot('route_' + k + 'of' + N, extra); }
    prevHp = p.hp;
    if (r.tick > tickCap || Date.now() - t0 > 330000) { await shot('cutoff', extra, true); break; }
  }
  const end = await T('t.state()');
  let screen = null;
  if (done && !s.failed) {
    await shot('exit', { hp: end.player?.hp }, true);
    for (let i = 0; i < 40 && (await T('t.state()')).mode !== 'complete' && (await T('t.state()')).mode !== 'epilogue'; i++) await sleep(250);
    const m = (await T('t.state()')).mode; screen = m;
    if (m === 'epilogue') { await sleep(1800); await shot('epilogue', {}, true); }
    else if (m === 'complete') { await sleep(400); await shot('complete_screen', {}, true); }
  }
  const stats = end.stats ?? {}; log({ map: id, run: true, mode: end.mode, status: end.status, tick: end.tick, hp: end.player?.hp, kills: stats.kills, total: stats.total, damageTaken: stats.damageTaken, screen, secs: Math.round((Date.now() - t0) / 1000), frames: n });
}

async function runWeapons() {
  await T("t.newGame('normal', 3, { mapId: 'RANGE' })"); await sleep(400); await T('t.clearOverlays()');
  let n = 0; const shot = async (tag) => { n++; const f = `RANGE__${String(n).padStart(2, '0')}__${tag}.png`; await T('t.render(0.02)'); await savePng(page, path.join(imgDir, f)); log({ file: f, map: 'RANGE', tag }); console.log('shot', f); };
  const W = ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine', 'linethrower', 'mortar', 'fork', 'axe', 'boathook', 'marlinspike', 'mallet', 'chainsaw', 'fists'];
  for (const w of W) {
    await T(`t.setup_player({ weapon: '${w}', switchT: 0, hp: 100, hurt: 0 }); t.tick(30); t.setup_player({ hurt: 0 })`);
    await T("t.press('fire')"); await T('t.tick(3)'); await T('t.setup_player({ hurt: 0 })'); await shot(w + '_fire');
    await T('t.tick(5)'); await T('t.setup_player({ hurt: 0 })'); await shot(w + '_fire_late');
    await T("t.release('fire')"); await T('t.tick(40)');
    await T(`t.setup_player({ hurt: 0 }); t.press('aim'); t.tick(16)`); await T("t.press('fire'); t.tick(3); t.setup_player({ hurt: 0 })"); await shot(w + '_ads_fire');
    await T("t.release('fire'); t.release('aim'); t.tick(40)");
  }
}

async function runUi() {
  await page.evaluate(() => window.__GAME_TEST__.showScreen('title', { canContinue: false, note: '' })); await sleep(600);
  let n = 0; const shot = async (tag) => { n++; const f = `UI__${String(n).padStart(2, '0')}__${tag}.png`; await savePng(page, path.join(imgDir, f)); log({ file: f, map: 'UI', tag }); console.log('shot', f); };
  await shot('title');
  await T("t.newGame('easy', 3, { mapId: 'C1E1M01' })"); await sleep(400); await T('t.clearOverlays(); t.tick(30)');
  await T('t.pause()'); await sleep(500); await shot('pause');
  await page.evaluate(() => { const b = document.getElementById('settings-box'); if (b) b.scrollIntoView({ block: 'start' }); }); await sleep(250); await shot('pause_settings');
  await page.evaluate(() => { const b = document.getElementById('controls-box'); if (b) b.scrollIntoView({ block: 'start' }); }); await sleep(250); await shot('pause_controls');
  await T("t.openRecord('pause')"); await sleep(400); await shot('record');
  await T('t.closeRecord(); t.resume()'); await sleep(300);
  await T('t.setup_player({ hp: 0 }); t.tick(2)'); await sleep(2600); await shot('death_screen');
  await T("t.newGame('easy', 3, { mapId: 'C1E1M01' })"); await sleep(300); await T('t.clearOverlays()');
  await T("t.startBot('C1E1M01.main')"); for (let i = 0; i < 60 && !(await T('t.stepBot(120)')).done; i++);
  for (let i = 0; i < 40 && (await T('t.state()')).mode !== 'complete'; i++) await sleep(250); await sleep(500); await shot('complete_quay');
  await T("t.setup_epilogue(0, 2)"); await sleep(500); await shot('epilogue_2_card0');
  await T("t.setup_epilogue(7, 2)"); await sleep(1500); await shot('epilogue_2_mid');
  await T("t.setup_epilogue('tally', 2)"); await sleep(1200); await shot('epilogue_2_tally');
  await T("t.setup_epilogue(0, 1)"); await sleep(500); await shot('epilogue_1_card0');
}

try {
  if (mode === 'maps') for (const spec of rest) { try { await runMap(spec); } catch (e) { console.log('MAP FAILED', spec, String(e).slice(0, 300)); log({ map: spec, error: String(e).slice(0, 300) }); } }
  else if (mode === 'weapons') await runWeapons();
  else if (mode === 'ui') await runUi();
} finally {
  console.log(JSON.stringify({ errors: errors.slice(0, 20) })); log({ errors: errors.slice(0, 20), mode });
  await browser.close(); await server.close();
}
process.exit(0);
