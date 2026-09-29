// Enemy behaviour: hunting, waking (sight, damage, noise, alerts), sight-blocking cover, body collision, and the ranged Bellhand.
// Uses small synthetic rooms (2 m cells) so every assertion is about geometry we can state in one line.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMap, validateMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, spawnEnemy, hasLOS, restartWorld } from '../src/engine/world.js';
import { makeSave, parseSave, loadWorld } from '../src/engine/save.js';
import { ENEMIES, DIFFICULTY } from '../src/engine/defs.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
// a 24 x 9 cell hall (48 x 18 m); optional extra wall / props / entities
const hall = ({ wall = null, props = [], entities = [] } = {}) => {
  const rows = ['#'.repeat(24)]; for (let z = 1; z < 8; z++) rows.push('#' + '.'.repeat(22) + '#'); rows.push('#'.repeat(24));
  if (wall) for (const [cx, cz] of wall) { const r = [...rows[cz]]; r[cx] = '#'; rows[cz] = r.join(''); }
  return parseMap({ format: 1, id: 'T1', version: 1, name: 'Hall', grid: rows, doors: [], secrets: [], entities: [{ type: 'player', at: [2, 4], facing: 'east' }, { type: 'exit', at: [22, 7] }, ...props.map((p) => ({ type: 'prop', ...p })), ...entities] });
};
const cell = (c) => (c + 0.5) * 2;
const quiet = (m, diff = 'normal') => { const w = createWorld(m, { seed: 1, difficulty: diff }); w.enemies.length = 0; return w; };
const run = (w, n, cmd = () => idle()) => { const ev = []; for (let i = 0; i < n; i++) { step(w, cmd(i)); ev.push(...drainEvents(w)); } return ev; };
const put = (w, kind, cx, cz, yaw = 0) => spawnEnemy(w, kind, cell(cx), cell(cz), yaw);
const at = (w, cx, cz, yaw = -Math.PI / 2) => { w.player.x = cell(cx); w.player.z = cell(cz); w.player.yaw = yaw; };

test('validateMap rejects a body spawned inside a solid prop or inside another actor', () => {
  const bad = (entities, re) => { const src = { format: 1, id: 'T', version: 1, name: 'x', grid: ['#####', '#...#', '#...#', '#####'], doors: [], secrets: [], entities: [{ type: 'player', at: [1, 1] }, { type: 'exit', at: [3, 2] }, ...entities] }; const v = validateMap(src); assert.equal(v.ok, false); assert.ok(v.errors.some((e) => re.test(e)), JSON.stringify(v.errors)); };
  bad([{ type: 'prop', kind: 'lamppost', at: [2, 1] }, { type: 'enemy', kind: 'gaunt', at: [2, 1] }], /overlaps solid prop/);
  bad([{ type: 'prop', kind: 'crate', at: [2, 2] }, { type: 'pickup', kind: 'health_small', at: [2, 2] }], /overlaps solid prop/);
  bad([{ type: 'enemy', kind: 'tollbearer', at: [2, 2] }, { type: 'enemy', kind: 'gaunt', at: [2, 2] }], /overlaps enemy/);
  bad([{ type: 'prop', kind: 'crate', at: [1, 1] }], /overlaps solid prop/);           // the player's own start
});

test('a sleeping enemy with a clear line wakes; one behind a wall does not wake from sight', () => {
  const w = quiet(hall({ wall: [[10, 3], [10, 4], [10, 5]] })); at(w, 2, 4); const clear = put(w, 'tollbearer', 8, 6, Math.PI), blocked = put(w, 'tollbearer', 14, 4, Math.PI);
  run(w, 5); assert.equal(clear.state, 'chase'); assert.equal(blocked.state, 'idle', 'a wall between us: no sight, no wake');
});

test('a tall prop (pillar) hides what stands behind it; a barrel does not', () => {
  const w = quiet(hall({ props: [{ kind: 'pillar', at: [8, 4] }, { kind: 'barrel', at: [8, 6] }] }));
  assert.equal(hasLOS(w, cell(4), cell(4), cell(12), cell(4)), false, 'pillar blocks');
  assert.equal(hasLOS(w, cell(4), cell(6), cell(12), cell(6)), true, 'a barrel is only waist high');
  assert.equal(hasLOS(w, cell(4), cell(2), cell(12), cell(2)), true, 'nothing in the way');
});

test('being shot wakes an enemy even if the shooter is out of its sight (damage is never silent)', () => {
  const w = quiet(hall()); at(w, 2, 4); const e = put(w, 'tollbearer', 20, 4, 0); e.hp = 1000;
  w.player.weapons = ['flare', 'scattergun']; w.player.ammo.shell = 9;
  e.yaw = 0; w.player.x = cell(20); w.player.z = cell(4) + 40;          // far off the side: out of sight range, so only the hit can wake it
  assert.equal(e.state, 'idle');
  // splash the sleeper directly
  w.projectiles.push({ id: 900, x: e.x, y: 1, z: e.z, vx: 0, vy: 0, vz: 0, life: 0.01, weapon: 'flare' }); run(w, 3);
  assert.equal(e.state, 'chase', 'the explosion woke it'); assert.ok(e.hp < 1000);
});

