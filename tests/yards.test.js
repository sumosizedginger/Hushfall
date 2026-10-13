// PT-045 (DROP B of the Preview): THE HIVE YARDS (maps-dev/HIVEYARDS.json: belts, cars, the beat, the tall shaft, the tide, the collapse). Dev-only, like HIVE: no status, no manifest. What this file holds is what the plan promised about the yards, played in the sim: every
// machine does what its plate says, the map has no trap and every thing in it can be reached, and the pieces are where the owner will look for them. What it CANNOT hold is whether any of it is good to play: that is the owner's, in the DEV picker, on Easy.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseMap, validateMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { carState } from '../src/engine/cars.js';
import { sporeState } from '../src/engine/breath.js';
import { analyseReach } from '../src/engine/reach.js';
import { findTraps } from '../src/engine/traps.js';
import { fxAt } from '../src/engine/terrain.js';
import { mapLintChecks } from '../tools/maplint.mjs';
import { LOADS, DIFFICULTY } from '../src/engine/defs.js';
import { ROOT } from './helpers.js';

const load = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'maps-dev', 'HIVEYARDS.json'), 'utf8'));
const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const fresh = () => createWorld(parseMap(load()), { seed: 1, difficulty: 'easy' });
const C = (c) => (c + 0.5) * 2;                                         // the middle of a cell, metres
const put = (w, cx, cz, yaw = 0) => { Object.assign(w.player, { x: C(cx), z: C(cz), yaw, vx: 0, vz: 0, hp: 100 }); w.player.y = 0; return w; };
const until = (w, t, cmd = () => idle(), ev = []) => { while (w.time < t - 1e-9 && w.status === 'playing') { step(w, cmd()); ev.push(...drainEvents(w)); } return ev; };
const walk = (w, yaw, secs, ev = []) => { w.player.yaw = yaw; return until(w, w.time + secs, () => idle({ move: [0, 1] }), ev); };
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;
const EAST = -Math.PI / 2, WEST = Math.PI / 2, NORTH = 0, SOUTH = Math.PI;

test('THE YARDS: a dev map (never in maps/), valid, the Range\'s rules, and every machine of drop B is in it in the number the plan gave', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'maps', 'HIVEYARDS.json')), false); const src = load(), v = validateMap(src); assert.ok(v.ok, JSON.stringify(v.errors?.slice(0, 3)));
  const m = parseMap(src); assert.equal(m.range, true); assert.equal(m.cars.length, 2); assert.equal(m.belts.length, 2); assert.equal(m.vents.length, 5); assert.equal(m.pulses.length, 6); assert.ok(m.tide && m.tide.rect && m.tide.loop === 120);
  assert.equal(m.sectors.length, 4, 'the lift and three bridges'); assert.equal(m.loads.length, 15, 'the shuttle and a front of fourteen strips'); assert.ok(m.loads.filter((l) => l.start != null).length === 15 && m.loads.filter((l) => l.loop === 160).length === 14);
  assert.deepEqual(m.belts.map((b) => b.mode), ['flip', 'run']); assert.equal(m.cars.map((c) => c.id).join(), 'shuttle,climber'); assert.ok(m.floor(34, 49) === 30.5 && m.floor(20, 60) === 0, 'the taller format: a ledge at 30.5 m over a well');
  for (const id of ['a1', 'b1', 'c1', 'a2', 'c2', 'a3', 'hub', 'exit']) assert.ok(src.messages.some((q) => q.id === id), 'a plate ' + id);
  const z = (look) => src.lookZones.find((q) => q.look === look); for (const look of ['veins', 'nerve', 'hive', 'descent', 'tide', 'fault', 'customs']) assert.ok(z(look), 'a zone lit by the ' + look + ' look'); assert.equal(z('hive').beat, true, 'the beat yard feels the beat');
});

