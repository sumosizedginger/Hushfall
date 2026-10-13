// PT-043 (the Preview, drop A): the engine pieces of Acts C and D, in a flat arena built here. The beat (a pure function of the tick) and the creatures that keep it (onBeat, the Resonant's ring, the Hive Cantor's double returning ring, the unison
// shield, phases, the `hp:` trigger condition), the lamp that holds a ring back, the small actions, and the Root Bell's clapper (the pendulum, the anchors, the fall, the crush, the spikes, the Last Note, the rising of the dead). Everything is lazy:
// a world that uses none of it carries none of it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMap, validateMap } from '../src/engine/mapformat.js';
import { createWorld, step, spawnEnemy, drainEvents, damageEnemy, hashWorld } from '../src/engine/world.js';
import { runAction } from '../src/engine/script.js';
import { ENEMIES, HIVE, TICK, LAMP_HOLDS } from '../src/engine/defs.js';
import { BEAT_TICKS, isBeatTick, beatNo, beatPhase, beatGlow, barBeat, onBeatOf } from '../src/engine/hive.js';
import { unisonMult, groupHpFrac, phaseOf, hpCondition } from '../src/engine/phases.js';
import { swingAt, targetOf } from '../src/engine/rootbell.js';
import { hitCylinder } from '../src/engine/hitvolume.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });
/** a flat 60 x 60 cell arena (each cell 2 m), a ceiling at 20 m, the player at its west edge facing east */
function arena({ extra = {}, entities = [] } = {}) {
  const n = 60, rows = []; for (let z = 0; z < n; z++) rows.push(z === 0 || z === n - 1 ? '#'.repeat(n) : '#' + '.'.repeat(n - 2) + '#');
  const src = { format: 1, id: 'T1', version: 1, name: 'Arena', grid: rows, doors: [], secrets: [], scenery: [], ceilingHeight: 20, entities: [{ type: 'player', at: [3, 30], facing: 'east' }, { type: 'exit', at: [56, 56] }, ...entities], ...extra };
  return src;
}
function field({ difficulty = 'normal', seed = 1, hp = 1e6, extra = {}, entities = [] } = {}) {
  const map = parseMap(arena({ extra, entities })), w = createWorld(map, { seed, difficulty, carry: { hp, armor: 0, ammo: { flare: 50, shell: 50, rivet: 200, rocket: 20 }, weapons: ['flare', 'scattergun', 'rivet', 'linethrower', 'mortar'] } });
  w.player.hp = hp; return { w, map };
}
const run = (w, ticks, cmd = idle(), keepAlive = true) => { const ev = []; for (let i = 0; i < ticks; i++) { if (keepAlive) w.player.hp = Math.max(w.player.hp, 1e6); step(w, cmd); ev.push(...drainEvents(w)); } return ev; };
const mk = (w, kind, x, z, o = {}) => { const e = spawnEnemy(w, kind, x, z, Math.PI / 2); Object.assign(e, o); return e; };
const cellM = 2;

test('the beat is a pure function of the tick: 90 ticks to a beat, four to a bar, nothing stored', () => {
  assert.equal(BEAT_TICKS, Math.round(HIVE.beat / TICK)); assert.equal(BEAT_TICKS, 90);
  assert.equal(isBeatTick(0), false, 'the world has not begun'); assert.equal(isBeatTick(90), true); assert.equal(isBeatTick(91), false); assert.equal(isBeatTick(180), true);
  assert.equal(beatNo(89), 0); assert.equal(beatNo(90), 1); assert.equal(beatNo(360), 4);
  assert.equal(barBeat(5), 1); assert.equal(barBeat(-1), 3);
  assert.ok(Math.abs(beatPhase(0.75) - 0.5) < 1e-9); assert.ok(beatPhase(1.5) < 1e-6 || beatPhase(1.5) > 1 - 1e-6);
  assert.ok(beatGlow(0.0) < 0.01 && beatGlow(0.18) > 0.99 && beatGlow(1.4) < 0.3, 'the light swells on the beat and falls away');
  assert.equal(onBeatOf(10, 8, 2), true); assert.equal(onBeatOf(11, 8, 2), false);
});

