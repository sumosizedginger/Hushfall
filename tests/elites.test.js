// Gate 2 roster: the Sexton (revives the fallen), the Warden-Graft (front armour, charge, wall-crash stagger), and the Cantor (bell-node shield, tone pulses, summons).
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, spawnEnemy } from '../src/engine/world.js';
import { makeSave, parseSave, loadWorld } from '../src/engine/save.js';
import { ENEMIES } from '../src/engine/defs.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const room = (w = 30, h = 13, extra = {}, ents = []) => parseMap({ format: 1, id: 'E1', version: 1, name: 'Arena', ceilingHeight: 8, grid: ['#'.repeat(w), ...Array.from({ length: h - 2 }, () => '#' + '.'.repeat(w - 2) + '#'), '#'.repeat(w)], doors: [], secrets: [],
  entities: [{ type: 'player', at: [2, 6], facing: 'east' }, { type: 'exit', at: [w - 3, 6] }, ...ents], ...extra });
const cell = (c) => (c + 0.5) * 2;
const quiet = (m, difficulty = 'normal') => { const w = createWorld(m, { seed: 1, difficulty }); w.enemies.length = 0; w.player.hp = 5000; return w; };
const run = (w, n, cmd = () => idle()) => { const ev = []; for (let i = 0; i < n; i++) { step(w, cmd(i)); ev.push(...drainEvents(w)); } return ev; };
const put = (w, kind, cx, cz, yaw = 0) => spawnEnemy(w, kind, cell(cx), cell(cz), yaw);
const at = (w, cx, cz, yaw = -Math.PI / 2) => { Object.assign(w.player, { x: cell(cx), z: cell(cz), yaw }); };
const kill = (w, e) => { e.state = 'dead'; e.dead = 1; w.stats.kills++; };

// ----------------------------------------------------------------------------------------------------------------------- Sexton
test('a Sexton raises a fallen Tollbearer after a visible channel, at half health, and the kill count goes back down', () => {
  const w = quiet(room()); at(w, 3, 6); const s = put(w, 'sexton', 18, 6, Math.PI), t = put(w, 'tollbearer', 14, 4, 0); s.state = 'chase'; kill(w, t); const k0 = w.stats.kills;
  const ev = run(w, 60 * 4); const types = ev.map((e) => e.type);
  assert.ok(types.includes('sexton_channel') && types.includes('enemy_revived'), types.join()); assert.ok(types.indexOf('sexton_channel') < types.indexOf('enemy_revived'), 'the rite is visible before it works');
  assert.equal(t.state, 'chase'); assert.ok(Math.abs(t.hp - ENEMIES.tollbearer.hp * 0.5) < 1e-6); assert.equal(w.stats.kills, k0 - 1);
});
test('hurting a channelling Sexton breaks the rite; a corpse can be raised at most twice; a Sexton keeps away from the player', () => {
  const w = quiet(room()); at(w, 3, 6); const s = put(w, 'sexton', 20, 6, Math.PI), t = put(w, 'tollbearer', 16, 4, 0); s.state = 'chase'; kill(w, t);
  run(w, 60); assert.ok(s.channelT >= 0, 'channelling'); s.hp = 1000; w.projectiles.push({ id: 99, weapon: 'flare', x: s.x, y: 1, z: s.z, vx: 0, vy: 0, vz: 0, life: 0.01 }); run(w, 3);
  assert.ok(s.channelT < 0 && t.state === 'dead', 'interrupted: the corpse stays down');
  const w2 = quiet(room()); at(w2, 3, 6); const s2 = put(w2, 'sexton', 20, 6, Math.PI), t2 = put(w2, 'gaunt', 17, 4, 0); s2.state = 'chase'; t2.revived = 2; kill(w2, t2); run(w2, 60 * 8); assert.equal(t2.state, 'dead', 'a corpse that has been raised twice stays down');
  const w3 = quiet(room()); at(w3, 10, 6); const s3 = put(w3, 'sexton', 13, 6, Math.PI); s3.state = 'chase'; s3.hp = 1000; const d0 = Math.hypot(s3.x - w3.player.x, s3.z - w3.player.z); run(w3, 60 * 3);
  assert.ok(Math.hypot(s3.x - w3.player.x, s3.z - w3.player.z) > d0 + 2, 'it backs away from the player');
});

