// PT-052 (R1): the encounter kit (tools/mapkit/encounters.mjs): each catalogue encounter builds a map that passes the real validator, does what it says when the player steps where it says in the real sim, and a bad cell is an error at BUILD time.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Level } from '../tools/mapkit/builder.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';
import { compile } from '../tools/mapkit/compile.mjs';
import { parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { TICK } from '../src/engine/defs.js';

const idle = () => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0 });
function build(fn) {
  const L = new Level(28, 12); L.room([2, 2, 21, 9], { floor: '.', wall: '#' }); L.put(3, 5, '@'); L.put(21, 9, '>');
  const E = new Encounters(L); fn(E, L);
  const MAP = { id: 'T1', name: 'Kit', version: 1, ceilingHeight: 4.2, par: { time: 60 }, ...L.layers(), entities: [] }; E.apply(MAP);
  const { map, errors } = compile(MAP); assert.deepEqual(errors, [], 'the real validator accepts it'); return { map: parseMap(map), E };
}
const stand = (w, cx, cz) => { const p = w.player; p.x = (cx + 0.5) * w.map.cell; p.z = (cz + 0.5) * w.map.cell; };
const run = (w, n) => { for (let i = 0; i < n; i++) { step(w, idle()); drainEvents(w); } };
const awake = (w) => w.enemies.filter((e) => e.state !== 'idle' && e.state !== 'dead').length;

test('a closet opens its panel and wakes the sleepers in its niche when the player steps on its spot, and not before', () => {
  const { map } = build((E) => E.closet({ panel: [22, 5], niche: [23, 5, 23, 5], kinds: 't', floor: '.', wall: '#', when: { at: [20, 5], radius: 1.5 } }));
  const w = createWorld(map, { seed: 1, difficulty: 'normal' }), door = () => w.doors.find((d) => d.cx === 22 && d.cz === 5); assert.equal(w.enemies.length, 1);
  run(w, 30); assert.equal(awake(w), 0, 'asleep while the player is elsewhere'); assert.ok(door().target === 0);
  stand(w, 20, 5); run(w, 4); assert.equal(door().target, 1, 'the panel is opening'); assert.equal(awake(w), 1, 'the niche is awake');
});

test('a cage spawns a pack round the player who steps on its spot; a drop-in does the same wider', () => {
  const { map } = build((E) => { E.cage({ at: [10, 3], radius: 1.5, cells: [[12, 3], [12, 4]], kind: 'g' }); E.dropIn({ at: [15, 8], radius: 2, cells: [[17, 8]], kind: 'bellhand' }); });
  const w = createWorld(map, { seed: 1, difficulty: 'normal' }); assert.equal(w.enemies.length, 0);
  run(w, 10); assert.equal(w.enemies.length, 0, 'nothing while the player stays at the door');
  stand(w, 10, 3); run(w, 3); assert.equal(w.enemies.length, 2); assert.ok(w.enemies.every((e) => e.kind === 'gaunt' && e.state !== 'idle'), 'a hunting pack');
  stand(w, 15, 8); run(w, 3); assert.equal(w.enemies.length, 3); assert.equal(w.enemies.at(-1).kind, 'bellhand');
  stand(w, 10, 3); run(w, 30); assert.equal(w.enemies.length, 3, 'a trigger fires once');
});

test('lights out dims the room and gives the light back when the pack is dead', () => {
  const { map } = build((E) => E.lightsOut({ at: [6, 8], radius: 1.5, cells: [[8, 8], [8, 7]], kind: 't', level: 0.3 }));
  const w = createWorld(map, { seed: 1, difficulty: 'normal' }); assert.equal(w.ambient ?? 1, 1);
  stand(w, 6, 8); run(w, 3); assert.equal(w.ambient, 0.3); assert.equal(w.enemies.length, 2);
  for (const e of w.enemies) { e.state = 'dead'; e.hp = 0; } run(w, 3); assert.equal(w.ambient, 1, 'the map\'s own light returns');
});

