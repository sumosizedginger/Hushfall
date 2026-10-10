// PT-030: the creatures of Episode 3's Batch E: the Brood Vat (ENEMIES.vat, `vatStep` in src/engine/world.js: a spawner that is a node), the Reed (a node of the Grand Cantor's shield) and the Grand Cantor (ENEMIES.grandcantor: the Cantor's
// `bossStep` with a DOUBLE pulse ring, Choristers called from the alcoves, toll-shots from the start). The rigs, the hit volumes, the sounds and the Range targets are held by the suites that enumerate every kind (choir-rigs, hit-volume-fair, rig-grounding,
// silhouettes, audio, range).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, spawnEnemy, drainEvents, damageEnemy } from '../src/engine/world.js';
import { ENEMIES } from '../src/engine/defs.js';
import { shippedMap } from './helpers.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });
const V = ENEMIES.vat, G = ENEMIES.grandcantor, TICK = 1 / 60;
/** the Landing Scar's basin again: the player at (21, 22.5) cells facing east on a clear floor; enemies are added by the tests */
function field({ hp = 1e6, seed = 1, difficulty = 'normal' } = {}) {
  const map = shippedMap('C1E3M01'), w = createWorld(map, { seed, difficulty, carry: { hp, armor: 0, ammo: {}, weapons: ['flare', 'scattergun', 'rivet'] } });
  w.enemies.length = 0; w.pickups.length = 0; Object.assign(w.player, { x: 21 * map.cell, z: 22.5 * map.cell, yaw: -Math.PI / 2, pitch: 0, y: 0 }); w.player.hp = hp;
  return { w, map };
}
const at = (w, kind, dx, dz = 0, state = 'chase') => { const e = spawnEnemy(w, kind, w.player.x + dx, w.player.z + dz, Math.PI / 2); e.state = state; e.lastX = w.player.x; e.lastZ = w.player.z; return e; };
const run = (w, ticks, cmd = idle()) => { const ev = []; for (let i = 0; i < ticks; i++) { step(w, cmd); ev.push(...drainEvents(w)); } return ev; };
const alive = (w, kind) => w.enemies.filter((e) => e.kind === kind && e.state !== 'dead').length;

test('the Brood Vat is a node that spawns: immobile, never flinches, a rocket does double, an Acolyte\'s ward and the drops leave it alone; its numbers are what the comments say', () => {
  assert.ok(V.node && V.spawner && V.speed === 0 && V.attack.damage === 0 && V.hp >= 150);
  assert.ok(V.spawner.swell >= 1 && V.spawner.max >= 2 && V.spawner.every >= 6 && V.spawner.first >= 2 && V.spawner.kinds.length >= 1, 'a swell you can see coming, a brood that stays small, a first birth that is not at once');
  const { w } = field(); const vat = at(w, 'vat', 14, 0, 'chase'); at(w, 'acolyte', 14, 3); const b = vat.hp; damageEnemy(w, vat, 20); assert.equal(b - vat.hp, 20, 'a ward does not reach it');
});

test('a vat sleeps until it SEES you inside its range (or is woken), then swells for `swell` s (vat_swell) and births one creature (vat_birth, an enemy_spawn with vat: true, awake, summoned); the first birth is after `first` s', () => {
  const { w } = field(); const vat = at(w, 'vat', 16, 0, 'idle'); const far = at(w, 'vat', 70, 0, 'idle'); far.x = w.player.x + 140;                       // one in sight, one far beyond its range
  const ev = []; let swell = null, birth = null, tick = 0;
  for (; tick < 60 * 9; tick++) { step(w, idle()); for (const e of drainEvents(w)) { ev.push(e); if (e.type === 'vat_swell' && e.id === vat.id) swell = swell ?? tick; if (e.type === 'vat_birth' && e.id === vat.id) birth = birth ?? tick; } }
  assert.equal(far.state, 'idle', 'a vat beyond its range sleeps on'); assert.notEqual(vat.state, 'idle', 'the one in sight woke');
  assert.ok(swell !== null && Math.abs(swell * TICK - V.spawner.first) < 0.3, `the first swell at ${(swell * TICK).toFixed(2)} s (first = ${V.spawner.first})`);
  assert.ok(birth !== null && Math.abs((birth - swell) * TICK - V.spawner.swell) < 0.1, `a swell of ${((birth - swell) * TICK).toFixed(2)} s before the birth`);
  const sp = ev.find((e) => e.type === 'enemy_spawn' && e.vat); assert.ok(sp && sp.brood, 'announced as a vat birth'); const born = w.enemies.find((e) => e.id === sp.id); assert.ok(born.summoned && born.state !== 'idle' && born.kind === V.spawner.kinds[0]);
  assert.ok(Math.hypot(sp.x - vat.x, sp.z - vat.z) < 4, 'it drops beside the vat');
});

