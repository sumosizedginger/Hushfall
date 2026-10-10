// PT-032 (Episode 4, Batch A): LOW GRAVITY without a jump key: a map's vents throw a player along a ballistic arc (LOWG in defs.js, launchFrom / airMove / voidFall in world.js), and a `_` tile is open sky (the void). Synthetic corridors: a deck, a gap of
// open sky, a deck. The arc is exact for the sim's integrator; steering moves the landing; a miss in the void costs 15 and a walk back; nothing happens in a world that has no vent.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMap, parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, hashWorld, blockedCircle, spawnEnemy } from '../src/engine/world.js';
import { makeSave, parseSave, loadWorld } from '../src/engine/save.js';
import { analyseReach } from '../src/engine/reach.js';
import { findTraps } from '../src/engine/traps.js';
import { LOWG, TICK } from '../src/engine/defs.js';
import { runRoute } from '../src/engine/harness.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const run = (w, n, cmd = () => idle()) => { const ev = []; for (let i = 0; i < n; i++) { step(w, cmd(i)); ev.push(...drainEvents(w)); } return ev; };
const cellC = (c) => (c + 0.5) * 2;
const bad = (s, re) => { const v = validateMap(s); assert.equal(v.ok, false, 'expected invalid'); assert.ok(v.errors.some((e) => re.test(e)), re + ' in ' + JSON.stringify(v.errors)); };

/** a deck (x 1..5, the plate at x 5), eight cells of open sky (x 6..13), a deck (x 14..18); open air (outdoor floor), five rows; the landing deck is `landH` half-metres up */
const skyGap = ({ landH = '.', to = [16, 2], time = 3, vents = null, g = null } = {}) => {
  const row = (z) => '#' + ':::::'.padEnd(5) + '_'.repeat(8) + ':::::' + '#';
  const full = ['#'.repeat(20), row(1), row(2), row(3), '#'.repeat(20)];
  return {
    format: 1, id: 'A1', version: 1, name: 'Air', cellSize: 2, grid: full, doors: [], secrets: [],
    heights: full.map((r, z) => (z === 0 || z === 4 ? '.'.repeat(20) : '.'.repeat(14) + String(landH).repeat(5) + '.')),
    vents: vents ?? [{ at: [5, 2], to, time, ...(g ? { g } : {}) }],
    entities: [{ type: 'player', at: [2, 2], facing: 'east' }, { type: 'exit', at: [18, 3] }],
  };
};
const world = (src, opts = {}) => createWorld(parseMap(src), { seed: 1, difficulty: 'normal', ...opts });
const onPlate = (w, dz = 0) => { Object.assign(w.player, { x: cellC(5), z: cellC(2) + dz, yaw: -Math.PI / 2, y: 0 }); };

test('a valid sky gap loads; the validator refuses a vent that lands in the void, on its own plate, on a wall, out of range, or whose arc hits a roof; and open sky on the edge of the map', () => {
  const ok = validateMap(skyGap()); assert.equal(ok.ok, true, JSON.stringify(ok.errors));
  bad(skyGap({ to: [9, 2] }), /not a floor cell/); bad(skyGap({ to: [5, 2] }), /own plate/); bad(skyGap({ to: [16, 0] }), /not a floor cell/);
  bad(skyGap({ time: 0.5 }), /time must be in/); bad(skyGap({ time: 12 }), /time must be in/);
  bad(skyGap({ vents: [{ at: [5, 2], to: [16, 2], time: 3 }, { at: [5, 2], to: [15, 2], time: 3 }] }), /two vents on one plate/);
  const s = skyGap(); s.grid[2] = '_' + s.grid[2].slice(1); bad(s, /on the map edge/);
  const roof = skyGap(); roof.grid = roof.grid.map((r) => r.replace(/:/g, '.')); bad(roof, /no headroom/);            // an interior deck under the default roof: the arc's apex would hit it
  const wall = skyGap(); wall.grid[2] = wall.grid[2].slice(0, 9) + '#' + wall.grid[2].slice(10); bad(wall, /passes through a wall/);
});

test('the arc is exact: from the plate the body is at the landing cell centre after the flight time, lands there (not before), at the landing height (level, and a 2 m higher deck)', () => {
  for (const landH of ['.', '4']) {
    const w = world(skyGap({ landH })); onPlate(w); const ev = run(w, 2); assert.ok(w.player.air, 'launched'); assert.equal(ev.filter((e) => e.type === 'vent_launch').length, 1);
    const n = Math.round(3 / TICK); let apex = 0, landedAt = -1;
    for (let i = 2; i < n + 30; i++) { step(w, idle()); for (const e of drainEvents(w)) if (e.type === 'air_land' && landedAt < 0) landedAt = i + 1; apex = Math.max(apex, w.player.y); if (!w.player.air) break; }
    assert.ok(Math.abs(landedAt - n) <= 1, `landed after ${landedAt} ticks (flight ${n})`); assert.ok(Math.abs(w.player.x - cellC(16)) < 0.1 && Math.abs(w.player.z - cellC(2)) < 0.1, `at ${w.player.x.toFixed(2)}, ${w.player.z.toFixed(2)}`);
    assert.equal(w.player.y, landH === '.' ? 0 : 2, 'on the deck'); assert.ok(apex > 2.5, 'a high arc: ' + apex.toFixed(2)); assert.equal(w.player.air, undefined, 'the state is gone'); assert.equal(w.stats ? w.player.hp : 100, 100, 'unhurt');
  }
});