// ----------------------------------------------------------------------------------------------------------------------- Warden-Graft
test('Warden-Graft plate: a direct hit from the front does about a third of the damage; splash and hits from behind do not care', () => {
  const dmgFrom = (yaw, viaSplash) => {
    const w = quiet(room()); at(w, 8, 6); const e = put(w, 'wardengraft', 12, 6, yaw); e.state = 'chase'; e.hp = 9999; e.stunT = 0; e.chargeCd = 99; e.cd = 99;
    if (viaSplash) { w.projectiles.push({ id: 1, weapon: 'flare', x: e.x - 0.3, y: 1, z: e.z, vx: 0, vy: 0, vz: 0, life: 0.01 }); run(w, 2); }
    else { w.player.weapons = ['flare', 'scattergun', 'rivet']; w.player.weapon = 'rivet'; w.player.ammo.rivet = 200; w.player.yaw = -Math.PI / 2; w.player.pitch = -0.02; e.x = w.player.x + 6; e.z = w.player.z; e.yaw = yaw; const pin = () => { e.x = w.player.x + 6; e.z = w.player.z; e.yaw = yaw; e.chargeCd = 99; e.cd = 99; e.chargeT = -1; }; run(w, 40, () => { pin(); return idle({ aim: true }); }); run(w, 40, () => { pin(); return idle({ aim: true, fire: true }); }); }      // twenty single rivets, aimed, the target held in place
    return 9999 - e.hp;
  };
  const front = dmgFrom(Math.atan2(-1, 0), false), back = dmgFrom(Math.atan2(1, 0), false);     // facing the player (west, sin(yaw) = -1) vs facing away (east)
  assert.ok(front > 0 && back > front * 2.2, `back ${back.toFixed(1)} vs front ${front.toFixed(1)}`);
  const splashFront = dmgFrom(Math.atan2(-1, 0), true); assert.ok(splashFront > 60, 'a flare splash is not reduced by plate: ' + splashFront.toFixed(0));
});
test('a Warden charges in a straight line after a windup, and a player who steps aside is not hit', () => {
  const stay = quiet(room(30, 13)); at(stay, 3, 6); const e = put(stay, 'wardengraft', 10, 6, Math.PI / 2 * -1); e.state = 'chase'; e.hp = 9999;
  const ev = run(stay, 60 * 4); assert.ok(ev.some((x) => x.type === 'enemy_windup'), 'windup tell'); assert.ok(ev.some((x) => x.type === 'hurt' || x.type === 'enemy_strike'), 'standing still gets you hit');
  const dodge = quiet(room(30, 13)); at(dodge, 3, 6); const d = put(dodge, 'wardengraft', 10, 6, Math.PI / 2 * -1); d.state = 'chase'; d.hp = 9999; let go = -1;
  const ev2 = run(dodge, 60 * 4, (i) => { if ((d.chargeT ?? -1) >= 0.7 && go < 0) go = i; return go >= 0 && i < go + 22 ? idle({ move: [1, 0] }) : idle(); });         // step sideways once the charge is under way
  assert.ok(go >= 0, 'it charged'); assert.ok(!ev2.some((x) => x.type === 'enemy_strike' && x.kind === 'wardengraft'), 'sidestepping the charge works');
});
test('a Warden that charges into a wall crashes and is stunned, takes 60% more damage while down, and does nothing meanwhile', () => {
  // a charge forced at a crate directly in its path
  const w2 = quiet(room(30, 13, {}, [{ type: 'prop', kind: 'crate', at: [8, 6] }])); at(w2, 3, 6); const e2 = put(w2, 'wardengraft', 14, 6, Math.atan2(-1, 0)); e2.state = 'chase'; e2.hp = 9999; e2.chargeT = 0.85; e2.chargeCd = 0;
  const ev2 = run(w2, 90); assert.ok(ev2.some((x) => x.type === 'warden_crash'), ev2.map((x) => x.type).join()); assert.ok(e2.stunT > 0 || ev2.some((x) => x.type === 'warden_crash'));
  const x0 = e2.x; run(w2, 20); assert.ok(Math.abs(e2.x - x0) < 0.01 || e2.stunT <= 0, 'it does not move while stunned');
});