test('onBeat: such a creature starts an attack only on a beat tick; an ordinary one does not wait', () => {
  const starts = (onBeat) => {
    const { w } = field(); const e = mk(w, 'tollbearer', w.player.x + 2.1, w.player.z, { state: 'chase', onBeat }); e.lastX = w.player.x; e.lastZ = w.player.z;
    const ticks = []; for (let i = 0; i < 60 * 14; i++) { w.player.hp = 1e6; step(w, idle()); for (const ev of drainEvents(w)) if (ev.type === 'enemy_windup' && ev.id === e.id) ticks.push(w.tick); } return ticks;
  };
  const held = starts(true), free = starts(false);
  assert.ok(held.length >= 3, 'it attacks, on the beat: ' + held.length); assert.ok(held.every((t) => t % BEAT_TICKS === 0), 'every wind-up began on a beat tick: ' + held.join(','));
  assert.ok(free.length >= 3 && free.some((t) => t % BEAT_TICKS !== 0), 'an ordinary creature starts when its cooldown ends: ' + free.join(','));
});

test('the unison shield: a twentieth gets through while the choir sings, more with every voice that falls, everything when it is silent', () => {
  const { w } = field(); const H = ENEMIES.hivecantor; assert.equal(H.unison.group, 'choir');
  const boss = mk(w, 'hivecantor', 60, 60, { state: 'chase' }), singers = [0, 1, 2, 3].map((i) => mk(w, 'tollbearer', 40 + i * 2, 70, { group: 'choir', state: 'idle' }));
  assert.ok(Math.abs(unisonMult(w, H) - H.unison.floor) < 1e-9, 'all four singing: the floor');
  const take = () => { const b = boss.hp; damageEnemy(w, boss, 100); return b - boss.hp; };
  assert.ok(Math.abs(take() - 100 * H.unison.floor) < 1e-9);
  damageEnemy(w, singers[0], 1e6); assert.ok(Math.abs(unisonMult(w, H) - (H.unison.floor + (1 - H.unison.floor) * 0.25)) < 1e-9, 'a quarter of the choir dead: a quarter of the way open');
  damageEnemy(w, singers[1], 1e6); damageEnemy(w, singers[2], 1e6); assert.ok(unisonMult(w, H) > 0.7 && unisonMult(w, H) < 0.8);
  damageEnemy(w, singers[3], 1e6); assert.equal(unisonMult(w, H), 1, 'the choir is dead: the full blow');
  const { w: w2 } = field(); const b2 = mk(w2, 'hivecantor', 60, 60); assert.equal(unisonMult(w2, H), 1, 'a conductor with no choir at all is not shielded');
  void b2;
});

test('hp: a trigger condition on the share of a group\'s hit points; phases are sticky and come from hit points or from the choir dead', () => {
  const { w } = field(); const a = mk(w, 'rootanchor', 60, 60, { group: 'b' }), b = mk(w, 'rootanchor', 64, 60, { group: 'b' });
  assert.equal(groupHpFrac(w, 'b'), 1); assert.equal(groupHpFrac(w, 'nobody'), null);
  assert.equal(hpCondition(w, 'hp:b<0.5'), false); a.hp = 0; a.state = 'dead'; assert.equal(hpCondition(w, 'hp:b<0.6'), true, 'half of it is gone'); assert.equal(hpCondition(w, 'hp:b<0.4'), false);
  assert.equal(hpCondition(w, 'seq:x'), null, 'not an hp condition at all');
  const H = ENEMIES.hivecantor, boss = mk(w, 'hivecantor', 60, 60, { state: 'chase' });
  assert.equal(phaseOf(w, boss, H), null, 'phase one'); boss.hp = H.hp * 0.45; assert.equal(phaseOf(w, boss, H), H.phases[0], 'under half: phase two'); boss.hp = H.hp; assert.equal(phaseOf(w, boss, H), H.phases[0], 'it does not go back');
  const { w: w2 } = field(); const boss2 = mk(w2, 'hivecantor', 60, 60), s = mk(w2, 'tollbearer', 40, 70, { group: 'choir' }); assert.equal(phaseOf(w2, boss2, H), null); damageEnemy(w2, s, 1e6); assert.equal(phaseOf(w2, boss2, H), H.phases[0], 'the choir is dead: phase two');
});

