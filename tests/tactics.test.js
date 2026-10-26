// ENEMY ACTIONS (2026-10-26, src/engine/tactics.js): the fan, the turns and the movement between acts, held on small rooms; how it FEELS is the owner's play, how it changes the maps is verify-map.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, spawnEnemy, hashWorld } from '../src/engine/world.js';
import { ENEMIES } from '../src/engine/defs.js';
import { TACTICS, ordinary, tacticsFrame } from '../src/engine/tactics.js';
import { tellOf } from '../src/render/tells.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });
const N = 22, row = (s) => '#' + s + '#', src = { format: 1, id: 'T1', version: 1, name: 'Tactics', grid: ['#'.repeat(N + 2), ...Array.from({ length: N }, () => row('.'.repeat(N))), '#'.repeat(N + 2)], doors: [], secrets: [], entities: [{ type: 'player', at: [2, 2], facing: 'east' }, { type: 'exit', at: [N - 1, 1] }] };
/** an open room 44 m square, the player in the middle with all the hit points in the world, and creatures `[kind, dx, dz]` around it, awake and seeing it */
function room(list, difficulty = 'normal', seed = 1) {
  const w = createWorld(parseMap(src), { seed, difficulty, carry: { hp: 1e6, armor: 0, ammo: { flare: 8 }, weapons: ['flare'] } }); w.enemies.length = 0;
  Object.assign(w.player, { x: 22, z: 22, yaw: 0, weapon: 'flare', switchT: 0 });
  const es = list.map(([k, dx, dz]) => { const e = spawnEnemy(w, k, 22 + dx, 22 + dz, Math.atan2(-dx, -dz)); e.state = 'chase'; e.lastX = 22; e.lastZ = 22; e.lost = 0; e.hp = 1e6; return e; });
  return { w, es };
}
const bearing = (w, e) => Math.atan2(e.x - w.player.x, e.z - w.player.z);
const run = (w, ticks, each) => { for (let i = 0; i < ticks; i++) { step(w, idle()); const ev = drainEvents(w); each?.(ev, i); } };

test('who takes part: the ordinary roster does; a boss, a node, the folk, the support, snipe and heal kinds and a Range target do not', () => {
  const mk = (kind, extra = {}) => ({ kind, state: 'chase', ...extra });
  for (const k of ['tollbearer', 'gaunt', 'bellhand', 'gill', 'chorister', 'wardengraft', 'bulwark', 'zealot', 'acolyte', 'resonant']) assert.ok(ordinary(mk(k)), k);
  for (const k of ['cantor', 'bellnode', 'vat', 'vaelfolk', 'sexton', 'marksman', 'mender', 'hivecantor', 'rootbell', 'gatewarden']) assert.ok(!ordinary(mk(k)), k);
  assert.ok(!ordinary(mk('tollbearer', { hold: 'turn' })), 'a Range target');
});

test('THE FAN: four Tollbearers coming at the player in single file spread across its front, in the order they stood, and none goes round behind it', () => {
  const { w, es } = room([['tollbearer', 6, 0.3], ['tollbearer', 7.5, -0.2], ['tollbearer', 9, 0.6], ['tollbearer', 9.8, -0.6]]);
  const before = es.map((e) => bearing(w, e)), spread0 = Math.max(...before) - Math.min(...before);
  run(w, 60);
  const slots = [...tacticsFrame(w).slots.values()];
  run(w, 90);
  const after = es.map((e) => bearing(w, e)), mid = Math.atan2(after.reduce((s, a) => s + Math.sin(a), 0), after.reduce((s, a) => s + Math.cos(a), 0)), rel = after.map((a) => Math.atan2(Math.sin(a - mid), Math.cos(a - mid)));
  assert.ok(spread0 < 0.2, 'they started in a line');
  assert.ok(Math.max(...rel) - Math.min(...rel) > 0.5, `they spread: ${(Math.max(...rel) - Math.min(...rel)).toFixed(2)} rad across the front (a slow creature fans loosely in the time it has)`);
  assert.ok(Math.max(...slots) - Math.min(...slots) > 1.2, 'the slots themselves span the front');
  assert.ok(rel.every((r) => Math.abs(r) <= TACTICS.fan.arc + 0.35), 'and none went round behind');
  if (slots.length > 1) { const s = [...slots].sort((a, b) => a - b); for (let i = 1; i < s.length; i++) assert.ok(s[i] - s[i - 1] >= Math.min(TACTICS.fan.gap, (2 * TACTICS.fan.arc) / (slots.length - 1)) - 1e-9, 'slots keep their gap'); }
});

