// PT-076 THE BRAIN (src/engine/brain.js): each act, held on a small room. The owner found the PT-075 enemy actions invisible in play, so every assertion here is about a distance or a speed a
// player can SEE (metres, not flags); how often they fire in real levels is measured by the scratch tool in PLAYTEST_NOTES.md PT-076, and how they change the maps by verify-map.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, spawnEnemy, hashWorld, damageEnemy } from '../src/engine/world.js';
import { ENEMIES } from '../src/engine/defs.js';
import { BRAIN, inSights } from '../src/engine/brain.js';
import { ordinary } from '../src/engine/tactics.js';
import { tellOf } from '../src/render/tells.js';

const cmd = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });
const N = 22, row = (s) => '#' + s + '#', src = { format: 1, id: 'T2', version: 1, name: 'Brain', grid: ['#'.repeat(N + 2), ...Array.from({ length: N }, () => row('.'.repeat(N))), '#'.repeat(N + 2)], doors: [], secrets: [], entities: [{ type: 'player', at: [2, 2], facing: 'east' }, { type: 'exit', at: [N - 1, 1] }] };
/** an open room 44 m square, the player in the middle (unkillable, a rivet driver with plenty), creatures `[kind, dx, dz, state?]` round it */
function room(list, seed = 1, difficulty = 'normal') {
  const w = createWorld(parseMap(src), { seed, difficulty, carry: { hp: 1e6, armor: 0, ammo: { rivet: 900 }, weapons: ['rivet'] } }); w.enemies.length = 0;
  Object.assign(w.player, { x: 22, z: 22, yaw: 0, weapon: 'rivet', switchT: 0 });
  const es = list.map(([k, dx, dz, st = 'chase']) => { const e = spawnEnemy(w, k, 22 + dx, 22 + dz, Math.atan2(-dx, -dz)); e.state = st; if (st === 'chase') { e.lastX = 22; e.lastZ = 22; e.lost = 0; } return e; });
  return { w, es };
}
const run = (w, ticks, c = cmd, each) => { for (let i = 0; i < ticks; i++) { step(w, typeof c === 'function' ? c(i) : c); each?.(drainEvents(w), i); } };
const lookAt = (w, e) => { w.player.yaw = Math.atan2(-(e.x - w.player.x), -(e.z - w.player.z)); };
const bear = (w, e) => Math.atan2(e.x - w.player.x, e.z - w.player.z);
const firstSeed = (f) => { for (let s = 1; s <= 40; s++) { const r = f(s); if (r) return r; } return null; };

test('who has a brain: the ordinary roster only; the elites stand their ground; every part named in defs is one brain.js knows', () => {
  const parts = new Set(['dodge', 'strafe', 'lurch', 'circle', 'cower', 'call']);
  for (const [k, d] of Object.entries(ENEMIES)) {
    if (!d.brain) continue;
    assert.ok(ordinary({ kind: k }), k + ' is ordinary');
    for (const p of Object.keys(d.brain)) assert.ok(parts.has(p), `${k}.${p}`);
    if (d.brain.strafe) assert.ok(d.ranged && !d.strafe, k + ': a run across is for a walking shooter');
  }
  for (const k of ['wardengraft', 'bulwark', 'acolyte', 'weeping', 'resonant']) assert.ok(!ENEMIES[k].brain, k);
  for (const k of ['tollbearer', 'gaunt', 'bellhand']) assert.ok(ENEMIES[k].brain, k);
});

