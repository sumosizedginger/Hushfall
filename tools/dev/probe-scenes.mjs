// REAL-GAME PROBE OF THE STORY SCENES (PT-063, R13): every scene of src/game/scenes.js played in the live page through the dev hook, stills at four moments, and the checks the node tests cannot make: the camera the renderer ACTUALLY has is the pose the scene asked for, the HUD / toasts /
// minimap are gone while it plays, the subtitle is typed, the sim does not move (the tick stands still), a skip hands the player their eye back, and the scene is marked seen. ONE headless-Chrome job: run it through tools/dev/low.ps1 with ABSOLUTE paths.
//   node tools/dev/probe-scenes.mjs <outDir> [sceneId,...]   -> <outDir>/<scene>-<n>.png and the checks as JSON on stdout (exit 1 if any fails)
// THE MOUSE (the owner's complaints): the pointer lock is refused before any page script runs and the count is printed; it must be 0.
import { savePng } from './savepng.mjs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { parseMap } from '../../src/engine/mapformat.js';
import { SCENES } from '../../src/game/scenes.js';
const root = path.resolve(import.meta.dirname, '../..'), out = path.resolve(process.argv[2] ?? path.join(root, 'review/pt-063')), only = process.argv[3] ? new Set(process.argv[3].split(',')) : null;
fs.mkdirSync(out, { recursive: true });
const port = 5281, server = await createServer({ root, logLevel: 'error', server: { port, strictPort: true } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { navigator.getGamepads = () => [null, null, null, null]; window.__lockCalls = 0; Element.prototype.requestPointerLock = function () { window.__lockCalls++; return Promise.reject(new DOMException('refused by the probe', 'NotAllowedError')); }; });
await page.setViewport({ width: 1280, height: 720 });
const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const R = { scenes: {}, checks: [], errors }, check = (name, ok, detail = '') => { R.checks.push({ name, ok: !!ok, detail }); if (!ok) console.log('FAIL', name, detail); };
const C = (c) => (c + 0.5) * 2;
/** where the trigger would have put the player: the trigger cell that carries the scene (an enter trigger), else a walkable cell about 10 m from the creature the scene looks at, on the side of the start */
function standingFor(scene) {
  const src = JSON.parse(fs.readFileSync(path.join(root, 'maps', scene.map + '.json'), 'utf8')), map = parseMap(src); let found = null;
  const walk = (o, host) => { if (Array.isArray(o)) o.forEach((x) => walk(x, host)); else if (o && typeof o === 'object') { if (o.cinematic === scene.id) found = host; for (const v of Object.values(o)) walk(v, o.when !== undefined || o.id !== undefined ? o : host); } };
  for (const tr of src.triggers ?? []) walk(tr, tr);
  const kind0 = scene.keys.map((k) => String(k.look)).find((s2) => s2.startsWith('enemy:'))?.split(':')[1], e0 = src.entities.find((q) => q.type === 'enemy' && q.kind === kind0);
  if (found?.at && found.when === 'enter') return { x: C(found.at[0]), z: C(found.at[1]), yaw: e0 ? Math.atan2(-(C(e0.at[0]) - C(found.at[0])), -(C(e0.at[1]) - C(found.at[1]))) : 0, how: 'trigger ' + found.id };
  const kind = scene.keys.map((k) => String(k.look)).find((s) => s.startsWith('enemy:'))?.split(':')[1], e = src.entities.find((q) => q.type === 'enemy' && q.kind === kind), start = src.entities.find((q) => q.type === 'player').at;
  if (found?.at && kind === undefined) return { x: C(found.at[0]), z: C(found.at[1]), yaw: 0, how: 'trigger ' + found.id };
  if (!e) return { x: C(start[0]), z: C(start[1]), yaw: 0, how: 'start' };
  let best = null; for (let r = 5; r <= 7; r++) for (let a = 0; a < 48; a++) { const cx = Math.round(e.at[0] + r * Math.cos(a * Math.PI / 24)), cz = Math.round(e.at[1] + r * Math.sin(a * Math.PI / 24)); const k = map.kind(cx, cz); if (k !== 'floor' && k !== 'outdoor') continue; const d = Math.hypot(cx - start[0], cz - start[1]); if (!best || d < best.d) best = { cx, cz, d }; }
  return best ? { x: C(best.cx), z: C(best.cz), yaw: Math.atan2(-(C(e.at[0]) - C(best.cx)), -(C(e.at[1]) - C(best.cz))), how: 'near ' + kind } : { x: C(start[0]), z: C(start[1]), yaw: 0, how: 'start' };
}
for (const sc of SCENES) {
  if (only && !only.has(sc.id)) continue;
  const at = standingFor(sc), info = { stand: at.how, shots: [] };
  await T(`t.newGame('normal', 3, { mapId: '${sc.map}' })`); await T('t.clearOverlays()');
  const real = ['threshold', 'deep-gate'].includes(sc.id);                                                                                      // the two arrival scenes are started by the first tick of the real start, facing the way the map puts the player
  if (!real) await T(`t.setup_teleport(${at.x}, ${at.z}, ${at.yaw}); t.setup_player({ pitch: 0, hp: 100000 })`); else await T('t.setup_player({ hp: 100000 })'); await T('t.tick(3)'); for (let i = 0; i < 4; i++) await T('t.render(0.05)');
  const tick0 = (await T('t.state()')).tick ?? (await T('t.cinematicProbe()')).tick;
  const pr0 = await T('t.cinematicProbe()'); if (real) check(`${sc.id}: its own trigger started it at the first tick`, pr0.active && pr0.id === sc.id, JSON.stringify(pr0));
  let pr = real ? pr0 : await T(`t.setup_cinematic('${sc.id}', 0, true)`); check(sc.id + ': the shell is in the cinematic mode', pr.mode === 'cinematic' && pr.active, JSON.stringify(pr));
  let t = 0; const marks = [0.02, 0.3, 0.6, 0.95];
  for (let i = 0; i < marks.length; i++) {
    const want = sc.length * marks[i]; if (want > t) { pr = await T(`t.step_cinematic(${(want - t).toFixed(3)})`); t = want; } else pr = await T('t.cinematicProbe()');
    for (let f = 0; f < 3; f++) await T('t.render(0.016)');
    pr = await T('t.cinematicProbe()'); await sleep(250); const name = `${sc.id}-${i + 1}`; await savePng(page, path.join(out, name + '.png'));
    info.shots.push({ at: +t.toFixed(2), who: pr.who, text: pr.text, fade: pr.fade });
    const w = pr.want, c = pr.cam; check(`${sc.id} @${t.toFixed(1)}s: the renderer's camera is the scene's pose`, w && c && Math.hypot(w.x - c.x, w.y - c.y, w.z - c.z) < 0.25 && Math.abs(w.yaw - c.yaw) < 0.01 && Math.abs(w.pitch - c.pitch) < 0.01, JSON.stringify({ w, c }));
    check(`${sc.id} @${t.toFixed(1)}s: the overlay is up, the HUD and the toasts are gone`, pr.overlay && pr.bodyClass && pr.hudDisplay === 'none' && pr.toastsDisplay === 'none', JSON.stringify({ o: pr.overlay, b: pr.bodyClass, h: pr.hudDisplay, t: pr.toastsDisplay }));
    check(`${sc.id} @${t.toFixed(1)}s: the simulation stands still`, pr.tick === tick0, `tick ${pr.tick} vs ${tick0}`);
  }
  check(`${sc.id}: a line was typed on screen at some mark`, !sc.lines.length || info.shots.some((s) => s.text), JSON.stringify(info.shots));
  pr = await T('t.skip_cinematic()'); check(`${sc.id}: a skip gives the player their eye and the game back`, pr.mode === 'playing' && !pr.active && !pr.overlay && pr.want === null, JSON.stringify(pr));
  check(`${sc.id}: a trigger's play is marked seen, a forced replay is not`, real ? pr.seen.includes(sc.id) : !pr.seen.includes(sc.id), JSON.stringify(pr.seen));
  R.scenes[sc.id] = info; console.log('scene', sc.id, at.how, 'done');
}
R.lockCalls = await page.evaluate('window.__lockCalls'); check('the pointer lock was never asked for', R.lockCalls === 0, 'calls: ' + R.lockCalls);
check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
console.log(JSON.stringify(R, null, 1));
await browser.close(); await server.close(); process.exit(R.checks.some((c) => !c.ok) ? 1 : 0);
