// PT-013: every weapon has its own answer. Flare = AREA (burning ground), scattergun = CLOSE (staggers, breaks windups), rivets = SUPPRESS (slow, break a lunge), harpoon = ONE HEAVY SHOT (pins against a wall),
// lamp = tap for the short arc, HOLD to charge a forked bolt that conducts through water and stuns the Vael. Sim only, on small synthetic halls (2 m cells). Every number tested is a first guess in defs.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, spawnEnemy } from '../src/engine/world.js';
import { WEAPONS, ENEMIES } from '../src/engine/defs.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });
const W = (n) => '#'.repeat(n);
const hall = (n = 18) => [W(n), '#' + '.'.repeat(n - 2) + '#', '#' + '.'.repeat(n - 2) + '#', '#' + '.'.repeat(n - 2) + '#', W(n)];
const src = (grid, extra = {}) => ({ format: 1, id: 'K1', version: 1, name: 'Kit', grid, doors: [], secrets: [], entities: [{ type: 'player', at: [1, 1], facing: 'east' }, { type: 'exit', at: [grid[0].length - 2, 1] }], ...extra });
const cell = (c) => (c + 0.5) * 2;
/** a hall 18 cells long, the player at (px, z=5) facing east with the chosen weapon up and everything topped up */
function room({ weapon = 'flare', px = 2, fx = null, seed = 1, n = 18 } = {}) {
  const w = createWorld(parseMap(src(hall(n), fx ? { fx } : {})), { seed, carry: { hp: 100000, armor: 0, ammo: { flare: 30, shell: 40, rivet: 200, bolt: 24, cell: 100 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc'] } });
  w.enemies.length = 0; Object.assign(w.player, { x: cell(px), z: cell(1) + 0, yaw: -Math.PI / 2, pitch: 0, weapon, switchT: 0 }); w.player.z = 5; return w;
}
const put = (w, kind, x, z = 5, hp = 1000) => { const e = spawnEnemy(w, kind, x, z, -Math.PI / 2); e.hp = hp;       // (yaw -pi/2 = facing west, at the player)
  e.state = 'chase'; e.lastX = w.player.x; e.lastZ = w.player.z; return e; };
const still = (e) => { e.stunT = 1e9; return e; };                                        // held in place: only what the weapon does to it moves it
const run = (w, n, f = () => idle()) => { const ev = []; for (let i = 0; i < n; i++) { step(w, f(i)); ev.push(...drainEvents(w)); } return ev; };
const hold = (w, seconds, o = {}) => run(w, Math.round(seconds * 60), () => idle({ ...o, fire: true }));
const release = (w, o = {}) => run(w, 1, () => idle({ ...o, fire: false }));

// ------------------------------------------------------------------------------------------------------------------------------ flare: AREA
test('flare: the burst leaves burning ground that burns enemies standing in it for four seconds, then goes out', () => {
  const w = room(); const e = still(put(w, 'tollbearer', 17)); const ev = run(w, 1, () => idle({ fire: true }));
  assert.ok(ev.some((x) => x.type === 'fire')); let burn = null; for (let i = 0; i < 150 && !w.burns.length; i++) { const e2 = run(w, 1); burn = burn || e2.find((x) => x.type === 'burn'); }
  assert.equal(w.burns.length, 1, 'one patch of fire'); assert.equal(w.burns[0].r, WEAPONS.flare.burn.r); assert.ok(burn && burn.t === WEAPONS.flare.burn.t, 'and the view is told');
  const hp0 = e.hp; run(w, 120); assert.ok(hp0 - e.hp >= 15 && hp0 - e.hp <= 21, `about 9 a second for two seconds, lost ${(hp0 - e.hp).toFixed(1)}`);
  run(w, 60 * 3); assert.equal(w.burns.length, 0, 'it burns out'); const hp1 = e.hp; run(w, 60); assert.equal(e.hp, hp1, 'and stops hurting');
});
test('flare: the patch hurts only what stands in it, never a flyer above it, and never the player who made it', () => {
  const w = room(); const near = still(put(w, 'tollbearer', 17)), far = still(put(w, 'tollbearer', 21)), fly = still(put(w, 'gill', 16.5, 6)); const hpP = w.player.hp;
  run(w, 1, () => idle({ fire: true })); for (let i = 0; i < 150 && !w.burns.length; i++) run(w, 1);
  const snap = [near, far, fly].map((e) => e.hp); run(w, 150); const lost = [near, far, fly].map((e, i) => snap[i] - e.hp);
  assert.ok(lost[0] > 15, `inside the patch: ${lost[0].toFixed(1)}`); assert.equal(lost[1], 0, 'outside it: nothing'); assert.equal(lost[2], 0, 'a hovering Gill is not in the fire'); assert.equal(w.player.hp, hpP, 'the player is not burned by their own fire');
});
test('flare: a burst high on a wall leaves no fire; the oldest patches go first past the cap', () => {
  const w = room(); w.player.pitch = 0.9; run(w, 1, () => idle({ fire: true })); run(w, 150); assert.equal(w.burns.length, 0, 'a flare bursting on the ceiling leaves nothing on the floor');
  const v = room(); for (let i = 0; i < 20; i++) v.burns.push({ id: i, x: 10, z: 5, y: 0, r: 2, t: 4, max: 4, dps: 1 });
  v.player.x = 20; v.player.pitch = 0; run(v, 1, () => idle({ fire: true })); run(v, 200); assert.ok(v.burns.length <= WEAPONS.flare.burn.max, 'capped at ' + WEAPONS.flare.burn.max);
});

// ------------------------------------------------------------------------------------------------------------------------------ scattergun: CLOSE
test('scattergun: a hit inside three metres breaks the windup of the blow it lands on; further out it only staggers', () => {
  const closeHit = (dist, kind = 'tollbearer') => { const w = room({ weapon: 'scattergun' }); w.player.ads = 1; const e = put(w, kind, w.player.x + dist); e.attackT = 0.2; e.struck = false; run(w, 1, () => idle({ fire: true, aim: true })); return e; };
  const near = closeHit(2.5); assert.equal(near.attackT, -1, 'the windup is broken'); assert.ok(near.cd > 0.45, 'and it must start over');
  const far = closeHit(6); assert.ok(far.attackT >= 0, 'at 6 m the windup carries on'); assert.ok(far.slowT > 0.2 && far.slowK >= 0.5, 'but it staggers');
  const warden = closeHit(2.5, 'wardengraft'); assert.ok(warden.attackT >= 0, 'an elite is not interrupted');
  const w = room({ weapon: 'scattergun' }); w.player.ads = 1; const e = put(w, 'tollbearer', w.player.x + 2.5); e.attackT = 0.2; e.struck = false; run(w, 1, () => idle({ fire: true, aim: true })); assert.equal(e.attackT, -1);
  e.attackT = 0.2; e.struck = false; w.player.cooldown = 0; run(w, 1, () => idle({ fire: true, aim: true })); assert.ok(e.attackT >= 0, 'a second hit straight after does not break it again: close range is strong, not a lock'); assert.ok(e.intCd > 1.5);
});
test('scattergun: the flinch is shorter for the heavy, and the bosses barely notice', () => {
  const flinch = (kind) => { const w = room({ weapon: 'scattergun' }); w.player.ads = 1; const e = put(w, kind, w.player.x + 3); run(w, 1, () => idle({ fire: true, aim: true })); return e.slowT; };
  assert.ok(flinch('tollbearer') > flinch('wardengraft') * 2.5 && flinch('wardengraft') > flinch('cantor'), `${flinch('tollbearer')} > ${flinch('wardengraft')} > ${flinch('cantor')}`);
});

// ------------------------------------------------------------------------------------------------------------------------------ rivets: SUPPRESS
test('rivets: a hit slows the target (10% for most of a second, and a held trigger cannot keep it going for more than a second) and a slowed enemy covers less ground', () => {
  const w = room({ weapon: 'rivet' }); w.player.ads = 1; const e = put(w, 'tollbearer', w.player.x + 12); run(w, 1, () => idle({ fire: true, aim: true }));
  assert.ok(Math.abs(e.slowK - WEAPONS.rivet.hit.slow) < 1e-9 && e.slowT > WEAPONS.rivet.hit.slowT - 0.1, `slow ${e.slowK} for ${e.slowT}`);
  const walk = (slow) => { const v = room(); const q = put(v, 'tollbearer', 25); if (slow) { q.slowT = 5; q.slowK = WEAPONS.rivet.hit.slow; } const x0 = q.x; run(v, 60); return x0 - q.x; };
  assert.ok(walk(true) < walk(false) * 0.97 && walk(true) > 0.6 * walk(false), `slowed ${walk(true).toFixed(2)} vs free ${walk(false).toFixed(2)}`);
});
test("rivets: a hit breaks a Gaunt's lunge WINDUP, but not the dash itself", () => {
  const g = (lungeT) => { const w = room({ weapon: 'rivet' }); w.player.ads = 1; w.player.pitch = -0.15; const e = put(w, 'gaunt', w.player.x + 5); e.lungeT = lungeT; e.lungeHit = false; run(w, 1, () => idle({ fire: true, aim: true })); return e; };
  const crouch = g(0.1); assert.equal(crouch.lungeT, -1, 'the crouch is broken'); assert.ok(crouch.lungeCd > 0, 'and the lunge needs time before it comes again');
  const dash = g(0.35); assert.ok(dash.lungeT >= 0.3, 'a Gaunt already in the air keeps going');
});

// ------------------------------------------------------------------------------------------------------------------------------ harpoon: ONE HEAVY SHOT
test('harpoon: a bolt that leaves a body with a wall close behind it pins it for two seconds; in the open it does not; the elites and bosses cannot be pinned', () => {
  const shot = (kind, x) => { const w = room({ weapon: 'harpoon' }); w.player.ads = 1; const e = put(w, kind, x); const ev = run(w, 1, () => idle({ fire: true, aim: true })); return { e, ev }; };
  const pinned = shot('tollbearer', 32.5); assert.ok(pinned.e.stunT >= 1.9 && pinned.e.stunT < 1e8, 'pinned for 2 s'); assert.ok(pinned.ev.some((x) => x.type === 'pin')); assert.ok(1000 - pinned.e.hp >= 79, 'and still hit for the full 80');
  assert.equal(shot('tollbearer', 20).e.stunT || 0, 0, 'open floor: nothing to pin it to');
  assert.equal(shot('wardengraft', 32.5).e.stunT || 0, 0, 'the Warden is plated and heavy: not pinned'); assert.equal(shot('cantor', 32.5).e.stunT || 0, 0, 'nor a boss');
  const w = room({ weapon: 'harpoon' }); w.player.ads = 1; const e = put(w, 'tollbearer', 32.5); run(w, 1, () => idle({ fire: true, aim: true })); const x = e.x; run(w, 60); assert.equal(e.x, x, 'a pinned enemy does not move');
});

// ------------------------------------------------------------------------------------------------------------------------------ the lamp: tap, hold, water, Vael
const A = WEAPONS.arc;
const lamp = (o = {}) => room({ weapon: 'arc', px: 2, ...o });
test('lamp: a tap is the short arc and fires when the key is RELEASED; holding fires nothing until you let go', () => {
  const w = lamp(); const e = still(put(w, 'tollbearer', 12)); const cells = w.player.ammo.cell;
  const ev = hold(w, 0.2); assert.ok(!ev.some((x) => x.type === 'fire') && w.player.ammo.cell === cells, 'nothing yet');
  const r = release(w); assert.ok(r.some((x) => x.type === 'fire' && x.charge === 0), 'the tap arc'); assert.equal(w.player.ammo.cell, cells - 1); assert.equal(1000 - e.hp, A.damage);
  const far = still(put(w, 'tollbearer', 25)); run(w, 20); hold(w, 0.2); release(w); assert.equal(far.hp, 1000, 'a tap does not reach 23 m');
});
test('lamp: holding past 0.35 s charges; the charge is announced, grows with time, and a full charge is a forked bolt reaching far past the tap', () => {
  const w = lamp(); const ev = hold(w, 1.4); assert.ok(ev.some((x) => x.type === 'charge_start') && ev.some((x) => x.type === 'charge_full'), 'a hum starts and a chime says "full"');
  assert.equal(w.player.charge, A.charge.max, 'it holds at full');
  const dmg = (secs) => { const v = lamp(); const e = still(put(v, 'tollbearer', 10)); hold(v, secs); release(v); return { dmg: 1000 - e.hp, cells: 100 - v.player.ammo.cell }; };
  const d0 = dmg(0.1), d1 = dmg(0.75), d2 = dmg(1.3);
  assert.deepEqual([d0.dmg, d0.cells], [A.damage, 1]); assert.ok(d1.dmg > d0.dmg * 2 && d1.dmg < d2.dmg, `half charge ${d1.dmg.toFixed(1)}`); assert.ok(Math.abs(d2.dmg - A.charge.damage) < 1e-6 && d2.cells === A.charge.cells, `full: ${d2.dmg} for ${d2.cells} cells`); assert.ok(d1.cells > 1 && d1.cells < d2.cells);
  const f = lamp(); const t = still(put(f, 'tollbearer', 22)); hold(f, 1.3); const r = release(f); assert.equal(1000 - t.hp, A.charge.damage, 'a full charge reaches 22 m'); assert.ok(r.find((x) => x.type === 'fire').charge > 0.99);
});
test('lamp: a charged bolt FORKS to two bodies and chains further than the tap', () => {
  const w = lamp(); const a = still(put(w, 'tollbearer', 14, 4.2)), b = still(put(w, 'tollbearer', 14, 5.8)); w.player.ads = 0; hold(w, 1.3); const ev = release(w).find((x) => x.type === 'arc');
  assert.ok(a.hp < 1000 && b.hp < 1000, 'both branches struck'); assert.equal(ev.paths.length, 2, 'the event carries both branches');
  const c = lamp(); const line = [12, 15.5, 19, 22.5, 26, 29.5, 33].map((x) => still(put(c, 'tollbearer', x))); hold(c, 1.3); release(c);
  assert.equal(line.filter((e) => e.hp < 1000).length, 1 + A.charge.chain, `1 + ${A.charge.chain} jumps`);
});
test('lamp: a body standing in wading water conducts to every body in the same water within 8 m, ignoring the chain; dry floor does not', () => {
  const fx = ['..................', '..................', '..................', '..................', '..................'].map((r, z) => (z === 0 || z === 4 ? r : r.slice(0, 8) + 'wwwwww' + r.slice(14)));
  const run1 = (withWater) => {
    const w = lamp({ px: 4, fx: withWater ? fx : null }); const a = still(put(w, 'tollbearer', 17)), b = still(put(w, 'tollbearer', 24)), c = still(put(w, 'tollbearer', 31)); hold(w, 0.1); release(w);
    return [a, b, c].map((e) => 1000 - e.hp);
  };
  const dry = run1(false), wet = run1(true);
  assert.equal(dry[0], A.damage); assert.equal(dry[1], 0, 'dry: 15 m is out of the tap\'s reach and the jump'); assert.equal(wet[1], A.damage * A.water.mult, 'wet: it conducts for 1.5x'); assert.equal(wet[2], 0, 'but not past 8 m of the struck body');
});
test('lamp: the Vael answer — a Drone-Gill struck is stunned, a bell node takes double, others are only struck', () => {
  const one = (kind, x) => { const w = lamp(); const e = put(w, kind, x); if (kind !== 'gill') still(e); hold(w, 0.1); release(w); return e; };
  const g = one('gill', 9); assert.ok(g.stunT >= A.vael.stun - 0.05 && g.stunT < 5, 'the Gill is stunned for ' + g.stunT);
  const n = one('bellnode', 12); assert.equal(1000 - n.hp, A.damage * A.vael.nodeMult, 'the bell node takes double');
  const t = one('tollbearer', 12); assert.equal(1000 - t.hp, A.damage); assert.ok(t.stunT > 1e8, 'a Tollbearer is only struck (the 1e9 is the test hold, not the lamp)');
});
test('lamp: sprinting or switching away drops a charge without spending a cell; an empty lamp clicks on release; a tap during the cooldown is kept for a moment', () => {
  const w = lamp(); const c0 = w.player.ammo.cell; hold(w, 0.8); run(w, 5, () => idle({ fire: true, sprint: true, move: [0, 1] })); release(w); assert.equal(w.player.ammo.cell, c0, 'no shot, no cells'); assert.equal(w.player.charge, 0);
  const e = lamp(); e.player.ammo.cell = 0; hold(e, 0.2); assert.ok(release(e).some((x) => x.type === 'dry'), 'empty: a click');
  const q = lamp(); const t = still(put(q, 'tollbearer', 10)); hold(q, 0.1); release(q); assert.ok(q.player.cooldown > 0.1); hold(q, 0.05); const ev = release(q); run(q, 12); assert.equal(1000 - t.hp, A.damage * 2, 'the second tap, released mid-cooldown, still fires once the lamp is ready'); void ev;
});
test('lamp: a charge-spend that outruns the cells fires with what is left, smaller', () => {
  const w = lamp(); w.player.ammo.cell = 3; const e = still(put(w, 'tollbearer', 10)); hold(w, 1.3); release(w);
  assert.equal(w.player.ammo.cell, 0); assert.ok(1000 - e.hp > A.damage && 1000 - e.hp < A.charge.damage, `a 3-cell bolt hits for ${1000 - e.hp}`);
});
test('weapon identities are deterministic: the same seed and inputs give the same fire, stagger and arc', () => {
  const play = () => { const w = lamp({ seed: 9 }); const a = put(w, 'tollbearer', 12), b = put(w, 'gaunt', 12, 6); hold(w, 1.0); release(w); w.player.weapon = 'rivet'; run(w, 30, () => idle({ fire: true })); return JSON.stringify([a.hp, b.hp, a.slowT, b.slowT, w.player.ammo]); };
  assert.equal(play(), play());
});
test('every enemy has a sane poise (default 1, the heavy higher)', () => { for (const [k, d] of Object.entries(ENEMIES)) assert.ok((d.poise ?? 1) >= 0.5, k); assert.ok(ENEMIES.cantor.poise >= ENEMIES.wardengraft.poise && ENEMIES.wardengraft.poise > 1); });
test('slows have diminishing returns: a held rivet trigger keeps one slow going for at most a second, then the target steadies for most of a second before it can be slowed again', () => {
  const w = room({ weapon: 'rivet' }); w.player.ads = 1; const e = put(w, 'tollbearer', w.player.x + 14); const slowed = [];
  for (let i = 0; i < 200; i++) { step(w, idle({ fire: true, aim: true })); drainEvents(w); slowed.push(e.slowT > 0); }
  const runs = []; let on = null, n = 0; for (const s of slowed) { if (s === on) n++; else { if (on !== null) runs.push([on, n]); on = s; n = 1; } } runs.push([on, n]);
  const longest = (v) => Math.max(0, ...runs.filter((r) => r[0] === v).map((r) => r[1]));
  assert.ok(longest(true) >= 30 && longest(true) <= 62, 'one slow lasts about a second: ' + longest(true) + ' ticks'); assert.ok(longest(false) >= 45, 'then it steadies: ' + longest(false) + ' ticks'); assert.ok(slowed.filter(Boolean).length < slowed.length * 0.7, 'a held trigger does not hold a creature slowed all the time');
  const f = room({ weapon: 'rivet' }); const g = put(f, 'tollbearer', f.player.x + 14); g.slowImm = 0.5; f.player.ads = 1; step(f, idle({ fire: true, aim: true })); assert.ok(!(g.slowT > 0), 'a creature that has just shaken one off is not slowed again at once');
});