test('a trigger fires on hp: and the three small actions do what they say', () => {
  const src = arena({ entities: [{ type: 'enemy', kind: 'rootanchor', at: [30, 10], group: 'g' }, { type: 'enemy', kind: 'rootanchor', at: [34, 10], group: 'g' }] });
  src.triggers = [{ id: 't', when: 'hp:g<0.9', do: [{ tremor: 1.2 }, { sound: 'bell_strike' }, { silence: true }] }];
  assert.equal(validateMap(src).ok, true, JSON.stringify(validateMap(src).errors));
  const map = parseMap(src), w = createWorld(map, { seed: 1 }); w.player.hp = 1e6;
  assert.equal(run(w, 5).some((e) => e.type === 'tremor'), false); damageEnemy(w, w.enemies[0], 1e6);
  const ev = run(w, 3); assert.ok(ev.some((e) => e.type === 'shake' && e.amount === 1.2) && ev.some((e) => e.type === 'tremor') && ev.some((e) => e.type === 'cue' && e.name === 'bell_strike') && ev.some((e) => e.type === 'silence'), JSON.stringify(ev.map((e) => e.type)));
  assert.equal(w.silenced, true, 'the silence is state, not only an event');
  const bad = arena(); bad.triggers = [{ id: 't', when: 'hp:nope<0.5', do: [{ shake: 1 }] }]; assert.equal(validateMap(bad).ok, false); bad.triggers = [{ id: 't', when: 'start', do: [{ silence: false }] }]; assert.equal(validateMap(bad).ok, false);
  const ok = arena({ extra: { lampHolds: { plain: 0.6, own: 0.4 } } }); assert.equal(validateMap(ok).ok, true);
});

test('the Resonant: alone it does not ring; with company it rings on every beat, 5 x (1 + neighbours) up to a cap; asleep it is silent; a ring has a hit height of a metre', () => {
  const R = ENEMIES.resonant.ring;
  const rings = (neighbours, { sleeping = false } = {}) => {
    const { w } = field(); const rr = mk(w, 'resonant', w.player.x + 12, w.player.z, { state: sleeping ? 'idle' : 'chase', ...(sleeping ? { sightR: 0.1 } : {}) }); rr.lastX = w.player.x; rr.lastZ = w.player.z;
    for (let i = 0; i < neighbours; i++) mk(w, 'tollbearer', rr.x + 2 + i * 0.1, rr.z + 3, { state: 'chase', lastX: w.player.x, lastZ: w.player.z });
    const out = []; for (let i = 0; i < 95; i++) { w.player.hp = 1e6; step(w, idle()); } for (const e of w.pulses) out.push(e.dmg); return out;
  };
  assert.deepEqual(rings(0), [], 'alone: no ring'); const one = rings(1); assert.ok(one.length >= 1 && one[0] === R.base * 2, 'one neighbour: ' + one);
  assert.equal(rings(3)[0], R.base * 4); assert.equal(rings(9)[0], R.cap, 'the cap'); assert.deepEqual(rings(2, { sleeping: true }), [], 'asleep');
});

test('a ring that finds a player with a lit lantern is cut to the plain share (the lamp is the counter-tone); Ines\'s own lamp cuts it further; a map without lampHolds is unchanged', () => {
  assert.equal(LAMP_HOLDS.plain, 0.6); assert.equal(LAMP_HOLDS.own, 0.4);
  const hit = (extra, lamp) => {
    const { w } = field({ hp: 100, extra: { atmosphere: { dark: true }, lantern: { oil: 50, ...(lamp === 'own' ? { eternal: true } : {}) }, ...extra } });
    if (lamp) w.player.lamp.on = true;
    w.pulses.push({ id: 99, x: w.player.x + 6, z: w.player.z, y: w.player.y, r: 0.6, speed: 12, dmg: 20, width: 1.3, maxR: 20, hit: false });
    const b = w.player.hp; for (let i = 0; i < 120; i++) step(w, idle()); return b - w.player.hp;
  };
  assert.equal(hit({ lampHolds: { plain: 0.6, own: 0.4 } }, null), 20, 'no lamp lit: the full ring');
  assert.equal(hit({ lampHolds: { plain: 0.6, own: 0.4 } }, 'plain'), 12); assert.equal(hit({ lampHolds: { plain: 0.6, own: 0.4 } }, 'own'), 8);
  assert.equal(hit({}, 'plain'), 20, 'a map that does not say so: unchanged');
});

test('a ring has a vertical reach: a metre by default, more when it says so (the Last Note rolls over the tiers)', () => {
  const hit = (h, py) => { const { w } = field({ hp: 100 }); w.pulses.push({ id: 99, x: w.player.x + 6, z: w.player.z, y: -py, r: 0.6, speed: 12, dmg: 20, width: 1.3, maxR: 20, hit: false, ...(h ? { h } : {}) }); const b = w.player.hp; for (let i = 0; i < 120; i++) step(w, idle()); return b - w.player.hp; };      // (the sim puts the player on the floor each tick, so the ring is lowered instead)
  assert.equal(hit(null, 1.0), 0, 'a metre up: it passes under'); assert.equal(hit(null, 0), 20); assert.equal(hit(3.2, 2.5), 20, 'a taller ring takes a tier'); assert.equal(hit(3.2, 3.4), 0);
});

