// PT-045 (drop B, E8a): CLOCKED CONVEYORS (src/engine/belts.js, flowPush in world.js). The flowing floors of Act A with a clock on them: a 'flip' belt carries you one way, stands still, carries you the other way, stands still; a 'run' belt runs for `on` s of every
// period. Pure functions of the sim time. A map with no `belts` is the old Act A current, bit for bit (tests/current.test.js holds that).
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMap, parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, spawnEnemy } from '../src/engine/world.js';
import { beltState, beltAtCell, beltPush } from '../src/engine/belts.js';
import { BELT, FLOW, TICK } from '../src/engine/defs.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const run = (w, n, cmd = () => idle()) => { for (let i = 0; i < n; i++) { step(w, cmd(i)); drainEvents(w); } };
const bad = (s, re) => { const v = validateMap(s); assert.equal(v.ok, false, 'expected invalid'); assert.ok(v.errors.some((e) => re.test(e)), re + ' in ' + JSON.stringify(v.errors)); };
/** a corridor of open floor (x 1..38, z 1..3) with the flowing floor '>' on x 10..29 (all three rows) and the given belts */
const yard = (belts = [{ rect: [10, 1, 29, 3], period: 20, phase: 0 }], over = {}) => {
  const W = 40, row = (f) => '#' + f.repeat(W - 2) + '#', fxRow = '.'.repeat(10) + '>'.repeat(20) + '.'.repeat(10);
  return { format: 1, id: 'B1', version: 1, name: 'Belts', cellSize: 2, grid: [ '#'.repeat(W), row(':'), row(':'), row(':'), '#'.repeat(W)], fx: ['.'.repeat(W), fxRow, fxRow, fxRow, '.'.repeat(W)], doors: [], secrets: [], belts,
    entities: [{ type: 'player', at: [3, 2], facing: 'east' }, { type: 'exit', at: [38, 2] }], ...over };
};
const world = (src) => createWorld(parseMap(src), { seed: 1, difficulty: 'normal' });
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;

test('a flip belt: runs the drawn way, eases to a stop, stands still BELT.stop s, runs the other way, stands still again; a phase shifts the clock', () => {
  const B = { rect: [0, 0, 1, 1], period: 20, phase: 0, mode: 'flip' }; // half 10, stop 0.8
  const f = (t, b = B) => beltState(b, t);
  assert.equal(f(0).dir, 1); assert.equal(f(0).factor, 0, 'it eases up from a standstill'); assert.ok(near(f(BELT.ease).factor, 1), 'full speed after the ease'); assert.equal(f(5).factor, 1); assert.equal(f(5).warn, 0);
  const slowing = f(10 - BELT.stop - BELT.ease / 2); assert.ok(near(slowing.factor, 0.5, 1e-6) && near(slowing.warn, 0.5, 1e-6) && slowing.dir === 1, 'half way through the ease down: ' + JSON.stringify(slowing));
  for (const t of [10 - BELT.stop, 10 - BELT.stop / 2, 10 - 0.001]) assert.deepEqual(f(t), { factor: 0, dir: 0, warn: 0, running: false }, 'stopped at ' + t);
  assert.equal(f(10).dir, -1); assert.equal(f(10 + BELT.ease).factor, -1); assert.equal(f(15).factor, -1);
  for (const t of [20 - BELT.stop, 19.9]) assert.equal(f(t).running, false); assert.equal(f(20).dir, 1, 'and round again'); assert.equal(f(45).factor, 1, 'periodic');
  const shifted = { ...B, phase: 5 }; assert.equal(f(0, shifted).factor, 1, 'with a phase of 5 s it starts 5 s into the cycle'); assert.equal(f(5 - BELT.stop / 2, shifted).running, false, 'its stop is 5 s earlier');
  let flips = 0, prev = 0; for (let t = 0; t < 60; t += TICK) { const s = beltState(B, t).factor; assert.ok(Math.abs(s - prev) < 0.06, 'the push never jumps: ' + prev + ' -> ' + s + ' at ' + t); if (prev > 0 && s < 0) flips++; prev = s; } assert.equal(flips, 0, 'it never goes from forward to backward without standing still');
});

test('a run belt: on for `on` s of every period, still for the rest, eased at both ends', () => {
  const B = { rect: [0, 0, 1, 1], period: 10, phase: 0, mode: 'run', on: 4 };
  assert.equal(beltState(B, 0).factor, 0); assert.equal(beltState(B, 2).factor, 1); assert.ok(beltState(B, 4 - BELT.ease / 2).warn > 0.4); assert.equal(beltState(B, 4).running, false); assert.equal(beltState(B, 7).factor, 0); assert.equal(beltState(B, 12).factor, 1);
});