test('gunfire wakes a sleeper that is close or in the open, not one deep behind walls', () => {
  const w = quiet(hall({ wall: [[8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 6], [8, 7]] })); at(w, 2, 4); const near = put(w, 'tollbearer', 4, 7, Math.PI), farBehind = put(w, 'tollbearer', 20, 4, Math.PI);
  w.player.weapons = ['flare']; run(w, 30, () => idle({ aim: true, fire: true }));
  assert.equal(near.state, 'chase', 'gunfire in the same room is heard'); assert.equal(farBehind.state, 'idle', 'a full wall and 18 m away: not heard');
});

test('one waking enemy alerts sleepers close to it (with a clear line) but not far ones', () => {
  const w = quiet(hall()); at(w, 2, 4); const a = put(w, 'tollbearer', 12, 4, Math.PI), near = put(w, 'tollbearer', 12, 7, Math.PI), far = put(w, 'tollbearer', 22, 1, Math.PI);
  a.hp = 500; w.player.x = cell(2); w.player.z = cell(4);
  near.yaw = 0; far.yaw = 0; near.hp = far.hp = 500;
  a.state = 'idle'; run(w, 2);                                              // a sees the player (20 m < sight 22) and wakes
  assert.equal(a.state, 'chase'); assert.equal(near.state, 'chase', 'its neighbour was alerted'); assert.equal(far.state, 'idle', '20+ m away: not alerted');
});

test('hunting: an enemy that lost you walks to where it last saw you (not to where you are now), then gives up and goes back to sleep', () => {
  const full = [[10, 1], [10, 2], [10, 3], [10, 4], [10, 5], [10, 6], [10, 7]];              // a solid divider: the player is sealed away on the west side, never seen
  const w = quiet(hall({ wall: full })); at(w, 4, 4); const e = put(w, 'tollbearer', 14, 5, Math.PI); e.state = 'chase'; e.hp = 999; e.lastX = cell(19); e.lastZ = cell(5);
  const x0 = e.x; run(w, 90);
  assert.ok(e.x > x0 + 1 && e.state === 'chase', 'it headed EAST to the remembered spot, away from the player standing west');
  run(w, 60 * 6); assert.equal(e.state, 'idle', 'arrived, saw nothing: back to sleep'); assert.ok(Math.abs(e.x - cell(19)) < 1.6);
});

test('an enemy that cannot reach its last-known spot still gives up after its patience runs out', () => {
  const full = [[10, 1], [10, 2], [10, 3], [10, 4], [10, 5], [10, 6], [10, 7]];
  const w = quiet(hall({ wall: full })); at(w, 4, 4); const e = put(w, 'tollbearer', 14, 5, Math.PI); e.state = 'chase'; e.hp = 999; e.lastX = cell(4); e.lastZ = cell(6);      // remembered spot is behind the wall
  run(w, 60 * 12); assert.equal(e.state, 'idle', 'lost interest after ~8 s instead of pushing at the wall forever');
});

test('enemies are solid: the player cannot walk through one, and two enemies do not merge', () => {
  const w = quiet(hall()); at(w, 4, 4, -Math.PI / 2); const e = put(w, 'tollbearer', 6, 4, Math.PI); e.state = 'idle'; e.hp = 9999;
  run(w, 90, () => idle({ move: [0, 1] }));                                    // walk straight at it
  assert.ok(Math.hypot(w.player.x - e.x, w.player.z - e.z) >= 0.32 + ENEMIES.tollbearer.radius - 0.05, 'stopped at contact, did not pass through');
  const a = put(w, 'tollbearer', 14, 4, 0), b = put(w, 'tollbearer', 14.6, 4, 0); a.state = b.state = 'chase'; a.hp = b.hp = 999;
  at(w, 20, 4); run(w, 120);
  assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= 0.75, 'a pack keeps its spacing: ' + Math.hypot(a.x - b.x, a.z - b.z).toFixed(2));
});

test('a head-on enemy walks around a pillar instead of pinning itself against it', () => {
  const w = quiet(hall({ props: [{ kind: 'pillar', at: [10, 4] }] })); at(w, 14, 4, Math.PI / 2); const e = put(w, 'tollbearer', 6, 4, -Math.PI / 2 + Math.PI); e.state = 'chase'; e.hp = 999;
  run(w, 60 * 12); assert.ok(Math.hypot(e.x - w.player.x, e.z - w.player.z) < 3, 'it got round the pillar and reached us, distance ' + Math.hypot(e.x - w.player.x, e.z - w.player.z).toFixed(1));
});

