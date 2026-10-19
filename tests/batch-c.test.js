// PT-033 (Episode 4, Batch C): THE COLD DOCK (C1E4M03), the shipped map held to what it says: three locks of two interlocked doors each, three bays in vacuum while their hatches are open, the arrival bay with its air, the north lock shut until both
// couplings are seated, the panel that shuts the north hatches and nothing else, the barracks reachable, the route finishing on every difficulty. The engine rules are in tests/airlock.test.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMap } from '../src/engine/mapformat.js';
import { createWorld, doorAtCell } from '../src/engine/world.js';
import { runActions } from '../src/engine/script.js';
import { inVacuum, lockBusy } from '../src/engine/airlock.js';
import { analyseReach } from '../src/engine/reach.js';
import { loadMapFile, loadRouteFile, runRoute } from '../src/engine/harness.js';
import { LOCK } from '../src/engine/defs.js';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './helpers.js';
import { pathToFileURL } from 'node:url';
import { cellToShipped, cellToSource } from '../tools/mapkit/squeeze.mjs';

const src = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps/C1E4M03.json'), 'utf8')), map = parseMap(src);
const world = () => createWorld(map, { seed: 1, difficulty: 'normal' });
const C = (c) => (c + 0.5) * 2;
// the map is SQUEEZED (PT-052 Level B): this test thinks in the drawing's cells, the shipped JSON is narrower, so a drawing cell goes through the squeeze before it becomes metres
const SQ = (await import(pathToFileURL(path.join(ROOT, 'maps-src/C1E4M03.level.mjs')).href)).default.squeeze, S = (x, z) => cellToShipped([x, z], SQ), CC = (x, z) => S(x, z).map(C);
const locks = src.doors.filter((d) => d.interlock);

test('three airlocks: six doors in pairs, each naming the other, each pair with its chamber between', () => {
  assert.equal(locks.length, 6);
  for (const d of locks) { const p = locks.find((q) => q.at.join() === d.interlock.join()); assert.ok(p && p.interlock.join() === d.at.join(), `${d.at} and ${d.interlock} name each other`); assert.equal(Math.abs(p.at[0] - d.at[0]) + Math.abs(p.at[1] - d.at[1]), 3, 'a chamber of two cells between them'); }
});
test('the bays: the hatches are open at the start, and east, west and north are in vacuum while the south is not; the hub keeps its air', () => {
  const w = world(); const hatches = src.doors.filter((d) => d.open); assert.equal(hatches.length, 9, 'three hatches in each of three bays');
  for (const h of hatches) assert.equal(doorAtCell(w, h.at[0], h.at[1]).open, 1);
  const bay = (name, d, lat = 0) => { const a = { N: [0, -1, 1, 0], E: [1, 0, 0, 1], S: [0, 1, -1, 0], W: [-1, 0, 0, -1] }[name]; return CC(46 + a[0] * d + a[2] * lat, 46 + a[1] * d + a[3] * lat); };
  for (const name of ['N', 'E', 'W']) assert.equal(inVacuum(w, ...bay(name, 24)), true, name + ' is in vacuum');
  assert.equal(inVacuum(w, ...bay('S', 24)), false); assert.equal(inVacuum(w, ...CC(46, 52)), false, 'the hub');
  assert.equal(inVacuum(w, ...bay('E', 14)), false, 'a lock chamber keeps its air while its outer door is shut');
});
test('the pockets are outside the vacuum: a closet in the west bay\'s wall has air', () => {
  const w = world(); const pocket = src.doors.map((d) => ({ ...d, at: cellToSource(d.at, SQ) })).filter((d) => !d.interlock && !d.remote && !d.open && d.at[0] < 46 && Math.abs(d.at[1] - 46) > 5 && d.at[0] > 14 && d.at[0] < 30);
  assert.ok(pocket.length >= 3, 'pocket doors in the west bay: ' + pocket.length);
  for (const d of pocket) { const dz = d.at[1] < 46 ? -3 : 3; assert.equal(inVacuum(w, ...CC(d.at[0], d.at[1] + dz)), false, `the closet behind ${d.at} has air`); assert.equal(inVacuum(w, ...CC(d.at[0], d.at[1] - dz)), true, `and the bay beside it has none`); }
});
test('the panel shuts the north hatches (ending the north vacuum) and leaves the others alone', () => {
  const w = world(), sw = src.entities.find((e) => e.type === 'switch' && e.id === 'hull'); runActions(w, sw.do);
  for (const d of w.doors) if (d.open > 0 && d.target === 0) d.open = 0;                                                    // (the doors close at 1.5 a second: take the second and a half as given)
  assert.equal(inVacuum(w, ...CC(46, 46 - 24)), false, 'the north bay has air again'); assert.equal(inVacuum(w, ...CC(46 + 24, 46)), true, 'the east bay does not');
});
test('the north lock is shut until both couplings are seated: the spine\'s switch wants them', () => {
  const sw = src.entities.find((e) => e.type === 'switch' && e.id === 'seat'); assert.deepEqual(sw.needs, ['brass', 'iron']);
  assert.ok(src.doors.some((d) => d.remote && d.at.join() === S(46, 35).join() && !d.open), 'the north lock\'s outer door is remote');
  assert.ok(sw.do.some((a) => a.open?.join() === S(46, 35).join()));
});
test('everything is reachable (the four barracks too), there is no trap, and the route finishes on every difficulty', () => {
  const r = analyseReach(map); assert.equal(r.exitReachable, true); assert.deepEqual(r.unreachable, []);
  for (const difficulty of ['easy', 'normal', 'hard']) { const run = runRoute(loadMapFile('maps/C1E4M03.json'), loadRouteFile('routes/C1E4M03.main.route.json'), { seed: 1, difficulty }); assert.equal(run.result, 'complete', `${difficulty}: ${run.failure}`); }
});
void lockBusy; void LOCK;