test('the yards have no trap, no lamp hanging in the open, every thing in them can be reached, and the exit too', () => {
  const m = parseMap(load()), bad = mapLintChecks(m).filter((c) => !c.ok); assert.deepEqual(bad.map((c) => c.name + ': ' + c.detail), [], 'the placement lint'); assert.equal(findTraps(m).traps, 0, 'no trap');
  const r = analyseReach(m); assert.equal(r.exitReachable, true); assert.deepEqual(r.unreachable, [], 'everything can be reached (the cars, the lift and the vents count as ways)');
});

test('THE BELT YARD: the north belt carries you east, stands still (the tell), carries you back west; the south belt runs 12 s of every 20; a load crosses the north lane every 10 s', () => {
  const w = put(fresh(), 20, 11, NORTH), xs = (t) => { until(w, t); return w.player.x; };
  const x0 = w.player.x, a = xs(5); assert.ok(a - x0 > 9, 'carried east: ' + (a - x0).toFixed(1) + ' m in 5 s'); const s1 = xs(11.25), s2 = xs(11.55); assert.ok(near(s1, s2, 0.02), 'stopped: ' + s1.toFixed(2) + ' then ' + s2.toFixed(2) + ' (the stop is 11.2..12 s)');
  const b = xs(20); assert.ok(b < s2 - 10, 'carried back west in the second half: ' + s2.toFixed(1) + ' -> ' + b.toFixed(1));
  const v = put(fresh(), 40, 29, NORTH), z0 = v.player.x; until(v, 10); assert.ok(v.player.x < z0 - 12, 'the south belt runs west while it runs'); until(v, 13); const r1 = v.player.x; until(v, 19.5); assert.ok(near(v.player.x, r1, 0.05), 'and rests (t 12..20): ' + r1.toFixed(2) + ' -> ' + v.player.x.toFixed(2));
  const l = fresh(); const ev = until(l, 40).filter((e) => e.type === 'load_land' && e.i === 0); assert.equal(ev.length, 4, 'the shuttle load lands at 6, 16, 26 and 36 s'); assert.ok(near(l.map.loads[0].start, 6));
});

test('THE CAR YARD: boarding the shuttle at the west dock, riding it east and stepping off at the far dock hurts nothing and never sets the player back; the climber arrives 3 m up', () => {
  const m = parseMap(load()), shuttle = m.cars[0], climber = m.cars[1], w = fresh(), ev = [];
  put(w, 91, 12, EAST); until(w, 1.0, () => idle(), ev); assert.ok(carState(shuttle, w.time).stop === 0, 'the shuttle waits at the west dock at the start'); walk(w, EAST, 1.0, ev); until(w, w.time + 1.5, () => idle(), ev); assert.ok(w.player.x > 187 && w.player.x < 194.5, 'on the deck: x ' + w.player.x.toFixed(1)); const off = w.player.x - carState(shuttle, w.time).x;
  until(w, 8 + 1.5 * 22 / 5 + 1, () => idle(), ev); const st = carState(shuttle, w.time); assert.ok(st.stop === 1 && near(w.player.x - st.x, off, 0.15), 'carried the whole way: ' + (w.player.x - st.x).toFixed(2) + ' against ' + off.toFixed(2)); assert.ok(near(w.player.y, 0));
  walk(w, EAST, 1.4, ev); assert.ok(w.player.x > 217, 'stepped off onto the far dock: ' + w.player.x.toFixed(1)); assert.ok(!ev.some((e) => e.type === 'void_fall'), 'no miss'); assert.equal(w.player.hp, 100);
  const k = fresh(), kev = []; put(k, 91, 28, EAST); until(k, 40, () => idle(), kev); let guard = 0; while (!(carState(climber, k.time).stop === 0 && carState(climber, k.time).until > 5.5) && guard++ < 6000) step(k, idle()); drainEvents(k);
  put(k, 91, 28, EAST); k.player.hp = 100; walk(k, EAST, 1.0, kev); until(k, k.time + 1, () => idle(), kev); const c0 = carState(climber, k.time); assert.ok(near(c0.y, 0) && k.player.x > 187, 'boarded at the foot'); until(k, k.time + c0.until + 1.5 * 22 / 5 + 0.6, () => idle(), kev);
  assert.ok(near(k.player.y, 3, 0.05), 'the climber arrives 3 m up with the rider: y ' + k.player.y.toFixed(2)); walk(k, EAST, 1.2, kev); assert.ok(near(k.player.y, 3, 0.05) && k.player.x > 216, 'and the rider steps off onto the raised dock'); assert.ok(!kev.some((e) => e.type === 'void_fall'));
});

