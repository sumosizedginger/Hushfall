// PT-060 (R8 of the Director's Plan): THE MARKSMAN and THE MENDER, the two new archetypes (design/ENEMY_ROSTER.md). Sim only; the rigs, the atlases, the sounds and the hit volumes are held by the shared enumerating tests.
// The Marksman's shot follows you, freezes, then goes down the frozen line: a moving player is not hit, cover stops it. The Mender mends the most hurt creature near it and keeps away from you.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { ENEMIES, DIFFICULTY } from '../src/engine/defs.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const run = (w, n, cmd = () => idle()) => { const ev = []; for (let i = 0; i < n; i++) { step(w, cmd(i)); ev.push(...drainEvents(w)); } return ev; };
/** a hall 60 cells long and 5 wide; the player at cell 3; `kinds` = [[kind, cell x, cell z?]]; `wall` = a column of wall at that cell x */
const hall = (kinds, wall = null) => ({ format: 1, id: 'R8', version: 1, name: 'R8', cellSize: 2, grid: ['#'.repeat(60), ...Array.from({ length: 5 }, (_, z) => '#' + Array.from({ length: 58 }, (_, x) => (wall != null && x + 1 === wall ? '#' : '.')).join('') + '#'), '#'.repeat(60)], doors: [], secrets: [], messages: [],
  entities: [{ type: 'player', at: [3, 3], facing: 'east' }, { type: 'exit', at: [58, 3] }, ...kinds.map(([kind, x, z = 3]) => ({ type: 'enemy', kind, at: [x, z] }))] });
const world = (kinds, wall = null, seed = 1, difficulty = 'normal') => { const w = createWorld(parseMap(hall(kinds, wall)), { seed, difficulty }); w.player.hp = 1000; return w; };
const of = (w, k) => w.enemies.find((e) => e.kind === k);
const wake = (w, e) => { e.state = 'chase'; e.lastX = w.player.x; e.lastZ = w.player.z; };