test('THE TURNS: six Bellhands ready at once start at most the difficulty\'s number of shots together, and over ten seconds every one of them fires', () => {
  for (const diff of ['easy', 'normal', 'hard']) {
    const cap = TACTICS.tokens[diff].ranged; assert.ok(cap >= 2 && cap <= 5, diff);
    const ring = Array.from({ length: 6 }, (_, i) => ['bellhand', Math.sin(i - 2.5) * 8, Math.cos(i * 0.3) * 8]);
    const { w, es } = room(ring, diff); for (const e of es) { e.cd = 0; e.yaw = Math.atan2(22 - e.x, 22 - e.z); }
    const fired = new Set(); let most = 0;
    run(w, 600, (ev) => { for (const x of ev) if (x.type === 'enemy_shot' && !x.burst) fired.add(x.id); most = Math.max(most, es.filter((e) => e.attackT >= 0).length); });
    assert.ok(most <= cap, `${diff}: at most ${cap} shooting at once (saw ${most})`);
    assert.equal(fired.size, 6, `${diff}: every Bellhand got its turn (${fired.size} of 6)`);
  }
});

test('BETWEEN ACTS: a Bellhand side-steps after a shot (the same distance, a new place); a Gaunt hops back after its lunge from a player who faces it, and presses one who does not; both leave no fields behind', () => {
  const { w, es: [b] } = room([['bellhand', 0, 8]]); b.cd = 0; b.yaw = Math.PI;
  let shot = -1; run(w, 300, (ev, i) => { if (shot < 0 && ev.some((x) => x.type === 'enemy_shot')) shot = i; });
  assert.ok(shot >= 0, 'it shot');
  let w2, b2; for (let seed = 1; seed < 40; seed++) { ({ w: w2, es: [b2] } = room([['bellhand', 0, 8]], 'normal', seed)); b2.yaw = Math.PI; b2.attackT = ENEMIES.bellhand.attack.duration - 0.01; b2.struck = true; run(w2, 2); if (b2.shufT > 0) break; }          // (it steps after half its shots: find a seed where this one does)
  const p0 = { x: b2.x, z: b2.z }, d0 = Math.hypot(b2.x - 22, b2.z - 22);
  assert.ok(b2.shufT > 0 && (b2.shufDir === 1 || b2.shufDir === -1), 'a side-step begins as the shot ends');
  run(w2, 18); const moved = Math.hypot(b2.x - p0.x, b2.z - p0.z), d1 = Math.hypot(b2.x - 22, b2.z - 22);
  assert.ok(moved > 0.25, `it moved ${moved.toFixed(2)} m`); assert.ok(Math.abs(d1 - d0) < 0.6, 'sideways, not in or out');
  run(w2, 60); assert.equal(b2.shufT, undefined, 'the field is gone when the step is done');
  const { w: w3, es: [g] } = room([['gaunt', 2.2, 0]]); g.yaw = -Math.PI / 2; g.lungeT = ENEMIES.gaunt.lunge.windup + ENEMIES.gaunt.lunge.duration - 0.005; w3.player.yaw = -Math.PI / 2;          // the player faces it (east)
  run(w3, 1); assert.equal(g.backT, ENEMIES.gaunt.lunge.back, 'the hop back begins');
  const { w: w4, es: [g4] } = room([['gaunt', 2.2, 0]]); g4.yaw = -Math.PI / 2; g4.lungeT = ENEMIES.gaunt.lunge.windup + ENEMIES.gaunt.lunge.duration - 0.005; w4.player.yaw = Math.PI / 2;          // the player has its back to it
  run(w4, 1); assert.equal(g4.backT, undefined, 'a player with its back turned is pressed, not given room'); const dA = Math.hypot(g.x - 22, g.z - 22);
  run(w3, 15); assert.ok(Math.hypot(g.x - 22, g.z - 22) > dA + 0.3, 'it backed away'); run(w3, 40); assert.equal(g.backT, undefined);
});