test('THE BEAT YARD: the bridge blooms a segment at a time, a beat apart, in order, towards the island; the choir on the island is on the beat; the zone feels the beat', () => {
  const m = parseMap(load()), at = (k, t) => sporeState(m.pulses[k], t).on;
  for (let k = 0; k < 6; k++) { const t = 1.5 * k + 0.3; for (let j = 0; j < 6; j++) assert.equal(at(j, t), (j - k) % 4 === 0, 'segment ' + j + ' at ' + t.toFixed(1) + ' s (the bloom of segment ' + k + ')'); }
  assert.ok(at(0, 0.3) && at(1, 1.8) && at(2, 3.3) && at(3, 4.8), 'a beat later, the next segment: the pulse travels towards the island');
  const src = load(), beats = src.entities.filter((e) => e.onBeat); assert.equal(beats.length, 6); assert.equal(beats.filter((e) => e.kind === 'tollbearer' && e.variant === 'hived').length, 4); assert.equal(beats.filter((e) => e.kind === 'chorister').length, 2);
  assert.ok(src.entities.every((e) => !e.onBeat || e.hold === 'turn'), 'range targets: they act, they cannot be killed');
});

test('THE TALL SHAFT: a 30.5 m ledge over a well; the lift carries the player up it; each plate throws the player to the next ledge down; stepping off an edge is a dive to the floor', () => {
  const w = fresh(), lift = w.map.sectors[0]; assert.equal(lift.id, 'shaftlift'); const ev = [];
  put(w, 20, 60, NORTH); until(w, 0.2); put(w, 34, 52, NORTH); until(w, 0.3, () => idle(), ev); assert.ok(near(w.player.y, 0, 0.5), 'on the lift at the bottom'); const t0 = w.time;
  let top = 0; while (w.time < t0 + 30 && w.status === 'playing') { step(w, idle()); drainEvents(w); top = Math.max(top, w.player.y); if (w.player.y > 30.4) break; } assert.ok(w.player.y > 30.4, 'the lift carried the player to the top: ' + top.toFixed(2) + ' (took ' + (w.time - t0).toFixed(1) + ' s)');
  walk(w, NORTH, 0.5, ev); assert.ok(near(w.player.y, 30.5, 0.05) && w.player.z < C(51), 'stepped from the lift onto the north ledge, 30.5 m up: z ' + w.player.z.toFixed(1));
  const hops = [[[38, 48], [38, 55], 24.5], [[38, 56], [38, 64], 24.5], [[38, 67], [34, 72], 18.5], [[10, 72], [10, 64], 12.5], [[10, 56], [20, 60], 0]];
  for (const [[ax, az], [bx, bz], y] of hops) {
    const v = fresh(); Object.assign(v.player, { x: C(ax), z: C(az), vx: 0, vz: 0, y: v.map.floor(ax, az) }); const e2 = []; until(v, 0.05, () => idle(), e2); assert.ok(v.player.air, 'the plate at ' + ax + ',' + az + ' threw the player'); until(v, v.time + 10, () => idle(), e2);
    assert.ok(!v.player.air && Math.hypot(v.player.x - C(bx), v.player.z - C(bz)) < 1.2, 'landed at ' + bx + ',' + bz + ': ' + (v.player.x / 2 - 0.5).toFixed(1) + ',' + (v.player.z / 2 - 0.5).toFixed(1)); assert.ok(near(v.player.y, y, 0.05), 'on the ledge ' + y + ' m: y ' + v.player.y); assert.ok(!e2.some((e) => e.type === 'void_fall') && v.player.hp === 100);
  }
  const d = fresh(); Object.assign(d.player, { x: C(20), z: C(49), vx: 0, vz: 0, y: 30.5, yaw: SOUTH }); until(d, 0.05); walk(d, SOUTH, 1.2); assert.ok(near(d.player.y, 0, 0.05) && d.player.z > C(51), 'a dive: the floor of the well, 30.5 m down, in a step: y ' + d.player.y + ' z ' + d.player.z.toFixed(1)); assert.equal(d.status, 'playing'); assert.equal(d.player.hp, 100, 'a dive hurts nothing (the game has no fall damage)');
});