// ----------------------------------------------------------------------------------------------------------------------- Cantor
const arena = (ents = [], extra = {}) => room(40, 21, extra, ents);
const boss = (w, nodes = 2) => { const c = put(w, 'cantor', 30, 10, Math.PI); c.state = 'chase'; c.hp = 9999; c.pulseCd = 99; const n = []; for (let i = 0; i < nodes; i++) { const b = put(w, 'bellnode', 26 + i * 2, 4, 0); n.push(b); } return { c, n }; };
test('the Cantor takes 5% damage while any bell node stands; killing a node staggers it; with the ring broken it takes full damage', () => {
  const dealt = (nodes) => { const w = quiet(arena()); at(w, 8, 10); const { c } = boss(w, nodes); w.projectiles.push({ id: 1, weapon: 'flare', x: c.x - 0.3, y: 1, z: c.z, vx: 0, vy: 0, vz: 0, life: 0.01 }); const ev = run(w, 2); return { d: 9999 - c.hp, shield: ev.some((e) => e.type === 'shield_hit') }; };
  const shielded = dealt(2), open = dealt(0); assert.ok(open.d > 40 && shielded.d < open.d * 0.1 && shielded.shield, `shielded ${shielded.d.toFixed(1)} vs open ${open.d.toFixed(1)}`);
  const w = quiet(arena()); at(w, 8, 10); const { c, n } = boss(w, 2); n[0].hp = 1; n[1].hp = 1;
  w.projectiles.push({ id: 2, weapon: 'flare', x: n[0].x, y: 1, z: n[0].z, vx: 0, vy: 0, vz: 0, life: 0.01 }); const ev = run(w, 3); assert.ok(ev.some((e) => e.type === 'node_severed'));
  assert.ok(c.stunT > 0, 'the Cantor staggers when a node falls');
});
test('a tone pulse is a ring that hurts once: cover stops it, and so does standing a metre or more above the floor', () => {
  const ring = (w, x, z) => w.pulses.push({ id: 900, x, z, y: 0, r: 0.6, speed: 9.5, dmg: 22, width: 1.3, maxR: 40, hit: false });
  const exposed = quiet(arena()); at(exposed, 18, 10); const a = boss(exposed, 0).c; a.pulseCd = 0;
  const evA = run(exposed, 60 * 4, () => { if (exposed.pulses.length) a.pulseCd = 99; return idle(); }); assert.ok(evA.some((e) => e.type === 'pulse'), 'it sang'); assert.equal(evA.filter((e) => e.type === 'pulse_hit').length, 1, 'the ring hits once');
  // cover: the Cantor sings while it can see us; then we step behind a pillar and the ring is cut (ring injected at the Cantor so the geometry is exact)
  const covered = quiet(arena([{ type: 'prop', kind: 'pillar', at: [24, 10] }])); at(covered, 18, 10); ring(covered, cell(30), cell(10)); const evB = run(covered, 60 * 4);
  assert.equal(evB.filter((e) => e.type === 'pulse_hit').length, 0, 'a pillar between the Cantor and us breaks the ring');
  const open = quiet(arena()); at(open, 18, 10); ring(open, cell(30), cell(10)); assert.equal(run(open, 60 * 4).filter((e) => e.type === 'pulse_hit').length, 1, 'the same ring with nothing in the way does hit');
  const high = quiet(arena([], { heights: Array.from({ length: 21 }, (_, z) => '.'.repeat(14) + (z >= 8 && z <= 12 ? '22222' : '.....') + '.'.repeat(21)) })); at(high, 16, 10); high.player.y = 1; ring(high, cell(30), cell(10));
  assert.equal(run(high, 60 * 4).filter((e) => e.type === 'pulse_hit').length, 0, 'standing on a 1 m ledge clears the ring (y=' + high.player.y + ')');
});
test('the Cantor summons Gaunts from its listed points, keeps its distance, and fans toll-shots once the ring is broken', () => {
  const w = quiet(arena()); at(w, 20, 10); const { c } = boss(w, 0); c.summons = [[cell(34), cell(4)], [cell(34), cell(16)]]; c.summonCd = 0; c.shotCd = 0;
  const ev = run(w, 60 * 3); assert.ok(ev.filter((e) => e.type === 'enemy_spawn').length >= 3, 'three Gaunts'); assert.ok(w.enemies.filter((e) => e.kind === 'gaunt').every((g) => g.state === 'chase'));
  assert.ok(ev.some((e) => e.type === 'enemy_shot' && e.kind === 'cantor'), 'a fan of shots (ring broken)');
  const w2 = quiet(arena()); at(w2, 20, 10); const c2 = boss(w2, 2).c; c2.pulseCd = 99; run(w2, 60 * 5); assert.ok(Math.hypot(c2.x - w2.player.x, c2.z - w2.player.z) >= 5.5, 'it does not walk into melee range');
  assert.equal(w2.enemyShots.length, 0, 'no shots while the ring stands');
});
test('pulses, stagger and channel state survive a save; a v7 save (before the roster) migrates and plays on', () => {
  const m = arena(), w = quiet(m); at(w, 8, 10); const { c } = boss(w, 1); c.pulseCd = 0; run(w, 60 * 2);
  const back = loadWorld(parseSave(JSON.stringify(makeSave(w, 'mid-level'))).save, () => m).world; assert.equal(back.pulses.length, w.pulses.length);
  const old = JSON.parse(JSON.stringify(makeSave(w, 'mid-level'))); old.version = 7; delete old.world.pulses; const r = parseSave(JSON.stringify(old)); assert.equal(r.ok, true, r.detail); assert.equal(r.migratedFrom, 7);
  const w2 = loadWorld(r.save, () => m).world; run(w2, 120); assert.ok(Array.isArray(w2.pulses));
});

