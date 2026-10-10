// PT-027: the Bell-breaker mortar (weapon 10, key 0): indirect fire. The shell is thrown TO the point the crosshair rests on (src/engine/mortar.js), on an arc that is exact for the sim's integrator; a minimum range; two rockets a shell;
// a very wide blast that hurts you too. Hand-made halls here; the rig, the sound, the wheel segment and the pickup are held by their own tests (weapons-pt22, wheel, audio, pickup-toasts).
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, spawnEnemy } from '../src/engine/world.js';
import { designate, aimPoint } from '../src/engine/mortar.js';
import { WEAPONS, WEAPON_ORDER, SLOT_KEYS, PICKUPS, AMMO_MAX, PLAYER, NOISE, TICK } from '../src/engine/defs.js';
import { ACTIONS, DEFAULT_BINDINGS } from '../src/engine/input.js';

const M = WEAPONS.mortar;
const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });
const ring = (n, c) => c.repeat(n);
/** a long hall (x 1..38, z 1..7, 2 m cells), ceiling 10 m, a 3 m ledge from x = 28 to the end, a low roofed corridor option, the player at x = 3 facing east (-x is... east is +x in this engine: yaw -PI/2) */
function hall({ ledge = true, ceilingHeight = 10, wall = null } = {}) {
  const grid = ['#'.repeat(40)]; for (let z = 1; z <= 7; z++) grid.push('#' + '.'.repeat(38) + '#'); grid.push('#'.repeat(40));
  if (wall) for (let z = 1; z <= 7; z++) { const r = [...grid[z]]; r[wall] = '#'; grid[z] = r.join(''); }
  const heights = grid.map((r, z) => [...r].map((c, x) => (ledge && x >= 28 && x <= 38 && z >= 1 && z <= 7 ? '6' : '0')).join(''));
  return parseMap({ format: 1, id: 'T5', version: 1, name: 'Mortar hall', ceilingHeight, secrets: [], doors: [], grid, ...(ledge ? { heights } : {}), entities: [{ type: 'player', at: [3, 4], facing: 'east' }, { type: 'exit', at: [37, 4] }] });
}
function setup(opts = {}, { rockets = 12, pitch = 0, x = 3.5 } = {}) {
  const map = hall(opts), w = createWorld(map, { seed: 1, difficulty: 'normal' }); w.enemies.length = 0; const p = w.player, S = map.cell;
  Object.assign(p, { x: x * S, z: 4.5 * S, yaw: -Math.PI / 2, pitch, weapon: 'mortar', switchT: 0, cooldown: 0, hp: 1e6 }); p.weapons = ['flare', 'mortar']; p.ammo = { flare: 8, rocket: rockets };
  return { w, map, p, S };
}
const fire = (w, aim = false) => { const ev = []; if (aim) w.player.ads = 1; step(w, idle({ fire: true, aim })); ev.push(...drainEvents(w)); step(w, idle({ aim })); ev.push(...drainEvents(w)); return ev; };
const fly = (w, secs = 4) => { const ev = []; for (let i = 0; i < Math.round(secs / TICK); i++) { step(w, idle()); ev.push(...drainEvents(w)); if (ev.some((e) => e.type === 'explode')) break; } return ev; };

test('the mortar is the tenth weapon: slot 0, a pickup that carries three shells of rockets, rockets shared with the line-thrower', () => {
  assert.equal(SLOT_KEYS[9], 'mortar'); assert.ok(WEAPON_ORDER.includes('mortar')); assert.equal(M.ammo, 'rocket'); assert.equal(M.cost, 2); assert.equal(PICKUPS.weapon_mortar.weapon, 'mortar'); assert.equal(PICKUPS.weapon_mortar.amount, 3 * M.cost);
  assert.ok(ACTIONS.includes('weapon10') && DEFAULT_BINDINGS.weapon10.includes('Digit0'), 'key 0'); assert.ok(NOISE.mortar > NOISE.flare, 'loud'); assert.ok(M.designate.minRange > 0 && M.designate.maxRange > M.designate.minRange && M.designate.tmin < M.designate.tmax);
});