test('the Hive Cantor: it draws its ring one beat early and lets it go on the beat, a double ring that returns; in phase two it comes every bar and the dome calls Choristers', () => {
  const { w } = field(); const H = ENEMIES.hivecantor, boss = mk(w, 'hivecantor', 40, 60, { state: 'chase', summons: [[44, 66], [44, 54]] }); mk(w, 'tollbearer', 20, 90, { group: 'choir', state: 'idle' });
  const evs = []; for (let i = 0; i < 60 * 30; i++) { w.player.hp = 1e6; step(w, idle()); for (const e of drainEvents(w)) evs.push({ ...e, t: w.tick }); }
  const windups = evs.filter((e) => e.type === 'enemy_windup' && e.kind === 'hivecantor'), rings = evs.filter((e) => e.type === 'pulse' && !e.echo), echoes = evs.filter((e) => e.type === 'pulse' && e.echo);
  assert.ok(rings.length >= 2 && windups.length >= 2, `${windups.length} windups, ${rings.length} rings`);
  for (const r of rings) assert.ok(r.t % BEAT_TICKS === 0 && onBeatOf(r.t / BEAT_TICKS, H.hive.ring.every, H.hive.ring.at), 'a ring on beat 2 of every 8: ' + r.t / BEAT_TICKS);
  for (const wu of windups) assert.ok(rings.some((r) => r.t - wu.t === BEAT_TICKS), 'each ring is drawn exactly one beat before');
  assert.equal(echoes.length, rings.length, 'every ring has its echo'); assert.ok(echoes.every((e) => rings.some((r) => Math.abs(e.t - r.t - Math.round(H.hive.ring.echo / TICK)) <= 1)));
  assert.ok(w.pulses.every((q) => q.reflectAt === H.hive.ring.reflect), 'and it returns');
  // phase two: every bar, and summons
  boss.hp = H.hp * 0.4; w.pulses.length = 0; const ev2 = []; for (let i = 0; i < 60 * 40; i++) { w.player.hp = 1e6; step(w, idle()); for (const e of drainEvents(w)) ev2.push({ ...e, t: w.tick }); }
  const r2 = ev2.filter((e) => e.type === 'pulse' && !e.echo); assert.ok(r2.length >= 5, 'a ring every bar: ' + r2.length); assert.equal((r2[1].t - r2[0].t) / BEAT_TICKS, H.phases[0].hive.ring.every);
  assert.ok(w.enemies.filter((e) => e.kind === 'chorister' && e.summoned).length >= 3, 'the dome calls Choristers');
});

test('the Hive Cantor hovers over its podium: a flyer\'s hit volume, no walking, and a world with none carries nothing new', () => {
  const { w } = field(); const b = mk(w, 'hivecantor', 60, 60, { state: 'chase' }); run(w, 60 * 5); assert.equal(b.x, 60); assert.equal(b.z, 60);
  const c = hitCylinder(b); assert.equal(c.y0, b.y + ENEMIES.hivecantor.hover); assert.equal(c.y1, c.y0 + ENEMIES.hivecantor.height);
  const { w: w2 } = field(); mk(w2, 'tollbearer', 40, 60); run(w2, 100); assert.equal(w2.spikes, undefined); assert.equal(w2.silenced, undefined); assert.equal(w2.enemies[0].rb, undefined); assert.equal(w2.enemies[0].lift, undefined);
});

// ---------------------------------------------------------------- the Root Bell
const bellField = ({ difficulty = 'normal', anchors = 4 } = {}) => {
  const f = field({ difficulty }); const w = f.w, B = ENEMIES.rootbell.bell;
  const cx = 30 * cellM, cz = 30 * cellM, bell = mk(w, 'rootbell', cx, cz, { state: 'idle', group: 'rootbell' }), as = [];
  for (let i = 0; i < anchors; i++) { const a = (i / anchors) * Math.PI * 2 + 0.7; as.push(mk(w, 'rootanchor', cx + Math.cos(a) * 36, cz + Math.sin(a) * 36, { group: 'anchors', state: 'idle' })); }
  w.player.x = cx - 40; w.player.z = cz; return { ...f, bell, as, B, cx, cz };
};

