// PT-037 (Campaign 2 Act A, E3): CURRENT, wading water that pushes. Four floor effects (> < ^ v) carry whoever stands on them, FLOW.push m/s on top of their own movement; every other floor is what it was.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './helpers.js';
import { parseMap, validateMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { FX, FLOW, PLAYER } from '../src/engine/defs.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const run = (w, n, cmd = () => idle()) => { const ev = []; for (let i = 0; i < n; i++) { step(w, cmd(i)); ev.push(...drainEvents(w)); } return ev; };
const W = 40;
/** a hall 40 cells long and 7 wide; the fx layer is `fxRow` on every row of the hall (so a current runs the whole width), the player at cell 4 */
const hall = (fxRow, entities = []) => ({ format: 1, id: 'C1', version: 1, name: 'Current', cellSize: 2,
  grid: ['#'.repeat(W), ...Array.from({ length: 7 }, () => '#' + '.'.repeat(W - 2) + '#'), '#'.repeat(W)],
  fx: ['.'.repeat(W), ...Array.from({ length: 7 }, () => fxRow), '.'.repeat(W)],
  doors: [], secrets: [], entities: [{ type: 'player', at: [4, 4], facing: 'east' }, { type: 'exit', at: [38, 4] }, ...entities] });
const row = (from, to, c) => Array.from({ length: W }, (_, i) => (i >= from && i <= to ? c : '.')).join('');
const world = (fxRow, entities) => createWorld(parseMap(hall(fxRow, entities)), { seed: 1, difficulty: 'normal' });
const put = (w, cx, cz = 4) => Object.assign(w.player, { x: (cx + 0.5) * 2, z: (cz + 0.5) * 2, vx: 0, vz: 0 });

test('the four flowing floors exist, are water to the arc lamp and to the walker, and a map without them has none', () => {
  for (const c of ['>', '<', '^', 'v']) { assert.ok(FX[c].flow, c); assert.equal(FX[c].water, true); assert.ok(FX[c].speed < 1); }
  assert.deepEqual(FX['>'].flow, [1, 0]); assert.deepEqual(FX['^'].flow, [0, -1]);
  assert.equal(validateMap(hall(row(10, 20, '>'))).ok, true);
  assert.equal(parseMap(hall(row(10, 20, '>'))).hasCurrent, true); assert.equal(parseMap(hall(row(10, 20, 'w'))).hasCurrent, false); assert.equal(parseMap(hall('.'.repeat(W))).hasCurrent, false);
});

test('standing still in a current, you are carried at the current\'s speed; the floor beside it does nothing', () => {
  const w = world(row(8, 30, '>')); put(w, 10); const x0 = w.player.x; run(w, 60);
  assert.ok(Math.abs(w.player.x - x0 - FLOW.push) < 0.15, `carried ${(w.player.x - x0).toFixed(2)} m in a second (${FLOW.push})`);
  const d = world(row(8, 30, '>')); put(d, 3); const y0 = d.player.x; run(d, 60); assert.ok(Math.abs(d.player.x - y0) < 0.01, 'dry floor: nothing');
  const n = world(row(8, 30, '^')); put(n, 12); const z0 = n.player.z; run(n, 60); assert.ok(Math.abs(z0 - n.player.z - FLOW.push) < 0.15, 'north current: carried towards -z');
});

test('upstream is slow, downstream is fast, across is untouched but for the drift', () => {
  const speedAfter = (yaw, cell) => { const w = world(row(6, 38, '>')); put(w, cell); w.player.yaw = yaw; run(w, 60 * 2, () => idle({ move: [0, 1], yaw: 0 })); const x0 = w.player.x; run(w, 60, () => idle({ move: [0, 1] })); return (w.player.x - x0); };
  const up = (() => { const w = world(row(6, 38, '>')); put(w, 34); w.player.yaw = Math.PI / 2; run(w, 90, () => idle({ move: [0, 1] })); const x0 = w.player.x; run(w, 60, () => idle({ move: [0, 1] })); return x0 - w.player.x; })();
  const down = (() => { const w = world(row(6, 38, '>')); put(w, 4); w.player.yaw = -Math.PI / 2; run(w, 90, () => idle({ move: [0, 1] })); const x0 = w.player.x; run(w, 60, () => idle({ move: [0, 1] })); return w.player.x - x0; })();
  assert.ok(up > 2.2 && up < 3.4, `upstream ${up.toFixed(2)} m/s`); assert.ok(down > 6.6 && down < 7.6, `downstream ${down.toFixed(2)} m/s`); assert.ok(down > up * 2);
  void speedAfter;
});

test('a wall stops the current as it stops anything', () => {
  const w = world(row(6, 38, '>')); put(w, 36); run(w, 60 * 4); assert.ok(w.player.x < 39 * 2 - PLAYER.radius + 0.01 && w.player.x > 37 * 2, `against the east wall (${w.player.x.toFixed(2)})`);
});

test('an awake walker is carried; a sleeper, a flyer and a node are not', () => {
  const ent = [{ type: 'enemy', kind: 'tollbearer', at: [12, 2] }, { type: 'enemy', kind: 'gill', at: [14, 2] }, { type: 'enemy', kind: 'tollbearer', at: [36, 2] }];
  const w = world(row(8, 38, '>'), ent); put(w, 14, 6); Object.assign(w.player, { z: 13 });
  const [a, g, s] = w.enemies; a.state = 'chase'; a.lastX = a.x; a.lastZ = a.z + 8; a.lost = 0; g.state = 'chase'; g.lastX = g.x; g.lastZ = g.z + 8; g.lost = 0;
  const ax = a.x, gx = g.x, sx = s.x; run(w, 60);
  assert.ok(a.x - ax > 1.4, `the awake Tollbearer drifted east (${(a.x - ax).toFixed(2)} m)`); assert.equal(s.x, sx, 'the sleeper lies where it was put');
  assert.ok(Math.abs(g.x - gx) < 0.8, 'a Drone-Gill flies over it');
});

test('the current is drawn: four tinted copies of the sea scrolled along their direction, and the sim is the only thing that decides who moves', () => {
  const lm = fs.readFileSync(path.join(ROOT, 'src/render/levelmesh.js'), 'utf8'), vw = fs.readFileSync(path.join(ROOT, 'src/render/view.js'), 'utf8');
  assert.match(lm, /for \(const c of \['>', '<', '\^', 'v'\]\)/); assert.match(vw, /m\.map\.offset\.set/);
});