test('THE TIDE DOCK: the basin floods first, then the low quay, then the middle terrace; the top never; the water is the dock\'s own (the plaza and every other yard stay dry); it goes out again and the loop is seamless', () => {
  const w = fresh(), wet = (t, cx, cz) => { w.time = t; return fxAt(w, C(cx), C(cz)) === 'w'; };
  assert.equal(wet(5, 150, 60), false, 'dry at the start'); assert.equal(wet(30, 150, 60), true, 'the basin at 0.8 m'); assert.equal(wet(30, 165, 60), false, 'the quay (1 m) is dry at 0.8 m'); assert.equal(wet(57, 165, 60), true, 'the quay at 1.8 m'); assert.equal(wet(57, 178, 60), false, 'the middle terrace (2.5 m) is dry at 1.8 m');
  assert.equal(wet(85, 178, 60), true, 'the middle terrace at 3.2 m'); assert.equal(wet(85, 190, 60), false, 'the top terrace (4 m) never floods'); assert.equal(wet(85, 100, 60), false, 'the plaza is not under the tide'); assert.equal(wet(85, 20, 20), false, 'nor is any other yard'); assert.equal(wet(85, 20, 100), false);
  assert.equal(wet(115, 150, 60), false, 'out again'); assert.equal(wet(125, 150, 60), false, 'and the loop begins again dry (120 s)'); assert.equal(wet(150, 150, 60), true, 'and floods again 30 s into the next loop');
});

test('THE COLLAPSE YARD: the first strip of the front lands 30 s in, the next 8 s later, each hurts only whoever stands in it; the bridges sink once the south road is reached, and a stair climbs out of the pit', () => {
  const w = put(fresh(), 7, 88, NORTH), ev = []; w.player.hp = 100; until(w, 29.9, () => idle(), ev); assert.equal(ev.filter((e) => e.type === 'load_land' && e.i >= 1).length, 0, 'nothing has fallen yet'); assert.equal(w.player.hp, 100); assert.equal(w.player.armor, 100);
  until(w, 30.5, () => idle(), ev); const land = ev.find((e) => e.type === 'load_land' && e.i === 1); assert.ok(land, 'strip 0 landed'); assert.equal((100 - w.player.hp) + (100 - w.player.armor), Math.round(LOADS.damage * DIFFICULTY.easy.enemyDamage), 'on the player standing in it (armour and health between them take the blow)'); assert.ok(ev.some((e) => e.type === 'shake'), 'the view shook as it began to fall');
  until(w, 38.5, () => idle(), ev); assert.ok(ev.some((e) => e.type === 'load_land' && e.i === 2), 'strip 1 eight seconds later');
  const b = put(fresh(), 19, 99, SOUTH), bev = []; until(b, 0.2, () => idle(), bev); assert.ok(bev.some((e) => e.type === 'shake'), 'the mid-bridge tremor'); assert.ok(near(b.sectors[1].h, 2), 'bridge 1 starts at road height'); put(b, 19, 110, SOUTH); until(b, b.time + 3, () => idle(), bev); assert.ok(near(b.sectors[1].h, 0.5), 'the deck sank 1.5 m once the south road was reached: ' + b.sectors[1].h);
  assert.ok(near(b.sectors[2].h, 2) && near(b.sectors[3].h, 2), 'the other bridges are untouched'); put(b, 19, 100, NORTH); b.player.y = b.sectors[1].h; until(b, b.time + 0.1); walk(b, SOUTH, 3.2, bev); assert.ok(b.player.z > C(107) && b.player.y > 1.4, 'walked up the stair out of the pit onto the south road: z ' + b.player.z.toFixed(1) + ' y ' + b.player.y.toFixed(2));
});