test('the clapper hangs still while asleep, swings as a pendulum once awake (a pure function of the clock), turns its line at every pass of the middle, and its hit volume is where it is drawn', () => {
  const { w, bell, B, cx, cz } = bellField(); bell.sightR = 0.1; run(w, 120);
  assert.equal(bell.x, cx); assert.equal(bell.z, cz, 'asleep: it hangs in the middle'); assert.ok(bell.lift > 0 && bell.lift < 4, 'low in the middle, lift ' + bell.lift);
  delete bell.sightR; bell.state = 'chase'; const xs = [], ys = [], lines = new Set(); const t0 = w.time;
  for (let i = 0; i < 60 * 13; i++) { run(w, 1); xs.push(Math.hypot(bell.x - cx, bell.z - cz)); ys.push(bell.lift); }
  assert.ok(Math.max(...xs) > B.len[0] * Math.sin(B.amp[0]) * 0.95, 'it swings out: ' + Math.max(...xs).toFixed(2)); assert.ok(Math.max(...ys) > Math.min(...ys) + 1.2, 'and up');
  const rb = bell.rb, s0 = swingAt(B, rb, 1.7), s1 = swingAt(B, rb, 1.7); assert.deepEqual(s0, s1, 'pure');
  const a = swingAt(B, rb, B.period / 2 - 0.2), b = swingAt(B, rb, B.period / 2 + 0.2); assert.ok(Math.hypot(a.x - cx, a.z - cz) < 1.5 && Math.hypot(b.x - cx, b.z - cz) < 1.5, 'near the middle at the pass'); assert.ok(Math.abs(b.theta - a.theta - B.turn) < 1e-9, 'the line turns by ' + B.turn);
  const c = hitCylinder(bell); assert.ok(Math.abs(c.y0 - (bell.y + bell.lift)) < 1e-9, 'the hit volume rides the lift'); void t0; void lines;
});

test('a ring is struck at the end of the first swing and the cut anchors lengthen the chain and widen the swing', () => {
  const { w, bell, as, B } = bellField(); bell.state = 'chase'; const ev = run(w, 60 * 8);
  const strikes = ev.filter((e) => e.type === 'bell_strike'); assert.ok(strikes.length >= 1, 'a bell_strike'); assert.ok(w.pulses.length >= 0);
  assert.equal(bell.rb.len, B.len[0]);
  damageEnemy(w, as[0], 1e6); run(w, 60 * 6); assert.ok(bell.rb.len > B.len[0] + 0.1 && bell.rb.amp > B.amp[0] + 0.03, 'one cut: lower and wider ' + bell.rb.len.toFixed(2)); assert.ok(Math.abs(bell.rb.len - B.len[1]) < 0.02, 'it eased to the new length');
  assert.deepEqual(targetOf(B, 9), { len: B.len[4], amp: B.amp[4] }, 'never past the last');
});

test('under the middle of the swing the clapper crushes; away from it, it does not', () => {
  const { w, bell, B, cx, cz } = bellField(); bell.state = 'chase'; run(w, 10);
  w.player.x = cx + 30; w.player.z = cz + 30; w.player.hp = 100; const b = w.player.hp; for (let i = 0; i < 60 * 12; i++) { step(w, idle()); w.player.x = cx + 30; w.player.z = cz + 30; } assert.ok(w.player.hp >= b - 30, 'far away only the ring can reach: ' + (b - w.player.hp));
  // stand in the middle and wait for it to pass
  const hits = []; const f2 = bellField(); f2.bell.state = 'chase'; for (let i = 0; i < 60 * 14; i++) { f2.w.player.x = f2.cx; f2.w.player.z = f2.cz; f2.w.player.hp = 100; step(f2.w, idle()); for (const e of drainEvents(f2.w)) if (e.type === 'bell_crush') hits.push(e); }
  assert.ok(hits.length >= 2, 'it passes over the middle twice a period, crushing: ' + hits.length); assert.ok(f2.w.stats.damageTaken >= B.crush.damage * 0.5);
});