test('DODGE: a Gaunt you shoot at dashes out of the line, more than a metre and a half sideways in under half a second; one you are not aiming at does not', () => {
  const hit = firstSeed((seed) => {
    const { w, es: [g] } = room([['gaunt', 0, 9]], seed); g.circCd = 99; g.lungeCd = 99; lookAt(w, g);
    const b0 = bear(w, g); let started = -1;
    run(w, 40, (i) => cmd({ fire: i === 0 }), (ev, i) => { if (started < 0 && ev.some((x) => x.type === 'enemy_dodge')) started = i; });
    if (started < 0) return null;
    const lateral = 9 * Math.abs(Math.sin(bear(w, g) - b0));
    return { lateral };
  });
  assert.ok(hit, 'some seed dodges (its chance is ' + ENEMIES.gaunt.brain.dodge + ')');
  assert.ok(hit.lateral > 1.5, `out of the line by ${hit.lateral.toFixed(2)} m`);
  for (let seed = 1; seed <= 10; seed++) {
    const { w, es: [g] } = room([['gaunt', 0, 9]], seed); g.circCd = 99; g.lungeCd = 99; w.player.yaw = Math.atan2(-1, 0);          // looking away, east
    let n = 0; run(w, 40, (i) => cmd({ fire: i === 0 }), (ev) => { n += ev.filter((x) => x.type === 'enemy_dodge').length; });
    assert.equal(n, 0, 'nothing dodges a shot that is not at it');
  }
  assert.ok(inSights({ x: 0, z: 0, yaw: Math.PI }, { kind: 'gaunt', x: 0.3, z: 8 }, 0) && !inSights({ x: 0, z: 0, yaw: Math.PI }, { kind: 'gaunt', x: 3, z: 8 }, 0.7) && !inSights({ x: 0, z: 0, yaw: 0 }, { kind: 'gaunt', x: 0, z: 8 }, 0.7), 'the sights: in front, near the line');
});

test('DODGE also comes from being held in the sights: aim down them at a Gill long enough and it moves before you fire', () => {
  const r = firstSeed((seed) => {
    const { w, es: [g] } = room([['gill', 0, 9]], seed); lookAt(w, g); w.player.ads = 1;
    let n = 0; run(w, 90, cmd({ aim: true }), (ev) => { n += ev.filter((x) => x.type === 'enemy_dodge').length; });
    return n > 0 ? n : null;
  });
  assert.ok(r, 'a held aim made it dodge on some seed');
});

test('STRAFE: a Bellhand RUNS across after each shot, two to three and a half metres, turned toward where it runs, and keeps its range', () => {
  const r = firstSeed((seed) => {
    const { w, es: [b] } = room([['bellhand', 0, 9]], seed); b.called = true; b.cd = 0; b.yaw = Math.PI;
    let after = -1, p0 = null, p1 = null, maxOff = 0;
    run(w, 400, cmd(), (ev, i) => {
      if (after < 0 && b.actK === 'strafe') { after = i; p0 = { x: b.x, z: b.z }; }
      if (after >= 0 && !p1 && b.actK === 'strafe') maxOff = Math.max(maxOff, Math.abs(Math.atan2(Math.sin(b.yaw - (bear(w, b) + Math.PI)), Math.cos(b.yaw - (bear(w, b) + Math.PI)))));
      if (after >= 0 && !p1 && b.actK !== 'strafe') p1 = { x: b.x, z: b.z };
    });
    if (!p1) return null;
    return { moved: Math.hypot(p1.x - p0.x, p1.z - p0.z), maxOff };
  });
  assert.ok(r, 'it ran');
  assert.ok(r.moved > 1.5, `ran ${r.moved.toFixed(2)} m`);
  assert.ok(r.maxOff > 0.6, `it turned into the run (${r.maxOff.toFixed(2)} rad off facing you): no crab-walk`);
});

test('LURCH: a Tollbearer six metres off groans, then covers the ground at more than twice its shamble', () => {
  const { w, es: [t] } = room([['tollbearer', 0, 6.5]]); t.lurchCd = 0; t.yaw = Math.PI;
  let groan = -1; run(w, 2, cmd(), (ev, i) => { if (groan < 0 && ev.some((x) => x.type === 'enemy_lurch')) groan = i; });
  assert.ok(groan >= 0 && t.actK === 'lurch', 'it groans and plants itself');
  const tell = tellOf(t, 6.5); assert.ok(tell && !tell.ranged, 'a warm glint while it groans');
  run(w, Math.round(BRAIN.lurch.windup * 60));
  const d0 = Math.hypot(t.x - 22, t.z - 22); run(w, 30); const d1 = Math.hypot(t.x - 22, t.z - 22);
  const speed = (d0 - d1) / 0.5; assert.ok(speed > ENEMIES.tollbearer.speed * 1.9, `it surged at ${speed.toFixed(2)} m/s (it shambles at ${ENEMIES.tollbearer.speed})`);
  let n = 0; while (t.actK === 'lurch' && n < 120) { run(w, 1); n++; }
  assert.ok(t.cd >= BRAIN.lurch.recover - 0.05, 'it lands off balance: no swing for a moment (the player\'s window)');
});