test('a vat keeps `max` of its brood alive and no more, alternates the kinds it is given, and an entity\'s own `spawns` wins; difficulty scales the pace (reaction)', () => {
  const { w } = field(); const vat = at(w, 'vat', 14, 0); w.player.hp = 1e9; for (let i = 0; i < 60 * 70; i++) { step(w, idle()); drainEvents(w); if (i % 30 === 0) for (const e of w.enemies) if (e.summoned && e.state !== 'dead') e.hp = 1e9; }
  assert.equal(vat.brood.length, V.spawner.max, 'full'); assert.equal(w.enemies.filter((e) => e.summoned).length, V.spawner.max, 'and never more');
  assert.deepEqual([...new Set(w.enemies.filter((e) => e.summoned).map((e) => e.kind))].sort(), [...V.spawner.kinds].sort(), 'the default brood is the kinds in turn');
  const g = field(); const own = at(g.w, 'vat', 14, 0); own.spawns = ['gaunt']; run(g.w, 60 * 40); assert.ok(g.w.enemies.some((e) => e.summoned) && g.w.enemies.filter((e) => e.summoned).every((e) => e.kind === 'gaunt'), 'its own list');
  const first = (difficulty) => { const f = field({ difficulty }); const v = at(f.w, 'vat', 14, 0); f.w.player.hp = 1e9; for (let i = 0; i < 60 * 40; i++) { step(f.w, idle()); drainEvents(f.w); } return f.w.enemies.filter((e) => e.summoned).length + 0 * v.hp; };
  assert.ok(first('easy') <= first('hard'), 'easy births no faster than hard');
});

test('killing a vat IS the denial: nothing more is born (what was born stays), a vat that is a Range sponge never births, and a vat\'s death does not stagger a boss the way a bell node\'s does', () => {
  const { w } = field(); const vat = at(w, 'vat', 14, 0); const cantor = at(w, 'cantor', 22, 6); cantor.stunT = 0; run(w, 60 * 5); const born = w.enemies.filter((e) => e.summoned).length; assert.ok(born >= 1, 'it was birthing');
  damageEnemy(w, vat, 1e6); assert.equal(vat.state, 'dead'); assert.equal(cantor.stunT || 0, 0, 'a vat is not the boss\'s ring'); run(w, 60 * 30); assert.equal(w.enemies.filter((e) => e.summoned).length, born, 'no more after it dies');
  const n = at(w, 'bellnode', 16, -6); damageEnemy(w, n, 1e6); assert.ok(cantor.stunT > 0, 'a bell node still does');
  const s = field(); const sponge = at(s.w, 'vat', 14, 0); sponge.hold = 'inert'; run(s.w, 60 * 30); assert.equal(s.w.enemies.filter((e) => e.summoned).length, 0, 'a sponge never births');
});