test('the last anchor cut: the clapper falls, slams the floor (a ring, a shake), and on the ground it charges, crashes into stone and stands stunned', () => {
  const { w, bell, as, B } = bellField(); bell.state = 'chase'; run(w, 120); const ev = [];
  for (const a of as) damageEnemy(w, a, 1e6); for (let i = 0; i < 60 * 6; i++) { w.player.hp = 1e6; step(w, idle()); ev.push(...drainEvents(w)); }
  assert.ok(ev.some((e) => e.type === 'bell_fall') && ev.some((e) => e.type === 'bell_slam') && ev.some((e) => e.type === 'shake'), JSON.stringify([...new Set(ev.map((e) => e.type))]));
  assert.equal(bell.rb.mode, 'ground'); assert.equal(bell.lift, 0);
  const more = []; w.player.x = bell.x + 14; w.player.z = bell.z; for (let i = 0; i < 60 * 20; i++) { w.player.hp = 1e6; step(w, idle()); more.push(...drainEvents(w)); }
  assert.ok(more.some((e) => e.type === 'enemy_windup' && e.kind === 'rootbell'), 'a charge begins (the tell)'); assert.ok(more.some((e) => e.type === 'spike_warn') && more.some((e) => e.type === 'spike_strike'), 'spikes where the player stood, with a warning');
  assert.ok(w.spikes === undefined || w.spikes.every((q) => q.age <= B.spikes.warn + B.spikes.life + 0.1));
});

test('rooted spikes: a spike strikes where the player stood a second ago and hurts only if the player is still there', () => {
  const { w, bell, as, B } = bellField(); bell.state = 'chase'; run(w, 60); for (const a of as) damageEnemy(w, a, 1e6); run(w, 60 * 4);
  w.player.hp = 100; const x0 = w.player.x, z0 = w.player.z; w.spikes = [{ id: 900, x: x0, z: z0, y: w.player.y, age: 0, struck: false }]; bell.stunT = 99;
  w.pulses.length = 0; const b = w.player.hp; run(w, Math.round((B.spikes.warn + 0.3) / TICK), idle(), false); assert.equal(b - w.player.hp, Math.round(B.spikes.damage), 'standing still: struck');
  w.pulses.length = 0; w.spikes = [{ id: 901, x: x0, z: z0, y: w.player.y, age: 0, struck: false }]; w.player.x = x0 + 4; const b2 = w.player.hp; run(w, Math.round((B.spikes.warn + 0.3) / TICK), idle(), false); assert.equal(b2 - w.player.hp, 0, 'stepped aside: nothing');
});

test('the Last Note: under 30% the lights fall into a roll of rings every three seconds over the tiers, the charge is faster, the heart is open; the dead clapper does not break: it is drawn back up and hangs', () => {
  const { w, bell, as, B } = bellField(); bell.state = 'chase'; run(w, 60); for (const a of as) damageEnemy(w, a, 1e6); run(w, 60 * 4);
  const hp = bell.hp; bell.stunT = 0; bell.hp = ENEMIES.rootbell.hp * 0.25; const ev = run(w, 60 * 10);
  assert.equal(bell.rb.last, true); assert.ok(ev.some((e) => e.type === 'bell_last'), 'announced'); assert.ok(bell.chargeC.speed > ENEMIES.rootbell.charge.speed);
  const rolls = ev.filter((e) => e.type === 'bell_strike' && e.last); assert.ok(rolls.length >= 2 && rolls.length <= 4, 'about three seconds apart: ' + rolls.length);
  const b = bell.hp; damageEnemy(w, bell, 100); assert.ok(Math.abs(b - bell.hp - 100 * B.exposed * (bell.stunT > 0 ? 1.5 : 1)) < 1e-6, 'the heart is open: ' + (b - bell.hp)); void hp;
  bell.hp = 1; damageEnemy(w, bell, 1e6); assert.equal(bell.state, 'dead'); const x0 = bell.x; run(w, 60 * 5);
  assert.ok(Math.hypot(bell.x - bell.rb.cx, bell.z - bell.rb.cz) < 0.2 && bell.lift > 1, 'it hangs again over the middle, ' + bell.lift.toFixed(1) + ' m up'); void x0;
});

test('the pendulum and the fall are deterministic, and a normal world is not touched by any of it', () => {
  const play = () => { const { w, bell, as } = bellField(); bell.state = 'chase'; run(w, 300); damageEnemy(w, as[0], 1e6); run(w, 300); for (const a of as) damageEnemy(w, a, 1e6); run(w, 600); return hashWorld(w); };
  assert.equal(play(), play());
  const { w } = field(); mk(w, 'tollbearer', 40, 60); const h0 = JSON.stringify(w.enemies[0]); assert.ok(!('rb' in w.enemies[0]) && !('onBeat' in w.enemies[0]) && !('ph' in w.enemies[0]) && !('chargeC' in w.enemies[0]), h0);
});
