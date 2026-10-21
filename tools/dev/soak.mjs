// THE SOAK (PT-071, R21 stability): a world played for a long time by an immortal, restless player (turning, walking, firing, switching weapons, using what is in front of them) on a few maps, and the size of everything the
// world keeps (every top-level array, object and Set, counted at checkpoints) compared between the first third and the last: anything that keeps growing is a leak in a session of an hour. Node only (the browser's own leak
// check, the GPU one, is part of `npm run browsercheck`). `node tools/dev/soak.mjs [--ticks=108000] [--json] [ID ...]`   (108000 ticks = half an hour)
import fs from 'node:fs';
import path from 'node:path';
import { parseMap } from '../../src/engine/mapformat.js';
import { createWorld, step, drainEvents, wakeEnemy } from '../../src/engine/world.js';
import { InputState } from '../../src/engine/input.js';

const root = path.resolve(import.meta.dirname, '../..'), args = process.argv.slice(2);
const TICKS = Number(args.find((a) => a.startsWith('--ticks='))?.slice(8) ?? 108000), ids = args.filter((a) => !a.startsWith('--'));
const MAPS = ids.length ? ids : ['C1E1M01', 'C1E3M04', 'C2M21', 'C2M28'];

const sizeOf = (v, depth = 0) => (Array.isArray(v) ? v.length : v instanceof Set || v instanceof Map ? v.size : v && typeof v === 'object' && depth < 1 ? Object.keys(v).length : 0);
/** { key: size } of the top-level state of a world (and of the player), for the keys that hold a collection */
function census(w) {
  const o = {}; for (const [k, v] of Object.entries(w)) { const n = sizeOf(v); if (n) o[k] = n; }
  for (const [k, v] of Object.entries(w.player ?? {})) { const n = sizeOf(v); if (n > 4) o['player.' + k] = n; }
  return o;
}

export function soak(id, ticks = TICKS) {
  const map = parseMap(JSON.parse(fs.readFileSync(path.join(root, 'maps', id + '.json'), 'utf8'))), w = createWorld(map, { seed: 3, difficulty: 'normal' }), input = new InputState();
  const cp = [], marks = [Math.floor(ticks / 3), Math.floor(ticks * 2 / 3), ticks], t0 = Date.now(); let slowest = 0, eventsMax = 0, completed = 0;
  for (let i = 1; i <= ticks; i++) {
    if (i % 600 === 1) for (const e of w.enemies) if (e.hp > 0 && e.state === 'idle') wakeEnemy(w, e, true);              // everything that is asleep is woken now and then: the soak is a long fight, not a long walk
    w.player.hp = 100; if (w.status !== 'playing') { w.status = 'playing'; completed++; }                            // immortal; a level finished just keeps going
    const c = input.sample(); c.yaw = Math.sin(i / 90) * 0.02 + (i % 500 < 40 ? 0.05 : 0); c.forward = i % 700 < 520 ? 1 : 0; c.strafe = Math.sin(i / 140) > 0 ? 1 : -1; c.fire = i % 30 < 12; c.use = i % 45 === 0;
    const t = performance.now(); step(w, c); slowest = Math.max(slowest, performance.now() - t); eventsMax = Math.max(eventsMax, drainEvents(w).length);
    if (marks.includes(i)) cp.push({ tick: i, sizes: census(w) });
  }
  const growth = {}; for (const k of new Set(cp.flatMap((x) => Object.keys(x.sizes)))) { const a = cp[0].sizes[k] ?? 0, b = cp[1].sizes[k] ?? 0, z = cp[2].sizes[k] ?? 0; if (z > b && b > a && z - a >= 50) growth[k] = [a, b, z]; }
  return { id, ticks, seconds: +((Date.now() - t0) / 1000).toFixed(1), slowestStepMs: +slowest.toFixed(2), largestEventBurst: eventsMax, levelsRestarted: completed, growth, final: cp[2].sizes };
}

if (process.argv[1] && process.argv[1].split(String.fromCharCode(92)).join('/').endsWith('soak.mjs')) {
  const out = MAPS.map((id) => soak(id));
  if (args.includes('--json')) console.log(JSON.stringify(out, null, 1));
  else for (const r of out) console.log(`${r.id}: ${r.ticks} ticks in ${r.seconds}s, slowest step ${r.slowestStepMs} ms, largest event burst ${r.largestEventBurst}, ${Object.keys(r.growth).length ? 'GROWING: ' + Object.entries(r.growth).map(([k, v]) => `${k} ${v.join(' > ')}`).join('; ') : 'nothing keeps growing'}`);
}
