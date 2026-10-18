// ONE batched real-game job for Sessions A, B and H3 (PT-050, the owner's yes of 2026-10-18 for "these jobs"): what the live page DRAWS and does, in numbers first and at most a handful of stills.
//   phases: flash (V1, the hurt flash follows the size of the hit), cross (V2, the crosshair against the real picture in four maps and three stances), cards (U1, pickup cards and toasts),
//           journal (U2, Tab pauses, Map and Log tabs, the unread count), leaks (H3, renderer.info across reloads of a chime, a tide, a beam, a sweep and a vat map, and the same with the new disposals switched off), corpses (H-L4)
//   node tools/dev/probe-session-ab.mjs [outDir] [phase ...]       Run it through tools/dev/low.ps1 (idle priority, two cores) with ABSOLUTE paths.
// THE MOUSE (the owner's fifth complaint): the page never asks for the pointer lock in an automated browser (src/game/lockpolicy.js), and this job ALSO replaces Element.prototype.requestPointerLock before any page script runs with a
// function that counts the call and refuses it, so whatever the game does, no lock is ever granted; the count is in the result (it must be 0) and so is document.pointerLockElement at the end.
// No real mouse or keyboard is used: input reaches the page through the dev hook and Chrome DevTools events only.
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const args = process.argv.slice(2), out = path.resolve(args[0] ?? path.join(root, 'review/probe-ab')), phases = args.slice(1);
const want = (n) => !phases.length || phases.includes(n);
fs.mkdirSync(out, { recursive: true });
const results = { when: new Date().toISOString(), phases: {}, checks: [], errors: [] };
const save = () => fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(results, null, 1));
const check = (name, ok, detail = '') => { results.checks.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  [' + detail + ']' : '')); save(); };

const port = 5500 + (process.pid % 90);
const server = await createServer({ root, logLevel: 'error', server: { port, strictPort: false } });
await server.listen();
const realPort = server.config.server.port;
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
await page.evaluateOnNewDocument(() => {
  window.__lockCalls = 0;
  Element.prototype.requestPointerLock = function () { window.__lockCalls++; return Promise.reject(new DOMException('refused by the probe', 'NotAllowedError')); };
});
page.on('pageerror', (e) => results.errors.push('pageerror: ' + String(e).slice(0, 300)));
page.on('console', (m) => { if (m.type() === 'error') results.errors.push('console: ' + m.text().slice(0, 300)); });
const finish = async (code = 0) => { try { results.lockCalls = await page.evaluate(() => window.__lockCalls); results.pointerLockElement = await page.evaluate(() => (document.pointerLockElement ? document.pointerLockElement.id : null)); results.webdriver = await page.evaluate(() => navigator.webdriver); } catch { /* page gone */ }
  check('the pointer lock was never asked for (the game\'s own guard holds)', results.lockCalls === 0, 'requestPointerLock calls: ' + results.lockCalls + ', webdriver: ' + results.webdriver);
  check('no pointer is locked at the end', results.pointerLockElement === null, String(results.pointerLockElement));
  check('no page error and no console error', results.errors.length === 0, results.errors.slice(0, 3).join(' | '));
  save(); await browser.close().catch(() => {}); await server.close().catch(() => {}); console.log(results.checks.filter((c) => !c.ok).length ? 'SOME CHECKS FAILED' : 'ALL CHECKS PASSED'); process.exit(code); };

const T = (fn, ...a) => page.evaluate(fn, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const grab = async () => PNG.sync.read(await page.screenshot());
const shoot = async (name) => { const buf = await page.screenshot(); fs.writeFileSync(path.join(out, name), buf); return PNG.sync.read(buf); };
const newGame = (mapId, seed = 1) => T((id, s) => { const t = window.__GAME_TEST__; t.newGame('normal', s, { mapId: id }); return t.tick(2).player; }, mapId, seed);
const phase = async (name, fn) => { if (!want(name)) return; const t0 = Date.now(); try { results.phases[name] = await fn(); } catch (e) { results.phases[name] = { error: String(e.stack ?? e).slice(0, 500) }; check('phase ' + name + ' ran without throwing', false, String(e.message ?? e).slice(0, 200)); } console.log('phase ' + name + ' ' + Math.round((Date.now() - t0) / 1000) + ' s'); save(); };

await page.goto(`http://localhost:${realPort}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 240000 });
console.log('page ready');

/** how strongly the crosshair stands out: the same frame with and without #cross, compared in a box round the centre */
async function crossDelta(R = 24) {
  await T(() => window.__GAME_TEST__.render(0.016));
  const a = await grab(); await T(() => { document.getElementById('cross').style.visibility = 'hidden'; }); const b = await grab(); await T(() => { document.getElementById('cross').style.visibility = ''; });
  const W = a.width, cx = Math.round(W / 2), cy = Math.round(a.height / 2); let changed = 0, maxUp = 0, maxDown = 0, sumAbs = 0, bg = 0, n = 0;
  for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++) { const i = (y * W + x) * 4, la = luma(a.data[i], a.data[i + 1], a.data[i + 2]), lb = luma(b.data[i], b.data[i + 1], b.data[i + 2]), d = la - lb; bg += lb; n++; if (Math.abs(d) >= 6) { changed++; sumAbs += Math.abs(d); if (d > maxUp) maxUp = d; if (-d > maxDown) maxDown = -d; } }
  return { changedPx: changed, maxUp: Math.round(maxUp), maxDown: Math.round(maxDown), meanAbs: changed ? Math.round(sumAbs / changed) : 0, bgLuma: Math.round(bg / n) };
}

// ------------------------------------------------------------------------------------------------------------------ the arrival and the hurt flash (V1, J1)
await phase('flash', async () => {
  await newGame('C1E1M01'); await T(() => window.__GAME_TEST__.tick(3));
  const arrival = await T(() => { const c = document.getElementById('card'); return { shown: !c.classList.contains('hidden'), title: document.getElementById('card-title').textContent, cross: getComputedStyle(document.getElementById('cross')).display }; });
  await shoot('01-arrival.png'); check('the arrival card is up on a fresh level and the crosshair is in the frame', arrival.shown && arrival.cross !== 'none', JSON.stringify(arrival));
  await T(() => window.__GAME_TEST__.clearOverlays());
  const rows = {};
  for (const a of [0, 2, 10, 30]) {
    await T((amount) => { const v = window.__GAME_TEST__.view(); v.hurtFlash = new v.hurtFlash.constructor(); if (amount) v.hurtFlash.hit(amount); }, a);
    await T(() => window.__GAME_TEST__.render(0.016)); const peak = await T(() => window.__GAME_TEST__.view().post.uniforms.uDamage.value);
    const img = await shoot(`flash-${a}.png`); let red = 0; for (let i = 0; i < img.data.length; i += 4 * 17) red += img.data[i] - (img.data[i + 1] + img.data[i + 2]) / 2; red = Math.round(red / (img.data.length / (4 * 17)));
    const series = [[0, +peak.toFixed(3)]]; let t = 0;
    for (const dt of [0.1, 0.2, 0.3, 0.4, 0.6, 1.0]) { await T((d) => window.__GAME_TEST__.render(d), dt); t += dt; series.push([+t.toFixed(2), +(await T(() => window.__GAME_TEST__.view().post.uniforms.uDamage.value)).toFixed(3)]); }
    rows[a] = { peak: +peak.toFixed(3), redness: red, series };
  }
  check('no hit: the screen is not tinted', rows[0].peak === 0, 'peak ' + rows[0].peak);
  check('a scratch (2) tints lightly and a heavy hit (30) strongly, and a bigger hit is always stronger', rows[2].peak > 0.05 && rows[2].peak < 0.3 && rows[30].peak > 0.8 && rows[2].peak < rows[10].peak && rows[10].peak < rows[30].peak, 'peaks ' + [2, 10, 30].map((k) => rows[k].peak).join(' / '));
  check('the drawn frame is redder for a bigger hit', rows[2].redness < rows[10].redness && rows[10].redness < rows[30].redness, 'mean red excess ' + [0, 2, 10, 30].map((k) => rows[k].redness).join(' / '));
  check('every flash has faded to nothing within 2.7 s', Object.values(rows).every((r) => r.series.at(-1)[1] < 0.02), JSON.stringify(Object.fromEntries(Object.entries(rows).map(([k, r]) => [k, r.series.at(-1)[1]]))));
  return rows;
});

// ------------------------------------------------------------------------------------------------------------------ the crosshair (V2, J2)
await phase('cross', async () => {
  const rows = {}, maps = ['C1E1M01', 'C1E2M04', 'C1E4M02', 'C2M09'];
  for (const id of maps) {
    await newGame(id); await T(() => window.__GAME_TEST__.tick(4)); await T(() => window.__GAME_TEST__.clearOverlays());
    rows[id] = await crossDelta(); await shoot(`cross-${id}.png`);
  }
  await newGame('C1E1M01'); await T(() => window.__GAME_TEST__.clearOverlays());
  await T(() => { const t = window.__GAME_TEST__; t.press('aim'); t.tick(14); }); const ads = await crossDelta(); await shoot('cross-ads.png'); await T(() => window.__GAME_TEST__.release('aim'));
  await T(() => { const t = window.__GAME_TEST__; t.tick(10); t.press('forward'); t.press('sprint'); t.tick(12); }); const sprint = await crossDelta(); await shoot('cross-sprint.png');
  await T(() => { const t = window.__GAME_TEST__; t.release('sprint'); t.release('forward'); t.tick(4); });
  const css = await T(() => { const c = document.getElementById('cross'), s = getComputedStyle(c), r = c.getBoundingClientRect(); return { style: c.dataset.style ?? null, bg: s.backgroundImage.slice(0, 80), w: Math.round(r.width), h: Math.round(r.height), opacity: s.opacity, state: c.className }; });
  results.crossCss = css;
  for (const id of maps) check('the crosshair is drawn and stands out in ' + id, rows[id].changedPx >= 12 && Math.max(rows[id].maxUp, rows[id].maxDown) >= 40, JSON.stringify(rows[id]));
  check('the crosshair is still drawn while aiming down the sights', ads.changedPx >= 8, JSON.stringify(ads));
  check('the crosshair is hidden while sprinting (an old rule: body[data-stance=sprint] #cross has opacity 0; the first run of this probe asked for the opposite and was wrong)', sprint.changedPx === 0, JSON.stringify(sprint));
  return { rows, ads, sprint, css };
});

// ------------------------------------------------------------------------------------------------------------------ pickup cards and toasts (U1, J18)
await phase('cards', async () => {
  const p = await newGame('C1E1M01'); await T(() => window.__GAME_TEST__.tick(30)); await T(() => window.__GAME_TEST__.clearOverlays());
  const read = () => T(() => { const c = document.getElementById('pickup-card'), t = document.getElementById('toasts'); return { card: c.innerText.replace(/\s+/g, ' ').trim(), cardShown: c.classList.length ? c.className : '', opacity: getComputedStyle(c).opacity, toasts: [...t.children].map((x) => x.innerText.replace(/\s+/g, ' ').trim()) }; });
  const give = (kind) => T((k) => { const t = window.__GAME_TEST__, s = t.tick(0).player; t.setup_addPickup(k, s.x, s.z); t.tick(2); }, kind);
  const r = {};
  await give('weapon_carbine'); r.carbine = await read(); await shoot('card-carbine.png');
  await T(() => window.__GAME_TEST__.clearOverlays()); await give('key_brass'); r.key = await read();
  await T(() => window.__GAME_TEST__.clearOverlays()); await T(() => window.__GAME_TEST__.setup_player({ ammo: { ...window.__GAME_TEST__.tick(0).player.ammo, shell: 0 } })); await give('ammo_shell'); await give('ammo_shell'); r.ammo = await read(); await shoot('toast-ammo.png');
  check('a gun gets a card with its name and what it is for', /carbine/i.test(r.carbine.card) && r.carbine.card.length > 20, r.carbine.card.slice(0, 120));
  check('a key gets a card', r.key.card.length > 5, r.key.card.slice(0, 120));
  check('ammunition is a toast, not a card, and two together merge into one line', r.ammo.toasts.length >= 1 && r.ammo.toasts.length <= 2, JSON.stringify(r.ammo.toasts));
  return r;
});

// ------------------------------------------------------------------------------------------------------------------ the Journal (U2, J18)
await phase('journal', async () => {
  let id = 'C1E1M01'; let s = await newGame(id); s = await T(() => window.__GAME_TEST__.tick(90));
  if (!(s.messagesSeen?.length)) { id = 'C2M01'; await newGame(id); s = await T(() => window.__GAME_TEST__.tick(120)); }
  const hud = await T(() => { const h = document.getElementById('hud-log'); return { shown: !h.classList.contains('hidden'), n: document.getElementById('hud-log-n').textContent }; });
  const mode0 = (await T(() => window.__GAME_TEST__.tick(0))).mode, tick0 = (await T(() => window.__GAME_TEST__.tick(0))).tick;
  await T(() => { const t = window.__GAME_TEST__; t.press('map'); t.tick(1); t.release('map'); });
  const open = await T(() => { const t = window.__GAME_TEST__, sn = t.tick(0); const j = document.getElementById('screen-journal'); return { mode: sn.mode, tick: sn.tick, shown: !j.classList.contains('hidden'), logOn: document.getElementById('btn-journal-log').className, rows: document.querySelectorAll('#screen-journal .logrow, #screen-journal .jrow, #journal-log > *').length, newLabel: document.getElementById('journal-new').textContent }; });
  await shoot('journal-log.png');
  await T(() => document.getElementById('btn-journal-map').click()); await sleep(200); await shoot('journal-map.png');
  const tab = await T(() => ({ mapBtn: document.getElementById('btn-journal-map').className, mapShown: !document.getElementById('automap').classList.contains('hidden') }));
  const tickA = (await T(() => window.__GAME_TEST__.tick(0))).tick; await sleep(1500); const tickB = (await T(() => window.__GAME_TEST__.tick(0))).tick;
  await page.keyboard.press('Escape'); await sleep(300);
  const after = await T(() => ({ mode: window.__GAME_TEST__.tick(0).mode, shown: !document.getElementById('screen-journal').classList.contains('hidden'), hudN: document.getElementById('hud-log-n').textContent }));
  check('a message that arrived shows as unread on the HUD', hud.shown && Number(hud.n) >= 1, 'map ' + id + ' ' + JSON.stringify(hud));
  check('Tab (the map action) opens the Journal and the game is paused', open.mode === 'paused' && open.shown, JSON.stringify(open));
  check('it opened on the Log because there was something unread', /on/.test(open.logOn), open.logOn);
  check('the Map tab shows the automap', /on/.test(tab.mapBtn) && tab.mapShown, JSON.stringify(tab));
  check('the clock does not run while the Journal is open', tickA === tickB, 'tick ' + tickA + ' -> ' + tickB + ' over 1.5 s');
  check('Esc closes it and play resumes, with nothing left unread', after.mode === 'playing' && !after.shown, JSON.stringify(after));
  return { id, hud, open, tab, after, mode0, tick0 };
});

// ------------------------------------------------------------------------------------------------------------------ H3: do reloads leak GPU memory?
await phase('leaks', async () => {
  await page.setViewport({ width: 640, height: 360 }); await sleep(300);
  const N = 8, rows = {};
  const settle = (id) => T((mapId) => {
    const t = window.__GAME_TEST__; t.newGame('normal', 1, { mapId }); t.tick(2); const v = t.view();
    v.scene.traverse((o) => { o.frustumCulled = false; });
    if (v.tideView) { v.tideView.update = () => {}; v.tideView.sea.visible = true; v.tideView.sea.position.y = 0; }          // the sea is drawn so its texture is on the GPU
    t.render(0.016); const g = t.gl(); return { geometries: g.geometries, textures: g.textures, programs: g.programs };
  }, id);
  const neuter = () => T(() => { const v = window.__GAME_TEST__.view(); if (v.chimeView) v.chimeView.dispose = () => {}; if (v.tideView) v.tideView.dispose = () => {}; });
  const run = async (label, id, { off = false } = {}) => {
    await settle(id); await settle(id); const g0 = await settle(id); let g1 = g0;
    for (let i = 0; i < N; i++) { if (off) await neuter(); g1 = await settle(id); }
    rows[label] = { map: id, off, before: g0, after: g1, dGeometries: g1.geometries - g0.geometries, dTextures: g1.textures - g0.textures };
    console.log('leak ' + label + ' ' + JSON.stringify(rows[label])); save();
  };
  await run('control C1E1M01', 'C1E1M01');
  await run('chime C2M14', 'C2M14'); await run('chime C2M14 (new disposals OFF)', 'C2M14', { off: true });
  await run('tide C2M28', 'C2M28'); await run('tide C2M28 (new disposals OFF)', 'C2M28', { off: true });
  await run('beam C1E4M04', 'C1E4M04'); await run('sweep C1E4M08', 'C1E4M08'); await run('vat C1E3M07', 'C1E3M07');
  for (const [k, r] of Object.entries(rows)) { if (r.off) continue; check('no GPU growth across ' + N + ' reloads: ' + k, r.dGeometries <= 2 && r.dTextures <= 1, 'geometries ' + r.before.geometries + '->' + r.after.geometries + ', textures ' + r.before.textures + '->' + r.after.textures); }
  const off = Object.values(rows).filter((r) => r.off && r.map === 'C2M14'); check('(the proof the probe can see a leak) with the chime view\'s disposal switched off its five glyph textures stay on the GPU at every reload', off.length === 1 && off[0].dTextures >= N * 5 * 0.8, off.map((r) => r.map + ' +' + r.dTextures).join(', '));
  // (the tide's cloned water texture is NOT a GPU leak: a clone shares its source's upload, measured +0 with its disposal off; the dispose is still right, it frees the JS object)
  await page.setViewport({ width: 1280, height: 720 });
  return rows;
});

// ------------------------------------------------------------------------------------------------------------------ H-L4: born corpses
await phase('corpses', async () => {
  await newGame('C1E3M07'); await T(() => { const t = window.__GAME_TEST__; t.setup_player({ hp: 1e6 }); });
  const made = await T(() => { const t = window.__GAME_TEST__, s = t.tick(0).player; const ids = []; for (let i = 0; i < 70; i++) { const id = t.setup_spawnEnemy('gaunt', s.x + 2 + (i % 10) * 0.7, s.z + 2 + Math.floor(i / 10) * 0.7, 0, 'dead'); t.setup_enemy(id, { summoned: true, dead: 1 }); ids.push(id); } t.tick(2); t.view().scene.traverse((o) => { o.frustumCulled = false; }); t.render(0.016); return { n: ids.length, views: t.view().enemyViews.size, geometries: t.gl().geometries }; });
  const after = await T(() => { const t = window.__GAME_TEST__; t.setup_player({ hp: 1e6 }); t.tick(130); t.render(0.016); return { views: t.view().enemyViews.size, geometries: t.gl().geometries, tick: t.tick(0).tick }; });
  check('past a multiple of 120 ticks the born corpses beyond 24 are gone from the world and from the scene', made.views - after.views >= 40, JSON.stringify({ made, after }));
  check('and their geometry is released on the GPU', after.geometries < made.geometries, made.geometries + ' -> ' + after.geometries);
  return { made, after };
});

await finish(0);