test('the validator: a belt needs a rect on the grid, a mode, a period, a sane run, and a flowing floor under it; two belts may not share a cell', () => {
  assert.equal(validateMap(yard()).ok, true, JSON.stringify(validateMap(yard()).errors));
  const B = (o) => yard([{ rect: [10, 1, 29, 3], period: 20, ...o }]);
  bad(B({ rect: [10, 1, 99, 3] }), /rect must be/); bad(B({ rect: [12, 1, 10, 3] }), /rect must be/); bad(B({ mode: 'spin' }), /mode must be/); bad(B({ period: 4 }), /period must be at least 6/); bad(B({ phase: 'x' }), /phase must be a number/);
  bad(B({ mode: 'run', on: 1, period: 10 }), /needs on >= 2 s and a rest/); bad(B({ mode: 'run', on: 9, period: 10 }), /needs on >= 2 s and a rest/); bad(B({ speed: 20 }), /speed must be/);
  bad(yard([{ rect: [2, 1, 6, 3], period: 20 }]), /no flowing floor/); bad(yard([{ rect: [10, 1, 20, 3], period: 20 }, { rect: [20, 1, 29, 3], period: 20 }]), /overlaps another belt/);
});

test('in the world: a flip belt carries the player east for its first half, leaves them where they are while it stands still, and carries them back west in the second half; the speed is the belt\'s own', () => {
  const w = world(yard()); const S = 2; Object.assign(w.player, { x: 12 * S, z: 2 * S + 1 }); // on the belt (x cell 12)
  const at = (t) => { while (w.time < t - 1e-9) step(w, idle()); drainEvents(w); return w.player.x; };
  const x0 = w.player.x; const xa = at(4); const dx1 = xa - x0; assert.ok(dx1 > 8 && dx1 < 3.0 * 4, 'carried east at up to 3 m/s for the first seconds: ' + dx1.toFixed(2));
  const xs = at(10 - BELT.stop); const xe = at(10 - 0.05); assert.ok(near(xe, xs, 0.5), 'then it eases to a standstill and holds: ' + xs.toFixed(2) + ' -> ' + xe.toFixed(2)); const still = at(10 - 0.04); assert.ok(near(still, xe, 1e-6), 'no push at all while it stands still');
  const xb = at(18); assert.ok(xb < xe - 8, 'and in the second half it carries the player back west: ' + xe.toFixed(2) + ' -> ' + xb.toFixed(2));
});

test('a belt outside the map\'s own: an ordinary current still pushes by FLOW.push, and a clocked one by its speed; an enemy standing on a belt is carried too', () => {
  const plain = yard([{ rect: [10, 1, 14, 3], period: 20 }]); const w = world(plain); const S = 2;
  Object.assign(w.player, { x: 20 * S, z: 2 * S + 1 }); const x0 = w.player.x; run(w, 60); assert.ok(Math.abs(w.player.x - x0 - FLOW.push) < 0.15, 'a current with no belt on it carries by FLOW.push: ' + (w.player.x - x0).toFixed(2));
  const twin = (belts) => { const v = world(yard(belts)); const g = spawnEnemy(v, 'gaunt', 24 * S, 2 * S + 1, 0); g.state = 'chase'; Object.assign(v.player, { x: 3 * S, z: 2 * S + 1 }); run(v, 120); return { v, g }; };
  const A = twin([{ rect: [10, 1, 29, 3], period: 20 }]), P = twin([]);       // the same corridor with the clocked belt and with the ordinary current: the creature on the belt is pushed 3 m/s (after the ease), the other 2.2
  assert.ok(A.g.x > P.g.x + 0.3, 'a creature on the belt is carried by the belt: ' + A.g.x.toFixed(2) + ' vs ' + P.g.x.toFixed(2) + ' on a plain current');
  const v = A.v;
  const b = v.map.belts[0]; assert.equal(beltAtCell(v.map, 12, 2), b); assert.equal(beltAtCell(v.map, 5, 2), null); assert.equal(beltPush(v.map, 5 * S, 2 * S, 0), null); assert.equal(beltPush(v.map, 12 * S, 2 * S, 5).speed, BELT.speed);
});

test('a map with no belts is untouched: map.belts is empty, and the parser fills the defaults of one that has them (flip, the belt speed)', async () => {
  const { default: fs } = await import('node:fs'); const m = parseMap(JSON.parse(fs.readFileSync(new URL('../maps/C2M01.json', import.meta.url), 'utf8'))); assert.deepEqual(m.belts, []);
  assert.equal(parseMap(yard()).belts.length, 1); assert.equal(parseMap(yard()).belts[0].mode, 'flip'); assert.equal(parseMap(yard()).belts[0].speed, BELT.speed);
});
