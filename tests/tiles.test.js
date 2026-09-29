// Water tiles, wall/floor skins, and scenery, tested on tiny purpose-built maps.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMap, parseMap } from '../src/engine/mapformat.js';
import { analyseReach } from '../src/engine/reach.js';
import { createWorld, step, spawnEnemy, hasLOS, blockedCircle } from '../src/engine/world.js';
import { automapModel } from '../src/engine/automap.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });
const mini = (rows, { entities = [], doors = [], scenery = [] } = {}) => ({
  format: 1, id: 'T1', version: 1, name: 'Test', grid: rows, doors, secrets: [], scenery,
  entities: [{ type: 'player', at: [1, 1], facing: 'east' }, { type: 'exit', at: [5, 1] }, ...entities],
});
// a pond splits the level: west bank (cols 1-2), water (col 3), east bank (cols 4-5)
const POND = ['#######', '#..~..#', '#..~..#', '#######'];
const SPLIT = ['~~~~~~~', '~..~..~', '~..~..~', '~~~~~~~'];

test('water: valid at the map edge, but a floor tile at the edge is a leak', () => {
  assert.equal(validateMap(mini(SPLIT)).ok, true);
  const leak = validateMap(mini(['#######', '#..~..#', '#..~...', '#######']));
  assert.equal(leak.ok, false); assert.ok(leak.errors.some((e) => /not a wall or water/.test(e)));
});

test('water blocks walking (player and enemies) but not sight or shots', () => {
  const w = createWorld(parseMap(mini(POND)), { seed: 1 }); w.enemies.length = 0;
  Object.assign(w.player, { x: 3.0, z: 3.0, yaw: -Math.PI / 2 });                     // west bank, facing east toward the pond (water = x 6..8)
  for (let i = 0; i < 90; i++) step(w, idle({ move: [0, 1] }));
  assert.ok(w.player.x < 6 - 0.3 + 1e-6, 'stopped at the shore: x=' + w.player.x);
  assert.equal(blockedCircle(w, 7, 3, 0.3), true, 'the water cell itself is blocked');
  assert.equal(hasLOS(w, 3, 3, 11, 3), true, 'you can see across the pond');
  const e = spawnEnemy(w, 'tollbearer', 11, 3, -Math.PI / 2); e.hp = 1000; e.state = 'chase';
  w.player.x = 4; w.player.z = 3; w.player.weapons = ['flare', 'scattergun']; w.player.weapon = 'flare'; w.player.pitch = 0.05;
  for (let i = 0; i < 20; i++) step(w, idle({ aim: true }));
  step(w, idle({ aim: true, fire: true })); for (let i = 0; i < 120; i++) step(w, idle({ aim: true }));
  assert.ok(e.hp < 1000, 'the flare flew over the water and hurt the enemy: ' + e.hp);
  for (let i = 0; i < 600; i++) { step(w, idle()); w.player.hp = 100; }
  assert.ok(e.x > 8, 'the enemy cannot wade through the pond: x=' + e.x.toFixed(2));
});

test('reachability treats water as impassable: an exit across a pond is unreachable until a bridge exists', () => {
  assert.equal(analyseReach(parseMap(mini(POND))).exitReachable, false);
  const bridged = ['#######', '#..~..#', '#.....#', '#######'];                          // cells (3,2) is land: a causeway
  assert.equal(analyseReach(parseMap(mini(bridged))).exitReachable, true);
});

test('skins: B is a wall, p is open-air floor, and doors may sit in brick walls', () => {
  const m = parseMap(mini(['#######', '#.....#', '#BBDBB#', '#..p..#', '#######'], { doors: [{ at: [3, 2], key: null }] }));
  assert.equal(m.kind(1, 2), 'wall'); assert.equal(m.isWall(2, 2), true); assert.equal(m.skin(1, 2), 'B');
  assert.equal(m.kind(3, 3), 'outdoor'); assert.equal(m.isInterior(3 * 2 + 1, 3 * 2 + 1), false, 'a pier plank has no ceiling');
  assert.equal(m.isInterior(1 * 2 + 1, 1 * 2 + 1), true);
  assert.equal(validateMap(mini(['#######', '#.....#', '#BBDBB#', '#..p..#', '#######'], { doors: [{ at: [3, 2], key: null }] })).ok, true);
  assert.equal(m.doorAxis(3, 2), 'x');
  assert.equal(validateMap(mini(['#######', '#.x...#', '#######'])).ok, false, 'unknown tile still rejected');
});

test('entities may stand on pier planks; not on water or brick', () => {
  const ok = mini(['#######', '#..p..#', '#######'], { entities: [{ type: 'enemy', kind: 'gaunt', at: [3, 1] }] });
  assert.equal(validateMap(ok).ok, true);
  const bad = validateMap(mini(SPLIT, { entities: [{ type: 'pickup', kind: 'health_small', at: [3, 1] }] }));
  assert.equal(bad.ok, false); assert.ok(bad.errors.some((e) => /not on a floor\/outdoor tile/.test(e)));
});

test('scenery: distant props are validated, may lie outside the grid, and never collide', () => {
  const far = mini(POND, { scenery: [{ kind: 'tower', at: [-30, -20] }, { kind: 'boat', at: [1, 1], yaw: 1 }] });
  assert.equal(validateMap(far).ok, true);
  const m = parseMap(far); assert.equal(m.scenery.length, 2); assert.equal(m.scenery[0].x, (-30 + 0.5) * 2);
  const w = createWorld(m, { seed: 1 }); assert.equal(blockedCircle(w, m.scenery[1].x, m.scenery[1].z, 0.5), false, 'scenery has no collider');
  assert.equal(validateMap(mini(POND, { scenery: [{ kind: 'dragon', at: [1, 1] }] })).ok, false);
  assert.equal(validateMap(mini(POND, { scenery: [{ kind: 'tower', at: ['a', 1] }] })).ok, false);
  assert.equal(parseMap(mini(POND)).atmosphere.fog, '#2a2244', 'atmosphere has defaults');
});

test('automap: water is remembered as water, and you can explore across it', () => {
  const w = createWorld(parseMap(mini(SPLIT)), { seed: 1 }); w.enemies.length = 0; Object.assign(w.player, { x: 3, z: 3 });
  for (let i = 0; i < 18; i++) step(w, idle());
  const m = automapModel(w); const kinds = new Set(m.cells.map((c) => c.kind));
  assert.ok(kinds.has('water') && kinds.has('floor')); assert.ok(m.cells.some((c) => c.cx === 4 && c.kind === 'floor'), 'the far bank is seen across the water');
});