test('SEARCH: a creature that loses the player looks round where it last saw them for TACTICS.search.t seconds, then goes back to sleep', () => {
  const { w, es: [t] } = room([['tollbearer', 0.3, 0.3]]); Object.assign(w.player, { x: 3, z: 3 });                 // the player gone out of its sight (27 m: a Tollbearer sees 22)
  t.lastX = t.x; t.lastZ = t.z; t.lost = 0.1; const y0 = t.yaw; let maxTurn = 0;
  for (let i = 0; i < Math.round((TACTICS.search.t - 0.2) * 60); i++) { step(w, idle()); drainEvents(w); maxTurn = Math.max(maxTurn, Math.abs(t.yaw - y0)); }
  assert.equal(t.state, 'chase', 'still looking'); assert.ok(maxTurn > 0.5, 'it turned its head');
  run(w, 30); assert.equal(t.state, 'idle', 'it gave up'); assert.equal(t.searchT, undefined);
});

test('deterministic and lazy: the same seed gives the same world; the frame is never saved; a world where nothing engaged carries no new field', () => {
  const crowd = [['tollbearer', 6, 1], ['tollbearer', 7, -1], ['gaunt', 8, 2], ['bellhand', -8, 3], ['bellhand', -7, -4], ['gill', 2, 9]];
  const a = room(crowd, 'hard', 7), b = room(crowd, 'hard', 7); run(a.w, 400); run(b.w, 400);
  assert.equal(hashWorld(a.w), hashWorld(b.w));
  assert.ok(!Object.keys(a.w).includes('_tac') && !JSON.stringify(a.w).includes('"_tac"'), 'the frame is not enumerable');
  const c = room([['tollbearer', 15, 15]]); c.es[0].state = 'idle'; c.w.player.x = 3; c.w.player.z = 3; run(c.w, 120);
  for (const f of ['shufT', 'shufDir', 'backT', 'searchT', 'searchYaw']) assert.ok(!(f in c.es[0]), f);
});

test('THE TELL is read from the sim\'s clocks: the share of the windup gone, warm for a blow and cold for a shot', () => {
  const T = ENEMIES.tollbearer, B = ENEMIES.bellhand, G = ENEMIES.gaunt;
  assert.equal(tellOf({ kind: 'tollbearer', state: 'chase', attackT: -1 }), null);
  const t = tellOf({ kind: 'tollbearer', state: 'chase', attackT: T.attack.duration * T.attack.windup / 2 }); assert.ok(Math.abs(t.k - 0.5) < 1e-9 && !t.ranged);
  assert.ok(tellOf({ kind: 'bellhand', state: 'chase', attackT: 0.1 }, 9).ranged, 'a Bellhand at range is about to shoot'); assert.ok(!tellOf({ kind: 'bellhand', state: 'chase', attackT: 0.1 }, 1.5).ranged, 'too close to shoot: a blow');
  assert.equal(tellOf({ kind: 'tollbearer', state: 'chase', attackT: T.attack.duration * T.attack.windup + 0.01 }), null, 'after the blow lands, no tell');
  assert.ok(tellOf({ kind: 'gaunt', state: 'chase', attackT: -1, lungeT: G.lunge.windup / 2 }).k > 0.4, 'the lunge\'s crouch');
  assert.equal(tellOf({ kind: 'tollbearer', state: 'chase', attackT: 0.1, stunT: 0.5 }), null, 'a staggered creature tells nothing');
  void B;
});
