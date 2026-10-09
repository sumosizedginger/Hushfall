// PT-025: ammunition from the dead (owner: "maybe instead of ground pickups we make it drops from enemies? The gun you're using or the one missing the most ammo is the type?"). src/engine/drops.js, DROPS in defs.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createWorld, step, spawnEnemy, damageEnemy, drainEvents } from '../src/engine/world.js';
import { parseMap } from '../src/engine/mapformat.js';
import { dropType, maybeDrop, trackFired } from '../src/engine/drops.js';
import { findTraps } from '../src/engine/traps.js';
import { loadMapFile, loadRouteFile, runRoute } from '../src/engine/harness.js';
import { AMMO_MAX, DROPS, PICKUPS } from '../src/engine/defs.js';
import { shippedMap, shippedSrc, ROOT } from './helpers.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });
/** the Lamplighter Hill world, every gun of the old five carried, the ammunition set by hand */
function world(ammo, { weapon = 'rivet', fired = {}, scale = null, seed = 1 } = {}) {
  const map = shippedMap('C1E1M05'); if (scale != null) map.drops = { scale };
  const w = createWorld(map, { seed, difficulty: 'normal', carry: { hp: 1e6, armor: 0, ammo: {}, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc'] } });
  w.enemies.length = 0; w.pickups.length = 0; w.player.ammo = { flare: 0, shell: 0, rivet: 0, bolt: 0, cell: 0, ...ammo }; w.player.weapon = weapon;
  w.drops = { rngState: 12345, dry: 0, seen: { ...w.player.ammo }, firedAt: Object.fromEntries(Object.entries(fired).map(([k, s]) => [k, w.tick - s * 60])) };
  return w;
}
const full = { flare: 30, shell: 40, rivet: 200, bolt: 24, cell: 100 };
const kill = (w, kind = 'tollbearer', x = w.player.x + 6, z = w.player.z) => { const e = spawnEnemy(w, kind, x, z); w.player.hp = 1e6; return e; };

test('the type is the emptiest of the guns IN USE: the one in hand and those fired in the last 90 s; the ones not used are ignored however empty they are', () => {
  let w = world({ ...full, rivet: 150, shell: 10, flare: 3 }, { weapon: 'rivet', fired: { shell: 20 } });
  assert.equal(dropType(w), 'shell', 'shells were fired 20 s ago and are at 25%, rivets in hand are at 75%; the flares (10%) were not fired');
  w = world({ ...full, rivet: 30, shell: 10 }, { weapon: 'rivet', fired: { shell: 20 } });
  assert.equal(dropType(w), 'rivet', 'now the gun in hand is the emptier (15% against 25%)');
  w = world({ ...full, rivet: 150, shell: 10 }, { weapon: 'rivet', fired: { shell: 200 } });
  assert.equal(dropType(w), 'rivet', 'shells were fired 200 s ago: no longer in use, however empty');
});

test('with nothing in use (melee, the fork) the emptiest carried gun; a type that is full is not dropped; nothing is dropped when everything is full', () => {
  let w = world({ ...full, rivet: 100, flare: 6 }, { weapon: 'fists' });
  assert.equal(dropType(w), 'flare', 'fists in hand, no gun fired: the emptiest carried');
  w = world({ ...full }, { weapon: 'rivet' }); assert.equal(dropType(w), null, 'all full');
  w = world({ ...full, flare: 29 }, { weapon: 'flare' }); assert.equal(dropType(w), null, 'a gun at 97% is full for this purpose (DROPS.full), and so is everything else');
});

test('a gun counts as fired when its ammunition goes DOWN (no hook in every way a weapon shoots), and a gun not carried is never chosen', () => {
  const w = world({ ...full }, { weapon: 'rivet' }); w.drops.seen = { ...w.player.ammo };
  w.player.ammo.shell -= 3; trackFired(w); assert.equal(w.drops.firedAt.shell, w.tick); assert.equal(w.drops.firedAt.flare, undefined);
  const w2 = world({ flare: 0, shell: 0, rivet: 0, bolt: 0, cell: 0, round: 0, rocket: 0 }, { weapon: 'rivet', fired: { round: 5, rocket: 5 } });
  assert.ok(['flare', 'shell', 'rivet', 'bolt', 'cell'].includes(dropType(w2)), 'rounds and rockets are for guns this player does not carry: never chosen');
});

test('who drops: any creature of a map that says drops; NOT a summoned or a raised one, a node, a range target, or a dead player; and a map without `drops` never', () => {
  const w = world({ ...full, rivet: 10 }, { scale: 4 });
  let n = 0; for (let i = 0; i < 40; i++) if (maybeDrop(w, kill(w))) n++; assert.ok(n >= 5, `${n} drops in 40 kills of a player at 5% rivets`);
  const none = (mut) => { const x = world({ ...full, rivet: 0 }, { scale: 4 }); x.drops.dry = 99; const e = kill(x); mut?.(e, x); return maybeDrop(x, e); };
  assert.ok(none(), 'control: with the pity counter up and the rivets at nothing it drops');
  assert.equal(none((e) => { e.summoned = true; }), null, 'summoned (the Graft-Mother\'s hatchlings, the Cantor\'s Gaunts)');
  assert.equal(none((e) => { e.revived = 1; }), null, 'raised by a Sexton: it dropped when it first died');
  assert.equal(none((e) => { e.hold = 'inert'; }), null, 'a range target');
  assert.equal(none((e, x) => { x.player.hp = 0; }), null, 'a dead player');
  const node = world({ ...full, rivet: 0 }, { scale: 4 }); node.drops.dry = 99; assert.equal(maybeDrop(node, kill(node, 'bellnode')), null, 'a bell node');
  const fixture = createWorld(shippedMap('C1E1M05'), { seed: 1 }); fixture.map.drops = null; fixture.player.ammo.rivet = 0; assert.equal(maybeDrop(fixture, kill(fixture)), null, 'no `drops` in the map');
  assert.equal(fixture.drops, undefined, 'and no state is made');
});

test('a Warden always drops; a run of dry kills guarantees one while the need is high (the pity), and not while the gun is nearly full', () => {
  const w = world({ ...full, rivet: 0 }, { scale: 0.001 });
  assert.ok(maybeDrop(w, kill(w, 'wardengraft')), 'an elite is certain');
  let first = -1; for (let i = 1; i <= 12 && first < 0; i++) if (maybeDrop(w, kill(w))) first = i; assert.ok(first > 0 && first <= DROPS.pity + 1, `the pity: a drop by kill ${first} at a chance of 0.001`);
  const nearly = world({ ...full, rivet: 150 }, { scale: 0.001 }); let any = 0; for (let i = 0; i < 30; i++) if (maybeDrop(nearly, kill(nearly))) any++; assert.equal(any, 0, 'at 75% there is no pity');
});

test('the dice are a stream of their own: a drop leaves the world\'s random state alone, and the same seed drops the same boxes', () => {
  const a = world({ ...full, rivet: 20 }, { scale: 2, seed: 7 }), b = world({ ...full, rivet: 20 }, { scale: 2, seed: 7 }), before = a.rngState;
  const ka = [], kb = []; for (let i = 0; i < 30; i++) { ka.push(!!maybeDrop(a, kill(a))); kb.push(!!maybeDrop(b, kill(b))); }
  assert.deepEqual(ka, kb); assert.equal(a.rngState, before, 'combat\'s random stream untouched'); assert.ok(ka.includes(true) && ka.includes(false));
});

test('a drop is the ordinary box of its type, lands off a hazard, is not an item of the level and is taken like any box (the gains are counted)', () => {
  const w = world({ ...full, rivet: 20 }, { scale: 4 }); w.drops.dry = 99;
  const it = maybeDrop(w, kill(w)); assert.equal(it.kind, 'ammo_rivet'); assert.ok(it.drop && PICKUPS[it.kind].type === 'ammo');
  assert.equal(w.events.at(-1).type, 'drop');
  Object.assign(w.player, { x: it.x, z: it.z }); const items = w.stats.items; step(w, idle());
  assert.equal(w.pickups.length, 0, 'taken'); assert.equal(w.player.ammo.rivet, 60); assert.equal(w.stats.items, items, 'a drop is not an item'); assert.equal(w.stats.gained.rivet, 40);
  // a hazard: the death cell is toxic residue (the Chandlery's pools): the box lies beside it
  const m = shippedMap('C1E1M04'), W = createWorld(m, { seed: 1, carry: { hp: 1e6, armor: 0, ammo: {}, weapons: ['flare', 'rivet'] } }); W.enemies.length = 0; W.pickups.length = 0; W.player.ammo = { flare: 0, rivet: 0, shell: 0 }; W.drops = { rngState: 1, dry: 99, seen: {}, firedAt: {} };
  let cell = null; for (let z = 0; z < m.h && !cell; z++) for (let x = 0; x < m.w && !cell; x++) if (m.fxRows && m.fx(x, z) === 'x' && m.kind(x, z) === 'floor') cell = [x, z];
  assert.ok(cell, 'the Chandlery has toxic residue'); const e = kill(W, 'tollbearer', (cell[0] + 0.5) * m.cell, (cell[1] + 0.5) * m.cell), d = maybeDrop(W, e);
  assert.ok(d, 'dropped'); assert.notEqual(m.fx(Math.floor(d.x / m.cell), Math.floor(d.z / m.cell)), 'x', 'not in the residue');
});

test('the magnet: a drop within 3.2 m with a clear line slides to the player and is taken; one farther off stays put', () => {
  const w = world({ ...full, rivet: 20 }, { scale: 4 }); w.drops.dry = 99;
  const it = maybeDrop(w, kill(w, 'tollbearer', w.player.x + 2.8, w.player.z)); const x0 = it.x;
  for (let i = 0; i < 45; i++) step(w, idle()); assert.equal(w.pickups.length, 0, 'it came to the player and was taken');
  w.drops.dry = 99; const far = maybeDrop(w, kill(w, 'tollbearer', w.player.x + 5, w.player.z)); const fx = far.x; for (let i = 0; i < 30; i++) step(w, idle()); assert.equal(far.x, fx, 'five metres off: it stays'); assert.ok(x0 > w.player.x);
 
});

test('a creature that falls in the middle of a run drops once: raised by a Sexton it does not drop again, and a summoned one never does', () => {
  const w = world({ ...full, rivet: 0 }, { scale: 4 }); w.drops.dry = 99;
  const e = kill(w); assert.ok(damageEnemy(w, e, 1e6) && w.pickups.length === 1, 'the first death drops'); e.revived = 1; e.state = 'idle'; e.hp = 5; w.drops.dry = 99; damageEnemy(w, e, 1e6); assert.equal(w.pickups.length, 1, 'the second does not');
  const g = kill(w); g.summoned = true; w.drops.dry = 99; damageEnemy(w, g, 1e6); assert.equal(w.pickups.length, 1, 'a summoned creature does not');
});

test('every map that says drops has no ammunition box in its PUBLIC part except the ones it keeps; secrets keep theirs; the caches (no enemies) say nothing', () => {
  const dir = path.join(ROOT, 'maps'); let withDrops = 0;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const src = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')), enemies = src.entities.filter((e) => e.type === 'enemy').length;
    if (!src.drops) { assert.equal(enemies, 0, `${f}: a map with enemies and no drops (only the caches have none)`); continue; }
    withDrops++; const pub = findTraps(parseMap(src), { secrets: false }), keep = src.drops.keep ?? [], kept = (e) => keep.some((k) => (k.length === 2 ? e.at[0] === k[0] && e.at[1] === k[1] : e.at[0] >= k[0] && e.at[1] >= k[1] && e.at[0] <= k[2] && e.at[1] <= k[3]));
    for (const e of src.entities.filter((x) => x.type === 'pickup' && /^ammo_/.test(x.kind))) if (pub.reach.has(pub.key(Math.floor(e.at[0]), Math.floor(e.at[1])))) assert.ok(kept(e), `${f}: a ground ammunition box at ${e.at} in the public part`);
  }
  assert.equal(withDrops, 17, 'all seventeen maps with enemies are fed by drops (the sixteen of Episodes 1 and 2 and the Landing Scar)');
});

test('a drop-fed map plays: drops happen, they are taken, the run is the same twice, and the route still completes on every difficulty (Lamplighter Hill)', () => {
  const map = loadMapFile('maps/C1E1M05.json'), route = loadRouteFile('routes/C1E1M05.main.route.json');
  for (const difficulty of ['easy', 'normal', 'hard']) {
    const a = runRoute(map, route, { seed: 2, difficulty }), b = runRoute(map, route, { seed: 2, difficulty });
    assert.equal(a.result, 'complete', difficulty); assert.equal(a.hash, b.hash, 'deterministic'); assert.ok(a.events.filter((e) => e.type === 'drop').length >= 8, 'drops happened'); assert.ok(Object.values(a.world.stats.gained).reduce((x, y) => x + y, 0) > 100, 'and were taken');
  }
});

test('the Locker\'s caps still rule: a drop never takes a gun above its cap, and the shipped caps are untouched', () => {
  assert.equal(AMMO_MAX.rivet, 200); const w = world({ ...full, rivet: 199 }, { scale: 4 }); const it = { id: 99, kind: 'ammo_rivet', x: w.player.x, z: w.player.z, y: w.player.y, drop: true }; w.pickups.push(it); step(w, idle());
  assert.equal(w.player.ammo.rivet, 200, 'capped'); assert.equal(w.stats.gained.rivet, 1, 'and only what fitted is counted as gained');
});