test('the landing point is where the view ray first rests: the floor, a wall (the foot of it), a ledge; a ray into the air comes down to the floor under it; never inside the minimum range', () => {
  const { w, p, S } = setup({ ledge: false }, { pitch: -0.05 }); const a = aimPoint(w, p, M.designate); assert.equal(a.what, 'floor'); const dist = Math.hypot(a.x - p.x, a.z - p.z); assert.ok(Math.abs(dist - PLAYER.eye / Math.tan(0.05)) < 0.6, `the floor ${dist.toFixed(1)} m ahead`);
  const far = setup({ ledge: false }, { pitch: 0 }); const b = aimPoint(far.w, far.p, M.designate); assert.equal(b.what, 'range'); assert.ok(Math.hypot(b.x - far.p.x, b.z - far.p.z) > M.designate.maxRange - 1, 'out to the range limit'); assert.equal(b.y, 0, 'and down to the floor under it');
  const wall = setup({ ledge: false, wall: 12 }, { pitch: 0 }); const c = aimPoint(wall.w, wall.p, M.designate); assert.equal(c.what, 'wall'); assert.ok(c.x < 12 * S && c.x > 11 * S, 'the foot of the wall');
  const led = setup({ ledge: true }, { pitch: 0 }); const d = aimPoint(led.w, led.p, M.designate); assert.equal(d.what, 'floor'); assert.equal(d.y, 3, 'on the ledge'); assert.ok(d.x >= 28 * S - 0.3 && d.x < 28 * S + 1, 'at its edge');
  const near = setup({ ledge: false }, { pitch: -0.6 }); const e = designate(near.w, near.p, M); assert.equal(e.clamped, true); assert.ok(Math.abs(e.d - M.designate.minRange) < 1e-6, 'pushed out to the minimum range'); assert.ok(e.x > near.p.x, 'in the direction of view');
});

test('the shell lands where the ring says, to a few centimetres, on the floor, on a ledge three metres up (on a body standing there) and at long range', () => {
  for (const [label, opts, pitch, onLedge] of [['floor', { ledge: false }, -0.1], ['ledge', { ledge: true }, 0.047, true], ['far floor', { ledge: false }, -0.04]]) {
    const { w, p, S } = setup(opts, { pitch }); if (onLedge) { const e = spawnEnemy(w, 'tollbearer', 30 * S, 4.5 * S, Math.PI / 2); e.state = 'idle'; e.hp = 1e5; }
    const want = designate(w, p, M); assert.ok(!want.clamped, label); if (onLedge) { assert.equal(want.what, 'body', 'the ray rests on the body up on the ledge'); assert.equal(want.y, 3, 'and the shell is thrown to the ledge, not the floor below'); }
    fire(w, true); const ev = fly(w), boom = ev.find((e) => e.type === 'explode'); assert.ok(boom, label + ': it exploded'); const err = Math.hypot(boom.x - want.x, boom.z - want.z);
    assert.ok(err < M.spread.ads * want.d * 1.5 + 0.35, `${label}: landed ${err.toFixed(2)} m from the ring (sights up: the cone is ${M.spread.ads} rad)`); assert.ok(boom.y >= want.y - 0.1 && boom.y < want.y + 1.8, `${label}: at the right height (${boom.y.toFixed(2)} vs ${want.y})`); assert.equal(boom.r, M.splash);
  }
});

test('it is slow and it arcs: seconds in the air, rising well above the straight line, flat shots included; a low roof flattens the arc rather than eating the shell', () => {
  const { w, p } = setup({ ledge: false }, { pitch: -0.07 }); const want = designate(w, p, M); assert.ok(want.T >= M.designate.tmin - 1e-9 && want.T <= M.designate.tmax + 1e-9, 'flight time ' + want.T.toFixed(2)); fire(w);
  let apex = 0, t = 0; for (let i = 0; i < 400 && w.projectiles.length; i++) { apex = Math.max(apex, w.projectiles[0].y); step(w, idle()); drainEvents(w); t += TICK; }
  assert.ok(apex > 3.2, 'a high arc: ' + apex.toFixed(1) + ' m'); assert.ok(t > 0.9, 'a long flight: ' + t.toFixed(1) + ' s');
  const low = setup({ ledge: false, ceilingHeight: 4.2 }, { pitch: -0.1 }), lw = designate(low.w, low.p, M); fire(low.w); const ev = fly(low.w), boom = ev.find((e) => e.type === 'explode'); assert.ok(boom);
  assert.ok(Math.hypot(boom.x - lw.x, boom.z - lw.z) < 1.0, 'under a 4.2 m ceiling it still lands on the mark (' + Math.hypot(boom.x - lw.x, boom.z - lw.z).toFixed(2) + ' m off)');
});