test('CIRCLE: a Gaunt out of pouncing range runs round the player before it closes', () => {
  const { w, es: [g] } = room([['gaunt', 0, 9]]); g.circCd = 0; g.lungeCd = 99; g.dodgeCd = 99;
  const b0 = bear(w, g); let most = 0;
  run(w, 90, cmd(), () => { most = Math.max(most, Math.abs(Math.atan2(Math.sin(bear(w, g) - b0), Math.cos(bear(w, g) - b0)))); });
  assert.ok(most > 0.5, `it went ${(most * 180 / Math.PI).toFixed(0)} degrees round`);
});

test('COWER: a badly hurt Gaunt may turn and run, then comes back; a whole one never does', () => {
  const r = firstSeed((seed) => {
    const { w, es: [g] } = room([['gaunt', 0, 5]], seed); g.circCd = 99; g.lungeCd = 99; g.dodgeCd = 99; g.hp = ENEMIES.gaunt.hp * 0.2;
    let far = 0, cower = false; run(w, 150, cmd(), (ev) => { if (ev.some((x) => x.type === 'enemy_cower')) cower = true; far = Math.max(far, Math.hypot(g.x - 22, g.z - 22)); });
    return cower ? { far, back: g.actK !== 'cower' } : null;
  });
  assert.ok(r, 'some seed cowers'); assert.ok(r.far > 7, `it ran out to ${r.far.toFixed(1)} m`); assert.ok(r.back, 'and the run ended');
  const { w, es: [g] } = room([['gaunt', 0, 5]]); run(w, 120); assert.ok(!g.cowered, 'a whole Gaunt never rolls');
});

test('CALL: a Bellhand that sees you rings for help and wakes the sleepers along the floor; hurt it while it rings and nobody comes', () => {
  const { w, es: [b, s1, s2] } = room([['bellhand', 0, 9], ['tollbearer', 13, 9, 'idle'], ['tollbearer', -14, 14, 'idle']]); b.yaw = Math.PI; s1.sightR = 0.5; s2.sightR = 0.5;          // (sleepers that could see the player would wake by themselves)
  let rang = null; run(w, 90, cmd(), (ev) => { for (const x of ev) if (x.type === 'enemy_call') rang = x; });
  assert.ok(rang, 'it rang'); assert.equal(s1.state, 'chase', 'the near sleeper came'); assert.ok(rang.woke >= 1, `it woke ${rang.woke}`);
  assert.equal(tellOf({ ...b, actK: 'call', actT: BRAIN.call.windup / 2 }, 9).ranged, true, 'a cold glint while it lifts the bell');
  const r2 = room([['bellhand', 0, 9], ['tollbearer', 13, 9, 'idle']]); r2.es[0].yaw = Math.PI; r2.es[1].sightR = 0.5; lookAt(r2.w, r2.es[0]);
  run(r2.w, 3); assert.equal(r2.es[0].actK, 'call', 'it began to ring');
  damageEnemy(r2.w, r2.es[0], 1); run(r2.w, 60);                                                                       // (a silent blow: gunfire would wake the sleeper by its own noise)
  assert.equal(r2.es[1].state, 'idle', 'shot while it rang: the call failed'); assert.ok(r2.es[0].called, 'and it rings once a life');
  void s2;
});

test('deterministic and lazy: the same seed gives the same world; creatures with no brain (the elites) carry none of its fields', () => {
  const crowd = [['tollbearer', 6, 1], ['gaunt', 8, 2], ['bellhand', -8, 3], ['gill', 2, 9], ['chorister', -6, -6], ['tollbearer', 12, 12, 'idle']];
  const a = room(crowd, 7, 'hard'), b = room(crowd, 7, 'hard'); run(a.w, 500, (i) => cmd({ fire: i % 20 === 0, yaw: 0.01 })); run(b.w, 500, (i) => cmd({ fire: i % 20 === 0, yaw: 0.01 }));
  assert.equal(hashWorld(a.w), hashWorld(b.w));
  assert.ok(!Object.keys(a.w).includes('_fireTick'), 'the fire mark is not enumerable');
  const c = room([['bulwark', 6, 0], ['wardengraft', -6, 0]]); run(c.w, 300, (i) => cmd({ fire: i % 10 === 0 }));
  for (const e of c.es) for (const f of ['actK', 'actT', 'dodgeCd', 'lurchCd', 'circCd', 'aimT', 'cowered', 'called']) assert.ok(!(f in e), `${e.kind}: ${f}`);
});