test('the Marksman: a tell of at least 0.4 s before the shot, a range that is longer than any Bellhand\'s, a standoff, and nothing a stationary target could not dodge (the line freezes before it fires)', () => {
  const M = ENEMIES.marksman, S = M.snipe;
  assert.ok(S.track + S.lock >= 0.4 && S.lock >= 0.3, 'a readable tell and a freeze'); assert.ok(S.max > ENEMIES.bellhand.ranged.maxRange && S.min < S.keep && S.keep < S.max);
  assert.ok(S.width > 0.3 && S.width < 1, 'a line, not a wall'); assert.ok(M.hp < ENEMIES.zealot.hp && M.hush, 'a fragile Songkeeper');
  for (const k of ['hp', 'speed', 'gait', 'radius', 'height', 'sight', 'turnRate']) assert.ok(Number.isFinite(M[k]) && M[k] > 0, k);
});
test('a Marksman shoots a player who stands still: a tell, then a shot that hits for its damage', () => {
  const w = world([['marksman', 25]]), m = of(w, 'marksman'); wake(w, m); const hp0 = w.player.hp;
  const ev = run(w, 60 * 6); const tell = ev.findIndex((e) => e.type === 'snipe_tell'), shot = ev.findIndex((e) => e.type === 'snipe_shot');
  assert.ok(tell >= 0 && shot > tell, 'the tell comes first'); assert.equal(ev[shot].hit, true); assert.equal(hp0 - w.player.hp >= Math.round(ENEMIES.marksman.snipe.damage * DIFFICULTY.normal.enemyDamage) - 1, true, 'it hurt: ' + (hp0 - w.player.hp));
  assert.ok(ev[shot].x1 !== undefined && ev[shot].y0 > 1, 'the event carries the line for the view');
});
test('a player who MOVES after the line freezes is not hit; one who stays is', () => {
  const S = ENEMIES.marksman.snipe, play = (dodge) => {
    const w = world([['marksman', 25]]), m = of(w, 'marksman'); wake(w, m); let shot = null, moved = false;
    for (let i = 0; i < 60 * 6 && !shot; i++) { step(w, idle()); for (const e of drainEvents(w)) if (e.type === 'snipe_shot') shot = e; if (!shot && dodge && !moved && (m.snipeT ?? -1) >= S.track + 0.05) { w.player.z += 2.5; moved = true; } }
    return shot;
  };
  assert.equal(play(false)?.hit, true, 'standing: hit'); assert.equal(play(true)?.hit, false, 'a step sideways once the line is frozen: missed');
});
test('cover stops it: a wall between them and there is no tell; and it backs away from a player who closes in', () => {
  const behind = world([['marksman', 25]], 12), m1 = of(behind, 'marksman'); wake(behind, m1); const ev = run(behind, 60 * 4); assert.equal(ev.filter((e) => e.type === 'snipe_tell').length, 0, 'it cannot see through a wall');
  const w = world([['marksman', 7]]), m = of(w, 'marksman'); wake(w, m); const x0 = m.x; run(w, 60 * 3); assert.ok(m.x > x0 + 1.5, 'too close (8 m, inside its minimum): it opens the range, ' + (m.x - x0).toFixed(1) + ' m');
});
test('PT-064 (the owner: "sniper moves clunky"): it TURNS and runs to open the range, it does not walk backwards facing you; it settles, and a walled-in one stands and shoots instead of rushing you', () => {
  const w = world([['marksman', 7]]), m = of(w, 'marksman'); wake(w, m); let px = m.x, pz = m.z, backward = 0, moving = 0, runTicks = 0;
  for (let i = 0; i < 60 * 4; i++) { run(w, 1); const vx = m.x - px, vz = m.z - pz, sp = Math.hypot(vx, vz) * 60; px = m.x; pz = m.z; if (m.snipeRun) runTicks++; if (sp > 0.3) { moving++; const head = Math.atan2(vx, vz); if (Math.abs(Math.atan2(Math.sin(head - m.yaw), Math.cos(head - m.yaw))) > 2.2) backward++; } }
  assert.ok(runTicks > 30, 'it ran: ' + runTicks); assert.ok(moving > 30 && backward === 0, 'it never moved against its own facing: ' + backward + ' of ' + moving);
  assert.ok(Math.hypot(w.player.x - m.x, w.player.z - m.z) >= ENEMIES.marksman.snipe.min, 'it opened the range to where it can shoot');
  // walled in: a wall right behind it blocks every heading, so it stands its ground and takes a point-blank shot (a tell you can dodge); it does not walk up to you
  const c = world([['marksman', 7]], 8), cm = of(c, 'marksman'); wake(c, cm); const evs = run(c, 60 * 5); const d0 = Math.hypot(c.player.x - cm.x, c.player.z - cm.z);
  assert.ok(evs.some((e) => e.type === 'snipe_tell'), 'it tells even inside its minimum, because it cannot get away'); assert.ok(d0 > 3, 'and it never walked up to melee: ' + d0.toFixed(1) + ' m');
});
test('a world with no Marksman never has the lazy fields', () => { const w = world([['tollbearer', 25], ['bellhand', 30]]); run(w, 60 * 5); for (const e of w.enemies) { assert.equal('snipeT' in e, false); assert.equal('healTarget' in e, false); } });

