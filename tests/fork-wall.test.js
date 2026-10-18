// PT-048 F1 (the owner, 2026-10-14: "when an enemy hits a wall it should take damage, not slide down it sideways until it hits a corner or another wall"). The tuning-fork's punt carries a creature with tryMove, which SLIDES along a wall;
// the old rule counted a wall only when the creature got under 40% of its step, so an angled punt kept most of its distance and was struck at a corner. The wall is now found by the BLOCKED COMPONENT of the step (GRAV.punt.glance).
// The hall is the arena of weapons-pt22.test.js: the west wall's face is the line x = 2; the incidence angle here is measured from the wall's SURFACE (90 degrees = head-on).
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { ENEMIES, GRAV, PLAYER } from '../src/engine/defs.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });
const Wd = (n) => '#'.repeat(n);
const grid = [Wd(42), ...Array.from({ length: 20 }, () => '#' + '.'.repeat(40) + '#'), Wd(42)];
const WALL_X = 2, HP = 5000, DEG = Math.PI / 180;
function arena(ents) {
  const src = { format: 1, id: 'K1', version: 1, name: 'Arena', range: true, grid, doors: [], secrets: [], entities: [{ type: 'player', at: [1, 1], facing: 'east' }, { type: 'exit', at: [40, 1] }, ...ents] };
  const w = createWorld(parseMap(src), { seed: 1, carry: { hp: 100000, armor: 0, ammo: { flare: 8, round: 180, rocket: 12 }, weapons: ['flare', 'fork'] } });
  Object.assign(w.player, { yaw: Math.PI / 2, pitch: 0, weapon: 'fork', switchT: 0 });
  return w;
}
/** one punt at a creature standing `gap` metres off the west wall, the player `dist` metres behind it along the line of the shove, which meets the wall at `deg` degrees from its surface */
function punt(kind, deg, { gap = 0.5, dist = 5, ticks = 90 } = {}) {
  const th = deg * DEG, r = ENEMIES[kind].radius, ex = WALL_X + r + gap, ez = 22, v = [-Math.sin(th), -Math.cos(th)];
  const w = arena([{ type: 'enemy', kind, at: [3, 5], facing: 'east', hold: 'inert', hp: HP }]), e = w.enemies[0];
  Object.assign(e, { x: ex, z: ez }); e.post = { ...e.post, x: ex, z: ez };
  Object.assign(w.player, { x: ex - v[0] * dist, z: ez - v[1] * dist });
  const p = w.player; p.yaw = Math.atan2(e.x - p.x, e.z - p.z) + Math.PI; p.pitch = Math.atan2(ENEMIES[kind].height * 0.5 - PLAYER.eye, Math.hypot(e.x - p.x, e.z - p.z));
  const log = [], ev = [];
  for (let i = 0; i < ticks; i++) { step(w, idle({ fire: i === 0 })); ev.push(...drainEvents(w)); log.push({ x: e.x, z: e.z, hp: e.hp }); }
  return { w, e, ev, log, r, impacts: ev.filter((x) => x.type === 'shove_impact'), lost: HP - e.hp };
}

test('a creature punted into a wall at 20, 45 and 70 degrees is struck on first contact, stops against it and does not slide on', () => {
  for (const deg of [20, 45, 70]) {
    const { ev, log, r, impacts, w } = punt('tollbearer', deg);
    assert.ok(ev.some((x) => x.type === 'grav_punt' && x.hit), deg + ': the punt carried it');
    assert.equal(impacts.length, 1, deg + ' degrees: struck exactly once (' + impacts.length + ')');
    const i = log.findIndex((l) => l.hp < HP); assert.ok(i >= 0, deg + ': it took damage');
    assert.ok(log[i].x - WALL_X - r <= 0.3, deg + ': it stopped against the wall, gap ' + (log[i].x - WALL_X - r).toFixed(2) + ' m');
    const after = log.slice(i, i + 20); assert.ok(Math.abs(after.at(-1).z - after[0].z) <= 0.1, deg + ': no sliding after the blow (' + Math.abs(after.at(-1).z - after[0].z).toFixed(2) + ' m)');
    assert.equal(w.shoves.length, 0, deg + ': the shove is over');
  }
});
test('the harder it meets the wall the harder it is struck: damage grows with the angle, and a glancing blow is never nothing', () => {
  const lost = [20, 45, 70, 90].map((d) => punt('tollbearer', d).lost);
  assert.ok(lost[0] > 0, 'a 20 degree blow still hurts: ' + lost[0].toFixed(2));
  for (let i = 1; i < lost.length; i++) assert.ok(lost[i] >= lost[i - 1] - 1e-9, 'monotonic: ' + lost.map((x) => x.toFixed(2)).join(' <= '));
  assert.ok(lost[3] >= GRAV.punt.impact * 0.35 && lost[3] <= GRAV.punt.impact, 'a head-on blow is a full blow: ' + lost[3].toFixed(2));
});
test('a straight punt is exactly what it was: the same damage as before the change', () => {
  const GOLDEN = 23.83333333333303, lost = punt('tollbearer', 90).lost;           // measured on the code BEFORE the change (gap 0.5 m, player 5 m behind)
  assert.ok(Math.abs(lost - GOLDEN) < 1e-9, 'head-on loss ' + lost + ' vs ' + GOLDEN);
});
test('a scrape under about 15 degrees slides on and is not struck (the wall only counts when it really stops the creature)', () => {
  const { impacts, log, lost, r } = punt('tollbearer', 10, { gap: 0.15 });
  assert.equal(impacts.length, 0, 'no impact on a 10 degree scrape'); assert.equal(lost, 0);
  assert.ok(Math.abs(log.at(-1).z - 22) > 1, 'it slid along the wall: ' + Math.abs(log.at(-1).z - 22).toFixed(2) + ' m'); assert.ok(log.every((l) => l.x >= WALL_X + r - 1e-6), 'and never entered it');
});
test('an elite takes no wall damage (the existing rule stands), a creature is never carried into a wall at any angle', () => {
  const el = punt('wardengraft', 45, { gap: 0.1 }); assert.equal(el.impacts.length, 0, 'no impact on an elite'); assert.equal(el.lost, 0);
  for (let deg = 5; deg <= 90; deg += 5) { const { log, r } = punt('tollbearer', deg, { ticks: 60 }); assert.ok(log.every((l) => l.x >= WALL_X + r - 1e-6), deg + ': never inside the wall'); }
});
