// R12: stronger version of audit a07 (resume must equal uninterrupted play). For each map, difficulty and several random checkpoints along the canonical route, take a REAL mid-level save
// (makeSave -> JSON -> parseSave -> loadWorld) and advance the original and the loaded world with the SAME scripted, active input stream (walking, turning, firing) for 600 ticks, comparing state hashes every 100 ticks.
// Also run the same check against the pre-repair tree when a second argument (its root) is given, to show the check can fail.
// Run from repo root: node review/gate-2/reaudit/repro/r12_resume_fuzz.mjs [rootDir]
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const root = path.resolve(process.argv[2] || '.');
const imp = (f) => import(pathToFileURL(path.join(root, f)).href);
const H = await imp('src/engine/harness.js'), W = await imp('src/engine/world.js'), S = await imp('src/engine/save.js'), IN = await imp('src/engine/input.js'), B = await imp('src/engine/bot.js');
let seed = 99; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const cmd = (i) => ({ move: [Math.sin(i / 37) > 0.2 ? 1 : 0, Math.cos(i / 53) > 0.5 ? 1 : 0], yaw: 0.03 * Math.sin(i / 20), pitch: 0, fire: i % 17 < 4, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false });
let n = 0, bad = 0; const rows = [];
for (const id of ['C1E1M03', 'C1E1M05', 'C1E1M06', 'C1E1M07', 'C1E1M08']) for (const difficulty of ['normal', 'hard']) {
  const map = H.loadMapFile(path.join(root, 'maps', id + '.json')), route = H.loadRouteFile(path.join(root, 'routes', id + '.main.route.json'));
  const full = H.runRoute(map, route, { seed: 2, difficulty }); const total = full.ticks;
  for (let k = 0; k < 6; k++) {
    const at = Math.floor(300 + rnd() * (total - 900)); let hashes = null;
    const w = W.createWorld(map, { seed: 2, difficulty }); const input = new IN.InputState(), bot = new B.Bot(w, input, route); for (let t = 0; t < at && !bot.done && !bot.failed && w.status === 'playing'; t++) { bot.tick(); W.step(w, input.sample()); W.drainEvents(w); }
    if (w.status !== 'playing') continue;
    const back = S.loadWorld(S.parseSave(JSON.stringify(S.makeSave(w, 'mid-level'))).save, () => map).world;
    let same = true, first = null; for (let t = 0; t < 600; t++) { W.step(w, cmd(t)); W.step(back, cmd(t)); W.drainEvents(w); W.drainEvents(back); if (t % 100 === 99 && W.hashWorld(w) !== W.hashWorld(back)) { same = false; first = first ?? t + 1; } }
    n++; if (!same) { bad++; rows.push(`${id} ${difficulty} save at tick ${at}: DIVERGES from +${first} ticks`); }
  }
}
console.log(`tree ${root}: ${n} checkpoints, ${bad} diverge`); for (const r of rows.slice(0, 8)) console.log('  ' + r);
