// The Charge-arc lamp (weapon 5): a TAP (the arc fires when the key is released) is the short arc: 12 m, it locks onto the nearest body inside a cone around the view ray and jumps to up to three more bodies. Cell ammunition, quiet, forgiving, weak per hit.
// (HOLDING the key charges it into a forked bolt: tests/identity.test.js.)
// Sim only, on the shipped Evaporation Pans' 45 m lane (what it looks like: tools/dev/shoot-arc.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, drainEvents, spawnEnemy } from '../src/engine/world.js';
import { WEAPONS, WEAPON_ORDER, PICKUPS, AMMO_MAX, NOISE } from '../src/engine/defs.js';
import { ammoCap } from '../src/engine/progress.js';
import { Bot } from '../src/engine/bot.js';
import { InputState } from '../src/engine/input.js';
import { shippedMap } from './helpers.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });
const A = WEAPONS.arc;
/** the west road of the Pans (z = 51, x 24..70 open), the lamp in hand, 60 cells, the player at (24, 51) facing east, level */
function lane(seed = 1, { upgrades, weapons = ['flare', 'arc'] } = {}) {
  const w = createWorld(shippedMap('C1E2M02'), { seed, carry: { hp: 100000, armor: 0, ammo: { flare: 8, cell: 60 }, weapons, upgrades } });
  w.enemies.length = 0; Object.assign(w.player, { x: 24, z: 51, yaw: -Math.PI / 2, pitch: 0, weapon: 'arc', switchT: 0 }); return w;
}
const put = (w, kind, dx, dz = 0, hp = 1000) => { const e = spawnEnemy(w, kind, w.player.x + dx, 51 + dz, Math.PI / 2); e.hp = hp; e.state = 'idle'; return e; };
const fire = (w, o = {}) => { step(w, idle({ ...o, fire: true })); step(w, idle({ ...o, fire: false })); return drainEvents(w); };       // a tap: the lamp fires on RELEASE
const hpLost = (e) => 1000 - e.hp;

test('the lamp is the fifth weapon: a tap, short reach, its own ammunition and pickups', () => {
  assert.equal(WEAPON_ORDER[4], 'arc'); assert.equal(A.kind, 'arc'); assert.equal(A.ammo, 'cell');
  assert.ok(A.range <= 14 && A.cooldown <= 0.2, 'short reach, rapid'); assert.ok(NOISE.arc < NOISE.scattergun, 'and quiet');
  assert.deepEqual([PICKUPS.weapon_arc.weapon, PICKUPS.weapon_arc.ammo, PICKUPS.ammo_cell.ammo], ['arc', 'cell', 'cell']); assert.ok(AMMO_MAX.cell >= 60);
});

test('it picks its own target: a body inside the lock cone is struck, one outside it is not, and the sights narrow the cone', () => {
  const w = lane(), e = put(w, 'tollbearer', 10); fire(w); assert.equal(hpLost(e), A.damage, 'dead ahead');
  const off = (deg, aim) => { const w2 = lane(), t = put(w2, 'tollbearer', 10); w2.player.yaw = -Math.PI / 2 + deg * Math.PI / 180; if (aim) for (let i = 0; i < 20; i++) step(w2, idle({ aim: true })); fire(w2, { aim }); return hpLost(t) > 0; };
  assert.ok(off(6, false), '6 degrees off: locked from the hip'); assert.ok(!off(20, false), '20 degrees off: not locked');
  assert.ok(off(7, false) && !off(7, true), '7 degrees off: locked from the hip, not from the sights (the cone narrows to pick one body out of a crowd)');
});

test('range and walls: nothing past 12 m, nothing behind a wall', () => {
  const w = lane(), near = put(w, 'tollbearer', 11); fire(w); assert.ok(hpLost(near) > 0, 'a body at 11 m is struck');
  const wf = lane(), far = put(wf, 'tollbearer', 14); fire(wf); assert.equal(hpLost(far), 0, 'a body at 14 m is out of reach');
  const w2 = lane(); w2.player.x = 64; const behind = put(w2, 'tollbearer', 10); fire(w2); assert.equal(hpLost(behind), 0, 'the station\'s closed west door is between them');
});

test('the arc JUMPS: three more bodies within 4.5 m of the last, each for 70% of the one before, none twice, none out of reach', () => {
  const w = lane(), [a, b, c, d, e] = [8, 11, 14, 17, 20].map((x) => put(w, 'tollbearer', x)), ev = fire(w);
  const lost = [a, b, c, d, e].map(hpLost), want = [0, 1, 2, 3].map((i) => A.damage * A.chainFalloff ** i);
  want.forEach((v, i) => assert.ok(Math.abs(lost[i] - v) < 1e-6, `body ${i + 1}: ${lost[i]} vs ${v}`)); assert.equal(lost[4], 0, 'the fifth is past the three jumps');
  const arc = ev.find((x) => x.type === 'arc'); assert.equal(arc.pts.length, 4, 'the event carries the four points the arc touched');
  const w2 = lane(), x = put(w2, 'tollbearer', 8), y = put(w2, 'tollbearer', 8 + A.jump + 1.5); fire(w2); assert.ok(hpLost(x) > 0 && hpLost(y) === 0, 'a body beyond the jump distance is not reached');
  const w3 = lane(), p = put(w3, 'tollbearer', 8), q = put(w3, 'gaunt', 8, 2.5); fire(w3); assert.ok(hpLost(p) > 0 && hpLost(q) > 0, 'jumps go sideways too');
});