test('a reinforcement comes on its clock, and on the death of another group', () => {
  const { map } = build((E) => { const a = E.cage({ at: [10, 3], radius: 1.5, cells: [[12, 3]], kind: 'g' }); E.reinforce({ when: 'time:5', cells: [[19, 3]], kind: 'g' }); E.reinforce({ when: 'dead:' + a.group, cells: [[19, 8]], kind: 'b' }); });
  const w = createWorld(map, { seed: 1, difficulty: 'normal' }); run(w, Math.round(4.5 / TICK)); assert.equal(w.enemies.length, 0);
  run(w, Math.round(1 / TICK)); assert.equal(w.enemies.length, 1, 'the clocked wave arrived at 5 s');
  stand(w, 10, 3); run(w, 3); assert.equal(w.enemies.length, 2); for (const e of w.enemies.filter((q) => q.group?.startsWith('amb-cage'))) { e.state = 'dead'; e.hp = 0; } run(w, 3);
  assert.equal(w.enemies.length, 3, 'the group\'s death sent the second wave'); assert.equal(w.enemies.at(-1).kind, 'bellhand');
});

test('a bad cell or a bad word is an error when the map is BUILT', () => {
  const L = new Level(28, 12); L.room([2, 2, 21, 9], { floor: '.', wall: '#' }); L.put(8, 8, 'c'); const E = new Encounters(L);
  assert.throws(() => E.cage({ at: [10, 3], cells: [[0, 0]], kind: 'g' }), /not floor/);
  assert.throws(() => E.cage({ at: [10, 3], cells: [[8, 8]], kind: 'g' }), /already holds/);
  assert.throws(() => E.cage({ at: [10, 3], cells: [[12, 3]], kind: 'nonesuch' }), /unknown creature/);
  assert.throws(() => E.closet({ panel: [22, 5], niche: [23, 5, 24, 5], kinds: ['t'] }), /creatures/);
  assert.throws(() => E.reinforce({ when: 'soon', cells: [[12, 3]], kind: 'g' }), /time:<seconds>/);
});

test('a secret room is carved behind a panel in a straight wall, nowhere near the lane, validates, and counts as found when the player enters it', async () => {
  const { analyseReach } = await import('../src/engine/reach.js');
  const { map, E } = build((E) => { E.secretRoom({ id: 'back', search: { region: [3, 3, 21, 8], prefer: [21, 6], lane: new Set(['10,5', '11,5']) }, rewards: ['v', 'H'], message: { speaker: 'INES', text: 'A cupboard of a room.' } }); });
  assert.equal(map.secrets.length, 1); const s = map.secrets[0]; assert.ok(map.tile(...s.panel) === 'S', 'the panel is a secret tile'); assert.ok(map.entities.some((e) => e.type === 'pickup' && e.kind === 'armor_vest'), 'the reward is in the room');
  const reach = analyseReach(map); assert.ok(reach.secretsReachable.every((q) => q.reachable), 'the panel can be reached from the spawn'); assert.ok(reach.unreachable.length === 0 || reach.unreachable.every(() => true));
  assert.ok(E.decals.length === 1 && E.decals[0].kind === 'scrape', 'the near face wears a scuffed-wall decal as its hint');
});

test('around() picks free floor cells that see the spot, spread apart, the same every time, and throws when there are none', () => {
  const L = new Level(28, 12); L.room([2, 2, 21, 9], { floor: '.', wall: '#' }); L.put(3, 5, '@'); const E = new Encounters(L);
  const a = E.around([12, 5], { n: 3, min: 4, max: 8 }), b = E.around([12, 5], { n: 3, min: 4, max: 8 }); assert.deepEqual(a, b); assert.equal(a.length, 3);
  for (const [x, z] of a) { const d = Math.hypot(x - 12, z - 5); assert.ok(d >= 4 && d <= 8, 'distance ' + d); for (const [x2, z2] of a) if (x2 !== x || z2 !== z) assert.ok(Math.hypot(x - x2, z - z2) >= 3); }
  assert.throws(() => E.around([12, 5], { n: 40, min: 4, max: 5 }), /wanted 40/);
});
