// PT-037 (Campaign 2 Act A, E1): THE QUIET FOLK. A peaceful creature (the Vael civilian): calm, never an attacker, afraid of noise and blows, shootable but never picked by anything automatic, and a dead one is an INNOCENT, not a kill.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './helpers.js';
import { parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, noise, damageEnemy } from '../src/engine/world.js';
import { ENEMIES, FOLK, TICK } from '../src/engine/defs.js';
import { rankFor } from '../src/engine/progress.js';
import { levelFacts, threatCount } from '../src/engine/viability.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const run = (w, n, cmd = () => idle()) => { const ev = []; for (let i = 0; i < n; i++) { step(w, cmd(i)); ev.push(...drainEvents(w)); } return ev; };
/** a hall 30 cells long and 5 wide, the player at cell 3, a civilian at cell 12 */
const hall = (extra = []) => ({ format: 1, id: 'F1', version: 1, name: 'Folk', cellSize: 2, grid: ['#'.repeat(30), ...Array.from({ length: 5 }, () => '#' + '.'.repeat(28) + '#'), '#'.repeat(30)], doors: [], secrets: [],
  entities: [{ type: 'player', at: [3, 3], facing: 'east' }, { type: 'exit', at: [28, 3] }, { type: 'enemy', kind: 'vaelfolk', at: [12, 3] }, ...extra] });
const world = (extra, seed = 1) => createWorld(parseMap(hall(extra)), { seed, difficulty: 'normal' });
const folk = (w) => w.enemies.find((e) => e.kind === 'vaelfolk');
const D = (w, e, x, z) => Math.hypot(e.x - x, e.z - z);

test('a civilian is calm, is not counted as an enemy, and the quality gates and the bot do not see it as a threat', () => {
  const w = world(), e = folk(w);
  assert.equal(e.state, 'calm'); assert.equal(ENEMIES.vaelfolk.peaceful, true);
  assert.equal(w.stats.total.enemies, 0, 'not an enemy to be killed for the rank');
  const m = parseMap(hall()), f = levelFacts(m); assert.equal(f.enemies, 0); assert.deepEqual(f.enemyKinds, {}); assert.equal(threatCount(m), 0);
  const bot = fs.readFileSync(path.join(ROOT, 'src/engine/bot.js'), 'utf8'); assert.equal((bot.match(/peaceful/g) ?? []).length, 3, 'the route bot passes over a peaceful creature in its three target searches');
});

test('it never attacks: ten seconds with the player at its elbow and nothing happens to them', () => {
  const w = world(); Object.assign(w.player, { x: folk(w).x - 1, z: folk(w).z }); const hp = w.player.hp;
  const ev = run(w, 600);
  assert.equal(w.player.hp, hp); assert.equal(folk(w).state, 'calm'); assert.ok(!ev.some((x) => x.type === 'enemy_strike' || x.type === 'enemy_windup' || x.type === 'enemy_shot' || x.type === 'enemy_alert'));
});

test('it wanders a few metres round its post and no further, and it looks at the player', () => {
  const w = world(), e = folk(w), hx = e.x, hz = e.z; let far = 0; Object.assign(w.player, { x: hx - 5, z: hz });
  for (let i = 0; i < 1800; i++) { step(w, idle()); far = Math.max(far, D(w, e, hx, hz)); }
  assert.ok(far > 0.5, `it did move (${far.toFixed(2)} m)`); assert.ok(far <= FOLK.wanderR + 0.6, `and stayed near its post (${far.toFixed(2)} m)`);
  e.goX = undefined; e.wanderB = Math.floor((w.time + e.id * 0.37) / FOLK.wanderEvery); run(w, 150);          // standing still (no new errand this bucket): it watches
  const want = Math.atan2(w.player.x - e.x, w.player.z - e.z); assert.ok(Math.abs(Math.atan2(Math.sin(e.yaw - want), Math.cos(e.yaw - want))) < 0.5, 'facing the player');
});

test('a shot it can hear sends it running from the shot; a shot out of earshot does not; it settles when the fear is spent', () => {
  const w = world(), e = folk(w), sx = e.x - 10, sz = e.z; Object.assign(w.player, { x: sx, z: sz });
  noise(w, sx, sz, 8); assert.equal(e.state, 'calm', 'out of a small noise\'s earshot');
  const d0 = D(w, e, sx, sz); noise(w, sx, sz, 22); assert.equal(e.state, 'flee');
  assert.equal(drainEvents(w).filter((x) => x.type === 'folk_fear').length, 1, 'the fear is announced once, when it starts');
  run(w, 60); const d1 = D(w, e, sx, sz); assert.ok(d1 - d0 > ENEMIES.vaelfolk.speed * 0.6, `ran ${(d1 - d0).toFixed(2)} m in a second`);
  noise(w, sx, sz, 22); assert.equal(drainEvents(w).filter((x) => x.type === 'folk_fear').length, 0, 'a second shot while it runs renews the fear without announcing it again');
  let n = 0; while (e.state === 'flee' && n++ < 60 * 20) run(w, 1);
  assert.equal(e.state, 'calm', 'settled'); assert.ok(n > FOLK.fearT * 60 - 5 && n < FOLK.fearT * 60 + 5, `after about ${FOLK.fearT} s of fear (${n} ticks)`); assert.ok(Math.hypot(e.homeX - e.x, e.homeZ - e.z) < 0.01, 'its post is where it stopped');
});