test('it hits flyers (a Drone-Gill hovering over the lane), a miss still crackles, and every shot costs one cell', () => {
  const w = lane(), g = put(w, 'gill', 9); const before = w.player.ammo.cell; const ev = fire(w); assert.ok(hpLost(g) > 0, 'a hovering Gill is struck'); assert.equal(w.player.ammo.cell, before - 1);
  const w2 = lane(); const ev2 = fire(w2); const arc = ev2.find((x) => x.type === 'arc'); assert.ok(arc && arc.pts.length === 0 && Array.isArray(arc.end), 'a miss emits an arc that ends in the air or on a wall'); assert.equal(w2.player.ammo.cell, 59);
  assert.ok(ev.some((x) => x.type === 'fire' && x.weapon === 'arc'));
});

test('tapping repeats at the cooldown (about six a second), and an empty lamp clicks', () => {
  const w = lane(); let shots = 0; for (let i = 0; i < 60; i++) { step(w, idle({ fire: i % 10 < 5 })); shots = 60 - w.player.ammo.cell; } assert.ok(shots >= 5 && shots <= 7, `about 6 shots a second, got ${shots}`);
  w.player.ammo.cell = 0; drainEvents(w); for (let i = 0; i < 30; i++) step(w, idle({ fire: i % 10 < 5 })); assert.ok(drainEvents(w).some((e) => e.type === 'dry'));
});

test('pickups: the lamp (switches to it, 30 cells), cell boxes, the cap, the Locker satchel; cells without the lamp do not hold off the flare feed', () => {
  const w = lane(1, { weapons: ['flare'] }); w.player.weapon = 'flare'; w.player.ammo.cell = 0; w.pickups.push({ id: 9001, kind: 'weapon_arc', x: w.player.x, z: w.player.z }); step(w, idle());
  assert.deepEqual([w.player.weapon, w.player.weapons.includes('arc'), w.player.ammo.cell], ['arc', true, PICKUPS.weapon_arc.amount]);
  w.player.ammo.cell = AMMO_MAX.cell - 1; w.pickups.push({ id: 9002, kind: 'ammo_cell', x: w.player.x, z: w.player.z }); step(w, idle()); assert.equal(w.player.ammo.cell, AMMO_MAX.cell, 'capped');
  const up = lane(1, { upgrades: { ammo: 2 } }); up.player.ammo.cell = AMMO_MAX.cell; up.pickups.push({ id: 9003, kind: 'ammo_cell', x: up.player.x, z: up.player.z }); step(up, idle()); assert.ok(up.player.ammo.cell > AMMO_MAX.cell && up.player.ammo.cell <= ammoCap('cell', { ammo: 2 }));
  const feedAfter = (weapons) => { const f = lane(1, { weapons }); f.player.weapon = 'flare'; f.player.ammo = { flare: 0, shell: 0, rivet: 0, bolt: 0, cell: 5 }; for (let i = 0; i < 12 * 60; i++) step(f, idle()); return f.player.ammo.flare; };
  assert.ok(feedAfter(['flare']) >= 1 && feedAfter(['flare', 'arc']) === 0);
});

test('the bot reaches for the lamp in a crowd and uses it', () => {
  const w = lane(1, { weapons: ['flare', 'scattergun', 'arc'] }); w.player.weapon = 'flare'; w.player.ammo.shell = 0;
  const es = [8, 10.5, 12].map((x) => { const e = put(w, 'tollbearer', x, 0, 45); e.state = 'chase'; return e; }); const bot = new Bot(w, new InputState(), [], {});
  let usedArc = false; for (let i = 0; i < 400 && es.some((e) => e.state !== 'dead'); i++) { bot.fight({ e: es.find((e) => e.state !== 'dead'), d: Math.hypot(es.find((e) => e.state !== 'dead').x - w.player.x, 0) }); step(w, bot.in.sample()); drainEvents(w); if (w.player.weapon === 'arc') usedArc = true; }
  assert.ok(usedArc && w.player.ammo.cell < 60, 'it switched to the lamp and spent cells');
});

test('deterministic: the same seed and inputs give the same arc', () => {
  const run = () => { const w = lane(5), a = put(w, 'tollbearer', 9), b = put(w, 'tollbearer', 11.5); for (let i = 0; i < 30; i++) step(w, idle({ fire: i % 10 < 5 })); return [a.hp, b.hp, w.player.ammo.cell]; };
  assert.deepEqual(run(), run());
});

test('the lamp waits on the lane in C1E2M06 where the cage stops (PT-025: its cells come from the dead, M06-M08 are drop-fed, the lamp itself gives 30)', async () => {
  const { loadMapFile, loadRouteFile, runRoute } = await import('../src/engine/harness.js');
  const map = loadMapFile('maps/C1E2M06.json'), r = runRoute(map, loadRouteFile('routes/C1E2M06.main.route.json'), { seed: 1, difficulty: 'normal' });
  assert.equal(r.world.pickups.filter((p) => p.kind === 'weapon_arc').length, 0, 'the lamp was on the lane'); assert.ok(r.world.player.weapons.includes('arc'), 'the route finds the lamp'); assert.ok((r.world.stats.gained?.cell ?? 0) >= 20, 'and its cells');
  for (const id of ['C1E2M06', 'C1E2M07', 'C1E2M08']) assert.ok(loadMapFile(`maps/${id}.json`).drops, `${id} is fed by the dead`);
});