test('steering moves the landing (a quarter of walking speed), and a body steered short of the deck falls: the void hurts 15, sets the player back on the last solid ground, never kills', () => {
  const side = world(skyGap()); onPlate(side); run(side, 2); run(side, 200, () => idle({ move: [1, 0] })); assert.ok(Math.abs(side.player.z - cellC(2)) > 1.5, 'strafing in the air moved the landing: z ' + side.player.z.toFixed(2));
  const miss = world(skyGap({ to: [14, 2] })); onPlate(miss); const hp0 = miss.player.hp; let ev = run(miss, 2); ev.push(...run(miss, 300, () => idle({ move: miss.player.air ? [0, -1] : [0, 0] })));        // held BACK (west) the whole flight (and let go on the ground)
  assert.ok(ev.some((e) => e.type === 'void_fall'), 'a miss'); assert.equal(miss.player.hp, hp0 - LOWG.voidDamage); assert.equal(miss.status, 'playing', 'alive'); assert.equal(miss.player.air, undefined);
  assert.ok(miss.player.x < cellC(6) && miss.player.x > cellC(1), 'set back on the near deck: ' + miss.player.x.toFixed(2)); assert.equal(miss.player.y, 0);
  const again = run(miss, 20); assert.ok(!again.some((e) => e.type === 'vent_launch'), 'the plate rests after a set-back (and the player was put beside it, not on it)');
  const exact = world(skyGap({ to: [14, 2] })); onPlate(exact); const ex = run(exact, 260); assert.ok(!ex.some((e) => e.type === 'void_fall') && ex.some((e) => e.type === 'air_land'), 'unsteered, the same throw lands');
});

test('open sky blocks walking for the player and for creatures, but not for a body in the air, and is not solid to sight or shots; a plate fires only on the ground and rests half a second', () => {
  const w = world(skyGap()); Object.assign(w.player, { x: cellC(4), z: cellC(1), y: 0 }); const ev = run(w, 300, () => idle({ move: [0, 1] }));        // forward = east, towards the sky, off the plate's row
  assert.ok(w.player.x < cellC(6) - 0.2, 'the edge stops a walker at ' + w.player.x.toFixed(2)); assert.ok(!ev.some((e) => e.type === 'void_fall'), 'and it is not a fall');
  const g = spawnEnemy(w, 'gaunt', cellC(14), cellC(2), 0); const cx = cellC(9), cz = cellC(2);
  assert.equal(blockedCircle(w, cx, cz, 0.3, g), true, 'a creature cannot stand in the sky'); assert.equal(blockedCircle(w, cx, cz, 0.3, { ...w.player, air: { vy: 0 } }), false, 'a body in the air can');
  const f = spawnEnemy(w, 'gill', cellC(14), cellC(3), 0); assert.equal(blockedCircle(w, cx, cz, 0.3, f), false, 'and a flyer');
  const w2 = world(skyGap()); onPlate(w2); run(w2, 2); assert.ok(w2.player.air); const cd = w2.player.ventCd; assert.ok(cd > 0 && cd <= LOWG.ventCooldown, 'a rest after a launch');
});

test('a world with no vent and no open sky never has the state: every shipped map plays as before (the route fingerprints are the proof; here one ground run)', () => {
  const r = runRoute(parseMap(JSON.parse(JSON.stringify(skyGap({ vents: [] })))), [{ op: 'goto', at: [4, 2] }], { seed: 1 });
  assert.ok(r.world.player.air === undefined && r.world.player.lastSafe !== undefined, 'a void map remembers where it stood, nothing else');
  const m = parseMap(JSON.parse(JSON.stringify({ ...skyGap(), vents: [], grid: skyGap().grid.map((x) => x.replace(/_/g, ':')) }))); assert.equal(m.hasVoid, false); assert.equal(createWorld(m, { seed: 1 }).player.lastSafe, undefined);
});

test('a vent is an edge for the reach analysis and the trap search (the far deck is reachable, and not a trap: it has the exit)', () => {
  const m = parseMap(skyGap()); const reach = analyseReach(m); assert.equal(reach.exitReachable, true, 'the exit on the far deck is reached through the vent');
  assert.equal(findTraps(m).traps, 0);
  const dead = parseMap(skyGap({ vents: [] })); assert.equal(analyseReach(dead).exitReachable, false, 'without the vent the gap cannot be crossed');
});

test('the route bot rides a vent: the path crosses the plate to the landing, it does not steer in the air, and it completes the gap (a fingerprint of one run)', () => {
  const r = runRoute(parseMap(skyGap({ to: [14, 2] })), [{ op: 'goto', at: [16, 2] }, { op: 'goto', at: [18, 3] }], { seed: 1 });
  assert.equal(r.result === 'bot-failed' ? r.failure : 'ok', 'ok'); assert.ok(r.world.player.x > cellC(14), 'across: ' + r.world.player.x.toFixed(1)); assert.equal(r.world.player.hp, 100);
});

test('determinism and save / load in the air: two runs agree, and a save taken mid-flight resumes to the same landing and the same state', () => {
  const a = world(skyGap()), b = world(skyGap()); onPlate(a); onPlate(b); run(a, 90); run(b, 90); assert.equal(hashWorld(a), hashWorld(b)); assert.ok(a.player.air, 'still in the air at 1.5 s');
  const parsed = parseSave(JSON.stringify(makeSave(a, 'mid-level', { now: 5 }))); assert.equal(parsed.ok, true);
  const loaded = loadWorld(parsed.save, () => parseMap(skyGap())); assert.equal(loaded.ok, true); assert.ok(loaded.world.player.air, 'the air state survives the save');
  run(a, 200); run(loaded.world, 200); assert.equal(hashWorld(loaded.world), hashWorld(a), 'the resumed flight lands exactly where the uninterrupted one does'); assert.equal(a.player.air, undefined);
});