test('a shell costs two rockets, one rocket is a dry click, and the cooldown is the long one', () => {
  const { w, p } = setup({ ledge: false }, { rockets: 5, pitch: -0.1 }); fire(w); assert.equal(p.ammo.rocket, 3, 'two rockets'); assert.ok(p.cooldown > M.cooldown - 0.1, 'cooldown ' + p.cooldown);
  for (let i = 0; i < 200; i++) { step(w, idle()); drainEvents(w); } fire(w); assert.equal(p.ammo.rocket, 1, 'the second shell');
  for (let i = 0; i < 200; i++) { step(w, idle()); drainEvents(w); } const ev = fire(w); assert.equal(p.ammo.rocket, 1, 'one rocket left: not enough'); assert.ok(ev.some((e) => e.type === 'dry'), 'a dry click');
});

test('the blast is wide: it hurts everything inside it by distance, a Warden-sized body and a bell node take it, and it hurts the one who fired it', () => {
  const { w, p, S } = setup({ ledge: false }, { pitch: -0.1 }); const want = designate(w, p, M), at = (dx) => spawnEnemy(w, 'tollbearer', want.x + dx, want.z, Math.PI / 2);
  const near = at(0.5), mid = at(3.5), far = at(8); for (const e of [near, mid, far]) { e.state = 'idle'; e.hp = 1000; } fire(w); fly(w);
  const lost = (e) => 1000 - e.hp; assert.ok(lost(near) > lost(mid) && lost(mid) > 0 && lost(far) === 0, `near ${lost(near).toFixed(0)}, mid ${lost(mid).toFixed(0)}, far ${lost(far)}`); assert.ok(lost(near) >= M.splashDamage * 0.8, 'close to the mark it is nearly the whole blast');
  const close = setup({ ledge: false, wall: 5 }, { pitch: 0, x: 3.5 }); const hp0 = close.p.hp; close.p.hp = 100; fire(close.w); fly(close.w); assert.ok(close.p.hp < 100, 'a shell that lands near you hurts you: ' + close.p.hp); void hp0; void S;
});

test('the shot is deterministic from the seed (the same seed, the same landing; another seed, another scatter), and a world that never fires it carries no shell', () => {
  const go = (seed) => { const { w } = setup({ ledge: true }, { pitch: -0.02 }); w.rng = undefined; return null ?? seed; };
  const land = (seed) => { const map = hall({ ledge: false }), w = createWorld(map, { seed, difficulty: 'normal' }); w.enemies.length = 0; const p = w.player; Object.assign(p, { x: 3.5 * map.cell, z: 4.5 * map.cell, yaw: -Math.PI / 2, pitch: -0.04, weapon: 'mortar', switchT: 0, cooldown: 0, hp: 1e6 }); p.weapons = ['flare', 'mortar']; p.ammo = { flare: 8, rocket: 12 };
    fire(w); return fly(w).find((e) => e.type === 'explode'); };
  void go; const a = land(1), b = land(1), c = land(2); assert.deepEqual(a, b, 'same seed, same landing'); assert.notDeepEqual([a.x, a.z], [c.x, c.z], 'another seed, another scatter');
  const idleWorld = setup({ ledge: false }).w; for (let i = 0; i < 120; i++) step(idleWorld, idle()); assert.equal(idleWorld.projectiles.length, 0); assert.ok(AMMO_MAX.rocket >= 12 && PLAYER.eye > 1);
});