test('the Mender: a small body, a heal rate that a rivet driver outpaces, a standoff', () => {
  const H = ENEMIES.mender.heal; assert.ok(ENEMIES.mender.height < ENEMIES.sexton.height && ENEMIES.mender.hp < ENEMIES.gaunt.hp, 'a small footprint'); assert.ok(H.rate > 3 && H.rate < 15 && H.keepAway > 6 && H.range >= 6 && H.below > 0.5 && H.below < 1);
});
test('a Mender mends the most hurt creature in range up to whole, and stops; it never starts on one that is nearly whole', () => {
  const w = world([['mender', 40], ['tollbearer', 43], ['gaunt', 44]]), m = of(w, 'mender'), t = of(w, 'tollbearer'), g = of(w, 'gaunt'); for (const e of [m, t, g]) { wake(w, e); e.yaw = 0; } t.stunT = g.stunT = 1e6;          // (the two being mended stand where they are)
  t.hp = 10; g.hp = 20; const ev = run(w, 30); assert.ok(ev.some((e) => e.type === 'mender_start'), 'the tether is made'); assert.ok(t.hp > 10 + 3, 'the most hurt (the Tollbearer, 22% against 83%) is mended first: ' + t.hp);
  run(w, 60 * 8); assert.equal(t.hp, ENEMIES.tollbearer.hp, 'whole'); assert.ok(g.hp > 20, 'then the next one'); const ev2 = run(w, 60 * 4); assert.ok(ev2.some((e) => e.type === 'mender_stop') || m.healTarget == null, 'and the tether lets go');
  const n = world([['mender', 40], ['tollbearer', 43]]), nm = of(n, 'mender'), nt = of(n, 'tollbearer'); wake(n, nm); wake(n, nt); nt.hp = ENEMIES.tollbearer.hp * 0.95; const e3 = run(n, 120); assert.equal(e3.filter((e) => e.type === 'mender_start').length, 0, 'not worth starting on 95%');
});
test('a Mender never mends a node, a boss or another Mender, and a dead creature stays dead', () => {
  const w = world([['mender', 40], ['bellnode', 42], ['cantor', 44], ['mender', 46], ['gaunt', 48]]); for (const e of w.enemies) wake(w, e); const [, node, boss, m2, g] = w.enemies; node.hp = 5; boss.hp = 50; m2.hp = 5; g.hp = 0; g.state = 'dead'; g.dead = 1;
  run(w, 60 * 3); assert.equal(node.hp <= 5 + 1e-9, true); assert.equal(boss.hp <= 50 + 1e-9, true); assert.equal(m2.hp <= 5 + 1e-9, true); assert.equal(g.hp, 0);
});
test('a Mender keeps its distance from the player: inside keepAway it backs off, outside it stands where it is', () => {
  const w = world([['mender', 6]]), m = of(w, 'mender'); wake(w, m); const d0 = Math.hypot(m.x - w.player.x, m.z - w.player.z); run(w, 60 * 3); assert.ok(Math.hypot(m.x - w.player.x, m.z - w.player.z) > d0 + 1.5, 'inside 9 m it backs away');
  const far = world([['mender', 14]]), f = of(far, 'mender'); wake(far, f); const x0 = f.x; run(far, 60 * 2); assert.ok(Math.abs(f.x - x0) < 0.5, 'at 22 m with nothing to mend it stands');
});

test('the view: the Marksman\'s line appears with the tell (thin, then thick when it freezes), is gone after the shot, the shot leaves a streak that fades, and the Mender\'s tether and its glow follow its target (render only, built in node)', async () => {
  const THREE = await import('three'); const { makeCreatureFx } = await import('../src/render/creaturefx.js'), scene = new THREE.Scene(), fx = makeCreatureFx(scene);
  const w = world([['marksman', 25], ['mender', 40], ['tollbearer', 43]]), [m, md, t] = [of(w, 'marksman'), of(w, 'mender'), of(w, 'tollbearer')]; for (const e of [m, md, t]) wake(w, e); t.hp = 10; t.stunT = 1e6; md.x = 80; md.z = 7;
  const S = ENEMIES.marksman.snipe; let seen = { thin: 0, thick: 0 }, shotEv = null, tether = 0;
  for (let i = 0; i < 60 * 6; i++) { step(w, idle()); for (const e of drainEvents(w)) if (e.type === 'snipe_shot') { shotEv = e; fx.shot(e); } fx.update(w, new Map(), i / 60, 1 / 60); if (i === 60) tether = fx.group.children.length; if ((m.snipeT ?? -1) >= 0) { const line = fx.group.children.find((c) => c.material?.opacity > 0.5 && c.scale.y > 5); if (line) (m.snipeT < S.track ? (seen.thin += line.scale.x < 0.04 ? 1 : 0) : (seen.thick += line.scale.x >= 0.04 ? 1 : 0)); } }
  assert.ok(seen.thin > 20 && seen.thick > 10, 'a thin line while it follows, a thick one once frozen: ' + JSON.stringify(seen)); assert.ok(shotEv, 'a shot was fired');
  assert.ok(tether >= 2, 'the tether and its glow of the Mender are drawn while it mends: ' + tether); for (let i = 0; i < 20; i++) fx.update(w, new Map(), 9 + i / 60, 1 / 60); fx.dispose(); assert.equal(scene.children.length, 0, 'disposed');
});
