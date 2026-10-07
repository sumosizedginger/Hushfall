// PT-014 (owner, first play of the melee batch): "All enemy melee hits you even if you are behind or to the side of them." A melee blow, a Gaunt's lunge and a Warden's charge land only on a player in front of the creature
// at the moment they land. The windup is the tell (an enemy does not turn once it has begun), so a player who moves out of the arc in time takes nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, spawnEnemy } from '../src/engine/world.js';
import { ENEMIES, ENEMY_STRIKE } from '../src/engine/defs.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });
const W = (n) => '#'.repeat(n);
const src = { format: 1, id: 'K1', version: 1, name: 'Kit', grid: [W(18), '#' + '.'.repeat(16) + '#', '#' + '.'.repeat(16) + '#', '#' + '.'.repeat(16) + '#', W(18)], doors: [], secrets: [], entities: [{ type: 'player', at: [1, 1], facing: 'east' }, { type: 'exit', at: [16, 1] }] };
/** an enemy at (10, 5) facing EAST (+x, yaw = pi/2) with its blow about to land, and the player at (10 + dx, 5 + dz); returns the damage the player took in the next second */
function blow(kind, dx, dz, setup) {
  const w = createWorld(parseMap(src), { seed: 1, carry: { hp: 1000, armor: 0, ammo: { flare: 8 }, weapons: ['flare'] } }); w.enemies.length = 0;
  Object.assign(w.player, { x: 10 + dx, z: 5 + dz, yaw: 0, weapon: 'flare', switchT: 0 });
  const e = spawnEnemy(w, kind, 10, 5, Math.PI / 2); e.state = 'chase'; e.lastX = w.player.x; e.lastZ = w.player.z; e.hp = 1e6; setup(e, ENEMIES[kind]);
  const hp0 = w.player.hp; for (let i = 0; i < 60; i++) { step(w, idle()); drainEvents(w); } return hp0 - w.player.hp;
}
const windup = (e, d) => { e.attackT = d.attack.duration * d.attack.windup - 0.02; e.struck = false; };
const dash = (e) => { e.lungeT = 0.35; e.lungeHit = false; };

test('a Tollbearer\'s blow lands on a player in front of it, and on nobody beside it or behind it', () => {
  const front = blow('tollbearer', 1.6, 0, windup), diag = blow('tollbearer', 1.1, 1.1, windup), side = blow('tollbearer', 0, 1.6, windup), sideS = blow('tollbearer', 0, -1.6, windup), behind = blow('tollbearer', -1.6, 0, windup), back2 = blow('tollbearer', -1.2, 0.9, windup);
  assert.equal(front, ENEMIES.tollbearer.attack.damage, 'in front: hit'); assert.ok(diag > 0, 'forty-five degrees off: still hit (the swing has width)');
  assert.equal(side, 0, 'beside it (90 degrees): not hit'); assert.equal(sideS, 0, 'beside it on the other side'); assert.equal(behind, 0, 'behind it: not hit'); assert.equal(back2, 0, 'behind and to the side: not hit');
});
test('the same for every creature that swings: a Gaunt, a Warden, a Bellhand caught too close to shoot (a Sexton and the bosses keep away and rarely swing: the same check guards their blow)', () => {
  for (const kind of ['gaunt', 'wardengraft', 'bellhand']) {
    const d = ENEMIES[kind], reach = Math.min(d.attack.reach, d.attack.range) * 0.8;
    assert.ok(blow(kind, reach, 0, windup) > 0, kind + ': in front');
    assert.equal(blow(kind, 0, reach, windup), 0, kind + ': beside'); assert.equal(blow(kind, -reach, 0, windup), 0, kind + ': behind');
  }
});
test('a Gaunt\'s lunge hits what it dashes into and not what it dashes past or away from', () => {
  assert.ok(blow('gaunt', 1.0, 0, dash) > 0, 'ahead: hit'); assert.equal(blow('gaunt', -1.0, 0, dash), 0, 'it leapt away from a player behind it'); assert.equal(blow('gaunt', 0, 1.0, dash), 0, 'a player at its side is not hit');
});
test('a Warden\'s charge hits a player in its path, not one it has passed', () => {
  const charge = (e) => { e.chargeT = 0.9; e.chargeHit = false; };
  assert.ok(blow('wardengraft', 1.4, 0, charge) > 0, 'ahead: hit'); assert.equal(blow('wardengraft', -1.4, 0, charge), 0, 'behind: not hit');
});
test('the arc is written down: about 70 degrees each side for a blow, a narrower one for a dash', () => {
  assert.ok(ENEMY_STRIKE.cos > 0.2 && ENEMY_STRIKE.cos < 0.5, 'a blow: cos ' + ENEMY_STRIKE.cos); assert.ok(ENEMY_STRIKE.dashCos >= ENEMY_STRIKE.cos);
});
test('the windup is the tell: an enemy does not turn once it has begun, so a player who is beside it when the blow comes takes nothing', () => {
  const w = createWorld(parseMap(src), { seed: 1, carry: { hp: 1000, armor: 0, ammo: { flare: 8 }, weapons: ['flare'] } }); w.enemies.length = 0;
  Object.assign(w.player, { x: 10, z: 6.6, yaw: 0, weapon: 'flare', switchT: 0 }); const e = spawnEnemy(w, 'tollbearer', 10, 5, Math.PI / 2); e.state = 'chase'; e.lastX = w.player.x; e.lastZ = w.player.z; e.hp = 1e6; e.attackT = 0; e.struck = false;
  const hp0 = w.player.hp; for (let i = 0; i < 120 && !e.struck; i++) { step(w, idle()); drainEvents(w); }
  assert.ok(e.struck, 'the blow came'); assert.ok(Math.abs(e.yaw - Math.PI / 2) < 1e-9, 'it did not turn to follow the player'); assert.equal(hp0 - w.player.hp, 0, 'and found nobody');
});