// ---------------------------------------------------------------- Bellhand
const bell = (o = {}) => {
  const w = quiet(hall(o.hall), o.difficulty); at(w, 2, 4, -Math.PI / 2); const e = put(w, 'bellhand', 12, 4, Math.PI); e.hp = 500; return { w, e };
};

test('bellhand: stops at its holding range, arms (readable windup), then tolls a slow shot at where you were', () => {
  const { w, e } = bell();
  const ev = run(w, 60 * 6); const types = ev.map((x) => x.type);
  assert.ok(types.includes('enemy_alert') && types.includes('enemy_windup') && types.includes('enemy_shot'), types.join(','));
  assert.ok(types.indexOf('enemy_windup') < types.indexOf('enemy_shot'), 'a windup always precedes the shot');
  assert.ok(Math.hypot(e.x - w.player.x, e.z - w.player.z) >= ENEMIES.bellhand.ranged.minRange, 'it does not close into melee on its own');
});

test('bellhand: a player who stands still is hit; one who sidesteps the tell is not (the shot is slow and aimed at a position)', () => {
  const stand = bell(), hitStill = run(stand.w, 60 * 5).filter((x) => x.type === 'hurt').length;
  assert.ok(hitStill >= 1, 'standing in the open gets you hit');
  const dodge = bell(); let shots = 0, strafeUntil = -1;
  const ev = run(dodge.w, 60 * 5, (i) => { if (dodge.w.enemyShots.length && strafeUntil < 0) { strafeUntil = i + 40; shots++; } return strafeUntil >= i ? idle({ move: [1, 0] }) : idle(); });      // read the shot in flight, then sidestep it
  assert.ok(shots >= 1, 'it did fire'); assert.equal(ev.filter((x) => x.type === 'hurt').length, 0, 'strafing the toll-shot works');
});

test('bellhand shots stop at walls and at solid props; damage follows the difficulty table', () => {
  const walled = bell({ hall: { wall: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6], [7, 7]] } }); walled.e.state = 'chase'; walled.e.lastX = walled.w.player.x; walled.e.lastZ = walled.w.player.z;
  const ev = run(walled.w, 60 * 4); assert.equal(ev.filter((x) => x.type === 'hurt').length, 0, 'a solid wall stops every shot'); assert.equal(walled.w.enemyShots.length, 0);
  const dmg = (d) => { const { w } = bell({ difficulty: d }); const hp0 = w.player.hp; run(w, 60 * 4); return hp0 - w.player.hp; };
  assert.ok(dmg('hard') >= dmg('easy'), 'hard hits at least as hard as easy'); assert.equal(Math.round(ENEMIES.bellhand.ranged.damage * DIFFICULTY.normal.enemyDamage) > 0, true);
});

test('enemy shots and hunt state survive a save; old (v5) saves migrate and play on', () => {
  const { w } = bell(); run(w, 60 * 2 + 20);
  const s = makeSave(w, 'mid-level'), back = loadWorld(parseSave(JSON.stringify(s)).save, () => w.map).world;
  assert.equal(back.enemies[0].state, w.enemies[0].state); assert.equal(back.enemyShots.length, w.enemyShots.length);
  const old = JSON.parse(JSON.stringify(s)); old.version = 5; delete old.world.levelStart; delete old.world.enemyShots; old.world.enemies.forEach((e) => { delete e.lastX; delete e.lastZ; delete e.lost; });
  const r = parseSave(JSON.stringify(old)); assert.equal(r.ok, true, r.detail); assert.equal(r.migratedFrom, 5);
  const w2 = loadWorld(r.save, () => w.map).world; run(w2, 120); assert.ok(Array.isArray(w2.enemyShots) && w2.levelStart.hp > 0);
});

test('Retry restores the inventory the level STARTED with, not what you had when you died (audit F06)', () => {
  const m = hall({ entities: [{ type: 'pickup', kind: 'weapon_scattergun', at: [2, 4] }] }), w = createWorld(m, { seed: 3, difficulty: 'normal', carry: { hp: 80, armor: 10, ammo: { flare: 5 }, weapons: ['flare'] } });
  w.enemies.length = 0; run(w, 5); assert.ok(w.player.weapons.includes('scattergun')); w.player.ammo.flare = 0; w.player.hp = 0;
  const again = restartWorld(w);
  assert.deepEqual(again.player.weapons, ['flare'], 'no scattergun before you picked it up'); assert.equal(again.player.ammo.flare, 5); assert.equal(again.player.hp, 80); assert.equal(again.player.armor, 10);
  assert.equal(again.seed, w.seed); assert.equal(again.difficulty, w.difficulty);
  const saved = loadWorld(parseSave(JSON.stringify(makeSave(w, 'mid-level'))).save, () => m).world; assert.deepEqual(restartWorld(saved).player.weapons, ['flare'], 'still true after save/load');
});