test('gunfire keeps it running: every new shot renews the fear', () => {
  const w = world(), e = folk(w); Object.assign(w.player, { x: e.x - 8, z: e.z }); noise(w, w.player.x, w.player.z, 22);
  for (let i = 0; i < 6; i++) { run(w, 180); w.player.x = e.x - 8; noise(w, w.player.x, w.player.z, 22); }          // the shooter keeps up
  assert.equal(e.state, 'flee'); assert.ok(e.x > 12.5 * 2 + 10 && e.x < 29 * 2, `it ran east and stopped at the wall (${e.x.toFixed(1)})`);
});

test('a blow makes it run (from the player), and it is cornered against the wall rather than through it', () => {
  const w = world(), e = folk(w); Object.assign(w.player, { x: e.x - 2, z: e.z });
  assert.equal(damageEnemy(w, e, 5), false); assert.equal(e.state, 'flee'); assert.ok(e.hp > 0 && e.hp < ENEMIES.vaelfolk.hp);
  run(w, 60 * 12); assert.ok(e.x < 29 * 2 - 0.3 && e.x > 2, 'inside the hall'); assert.ok(e.x > w.player.x, 'it ran away from the one who hit it');
});

test('a dead civilian is an INNOCENT: no kill, no drop, an event for it, a cost to the rank and a line in the end stats', () => {
  const w = world(), e = folk(w); Object.assign(w.player, { x: e.x - 3, z: e.z });
  assert.equal(damageEnemy(w, e, 999), true); const ev = drainEvents(w);
  assert.equal(e.state, 'dead'); assert.equal(w.stats.kills, 0); assert.equal(w.stats.innocents, 1);
  assert.ok(ev.some((x) => x.type === 'enemy_died' && x.folk === true)); assert.ok(ev.some((x) => x.type === 'innocent')); assert.equal(w.pickups.length, 0);
  const clean = { time: 100, kills: 10, secrets: 1, total: { enemies: 10, secrets: 1 } }, par = 400;
  const a = rankFor(clean, par), b = rankFor({ ...clean, innocents: 1 }, par), c = rankFor({ ...clean, innocents: 9 }, par);
  assert.equal(a.rank, 'S'); assert.ok(b.score < a.score && Math.abs(a.score - b.score - FOLK.innocentCost) < 1e-9, 'one innocent costs the set amount'); assert.ok(a.score - c.score <= FOLK.innocentMax + 1e-9, 'and the cost is capped');
  assert.deepEqual(rankFor({ time: 100, kills: 10, secrets: 1, total: { enemies: 10, secrets: 1 }, innocents: 0 }, par), a, 'a map with no innocents is scored exactly as before');
});

test('the arc lamp never locks onto a peaceful creature, and neither does its chain', () => {
  const w = world(); const e = folk(w); Object.assign(w.player, { x: e.x - 5, z: e.z, yaw: -Math.PI / 2, pitch: 0, weapon: 'arc', switchT: 0 }); w.player.weapons.push('arc'); w.player.ammo.cell = 40;
  const hp = e.hp; run(w, 3, () => idle({ fire: true })); run(w, 30);
  assert.equal(e.hp, hp); assert.equal(w.stats.innocents ?? 0, 0);
});

test('a world with a civilian reads no random number it did not have before, and replays exactly', () => {
  const a = world(), b = world(), plain = createWorld(parseMap({ ...hall(), entities: hall().entities.filter((x) => x.kind !== 'vaelfolk') }), { seed: 1, difficulty: 'normal' });
  run(a, 900); run(b, 900); run(plain, 900);
  assert.equal(a.rngState, plain.rngState, 'no random stream is consumed by a peaceful creature');
  assert.equal(JSON.stringify(folk(a)), JSON.stringify(folk(b)), 'two runs of the same world place it identically');
});

test('it is a creature the sim can save and the shell can read: a hit volume and the Range/rig tests have what they need', () => {
  const d = ENEMIES.vaelfolk; for (const k of ['hp', 'speed', 'gait', 'radius', 'height', 'sight', 'turnRate']) assert.ok(Number.isFinite(d[k]) && d[k] > 0, k);
  assert.equal(TICK, 1 / 60);
});