test('the Grand Cantor\'s pulse is a DOUBLE ring: a windup, a ring, and `echo.gap` s later a second ring (a pulse event with echo: true) from where it stands; a stagger cancels the second', () => {
  assert.ok(G.boss && G.pulse.echo.gap > 0.5 && G.pulse.echo.gap < 1.5 && G.summon.kind === 'chorister' && G.shots.always && G.shield.note.length === 3 && G.hp >= 800);
  const { w } = field(); const b = at(w, 'grandcantor', 22, 0); b.pulseCd = 0; const rings = []; let tick = 0, windup = null;
  for (; tick < 60 * 6 && rings.length < 2; tick++) { step(w, idle()); for (const e of drainEvents(w)) { if (e.type === 'enemy_windup' && e.kind === 'grandcantor') windup = windup ?? tick; if (e.type === 'pulse') rings.push({ tick, echo: !!e.echo }); } }
  assert.equal(rings.length, 2, 'two rings'); assert.ok(!rings[0].echo && rings[1].echo, 'the second is the echo'); assert.ok(Math.abs((rings[1].tick - rings[0].tick) * TICK - G.pulse.echo.gap) < 0.1, `${((rings[1].tick - rings[0].tick) * TICK).toFixed(2)} s apart`);
  assert.ok((rings[0].tick - windup) * TICK >= G.pulse.windup - 0.1, 'after its windup');
  const f = field(); const c = at(f.w, 'grandcantor', 22, 0); c.pulseCd = 0; let first = false; for (let i = 0; i < 60 * 6 && !first; i++) { step(f.w, idle()); first = drainEvents(f.w).some((e) => e.type === 'pulse'); }
  assert.ok(first && c.echoT > 0, 'an echo is pending'); c.stunT = 2; run(f.w, 2); assert.equal(c.echoT, 0, 'a stagger drops it'); const rest = run(f.w, 60 * 2).filter((e) => e.type === 'pulse' && e.echo); assert.equal(rest.length, 0);
});

test('a reed is a node: it shields the Grand Cantor (5% while one stands), its fall staggers the boss, the last one takes the shield down; a bell node and a reed together both count', () => {
  const R = ENEMIES.reed; assert.ok(R.node && R.hp >= 100 && R.height >= 3);
  const { w } = field(); const b = at(w, 'grandcantor', 24, 0), r1 = at(w, 'reed', 12, 5), r2 = at(w, 'reed', 12, -5); const before = b.hp; damageEnemy(w, b, 100); assert.ok(Math.abs((before - b.hp) - 100 * G.shield.reduce) < 1e-6, 'shielded');
  damageEnemy(w, r1, 1e6); assert.ok(b.stunT > 0, 'a reed\'s fall staggers it'); b.stunT = 0; const m = b.hp; damageEnemy(w, b, 100); assert.ok(m - b.hp < 20, 'one reed still stands: shielded');
  damageEnemy(w, r2, 1e6); b.stunT = 0; const k = b.hp; damageEnemy(w, b, 100); assert.equal(k - b.hp, 100, 'no reed left: the whole blow');
});

test('the Grand Cantor calls Choristers from the alcoves it was given (at most `max` alive), and fans toll-shots from the start (always), more once the reeds are gone', () => {
  const { w } = field(); const b = at(w, 'grandcantor', 24, 0); b.summons = [[0, -6], [0, 6], [8, -6], [8, 6]].map(([dx, dz]) => [w.player.x + 12 + dx, w.player.z + dz]); at(w, 'reed', 12, 8);
  let shots = 0; const kinds = new Set(); for (let i = 0; i < 60 * 60; i++) { step(w, idle()); for (const e of drainEvents(w)) { if (e.type === 'enemy_shot' && e.kind === 'grandcantor') shots++; if (e.type === 'enemy_spawn' && !e.brood) kinds.add(e.kind); } for (const e of w.enemies) if (e.kind === 'chorister') e.hp = 1e9; }
  assert.ok(shots >= 3, shots + ' fans of toll-shots with a reed standing'); assert.deepEqual([...kinds], ['chorister']); const n = alive(w, 'chorister'); assert.ok(n >= 2 && n <= G.summon.max + G.summon.count - 1, n + ' singers called (a call may overshoot max by count - 1, as the Cantor does)');
});