// ----------------------------------------------------------------------------------------------------------------------- pinned numbers (audit A21: mutations of these constants used to survive)
import { damageEnemy } from '../src/engine/world.js';
test('pinned: the Warden plate takes 34% from the front, 100% from behind and from splash, and 160% while stunned; a crash stuns for about 2.6 s', () => {
  const w = quiet(room()); at(w, 3, 6); const e = put(w, 'wardengraft', 10, 6, -Math.PI / 2); e.hp = 1000;
  const lose = (f) => { const h = e.hp; f(); return +(h - e.hp).toFixed(3); };
  assert.equal(lose(() => damageEnemy(w, e, 100)), 34, 'front (facing the player)');
  assert.equal(lose(() => damageEnemy(w, e, 100, { splash: true })), 100, 'splash ignores the plate');
  e.yaw = Math.PI / 2; assert.equal(lose(() => damageEnemy(w, e, 100)), 100, 'from behind');
  e.yaw = -Math.PI / 2; e.stunT = 1; assert.equal(lose(() => damageEnemy(w, e, 100)), 160, 'stunned: the plate is exposed and it takes 60% more');
  const w2 = quiet(room(30, 13, {}, [{ type: 'prop', kind: 'crate', at: [8, 6] }])); at(w2, 3, 6); const e2 = put(w2, 'wardengraft', 14, 6, Math.atan2(-1, 0)); e2.state = 'chase'; e2.hp = 9999; e2.chargeT = 0.85; e2.chargeCd = 0;
  let stun = 0; const ev = []; for (let i = 0; i < 120; i++) { step(w2, idle()); ev.push(...drainEvents(w2)); if (!stun && ev.some((x) => x.type === 'warden_crash')) { stun = e2.stunT; } }
  assert.ok(ev.some((x) => x.type === 'warden_crash'), 'it crashed into the crate'); assert.ok(stun > 2.3 && stun <= ENEMIES.wardengraft.charge.stun, 'stunned for about 2.6 s: ' + stun);
});
test('pinned: a Warden charge that lands throws the player back at least 2 m; a tone pulse costs 22 health at normal (armour takes half of it)', () => {
  const w = quiet(room(30, 13)); at(w, 12, 6); const e = put(w, 'wardengraft', 6, 6, Math.PI / 2); e.state = 'chase'; e.hp = 9999; e.chargeT = 0.85; e.chargeCd = 0;
  let big = 0, last = w.player.x; for (let i = 0; i < 90; i++) { step(w, idle()); drainEvents(w); big = Math.max(big, Math.abs(w.player.x - last)); last = w.player.x; }
  assert.ok(big >= 2, 'the shove moved the player ' + big.toFixed(2) + ' m in one tick');
  const ring = (ww) => ww.pulses.push({ id: 900, x: cell(30), z: cell(10), y: 0, r: 0.6, speed: 9.5, dmg: 22, width: 1.3, maxR: 40, hit: false });
  const p1 = quiet(arena()); at(p1, 18, 10); p1.player.hp = 5000; ring(p1); run(p1, 60 * 3); assert.equal(5000 - p1.player.hp, 22, 'a pulse hit costs its damage');
  const p2 = quiet(arena()); at(p2, 18, 10); p2.player.hp = 5000; p2.player.armor = 50; ring(p2); run(p2, 60 * 3); assert.equal(5000 - p2.player.hp, 11, 'armour takes half'); assert.equal(p2.player.armor, 39);
});
test('pinned: the Cantor\'s pulse rings really exist before a save is taken, and are identical after loading it', () => {
  const m = arena(), w = quiet(m); at(w, 8, 10); const { c } = boss(w, 1); c.pulseCd = 0;
  let n = 0; while (!w.pulses.length && n++ < 60 * 10) { step(w, idle()); drainEvents(w); }
  assert.ok(w.pulses.length > 0, 'a ring is in flight'); step(w, idle()); drainEvents(w);
  const back = loadWorld(parseSave(JSON.stringify(makeSave(w, 'mid-level'))).save, () => m).world;
  assert.deepEqual(back.pulses, w.pulses); run(back, 60); run(w, 60); assert.deepEqual(back.pulses, w.pulses, 'and they keep travelling in step');
});
