// PT-016: the dev-only weapons range. Targets that stand on their posts (inert / turn / fixed), a player who cannot die, run dry or stay hurt, the readout, and the guard that keeps all of it out of the campaign.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseMap, validateMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, damageEnemy } from '../src/engine/world.js';
import { RANGE, ENEMIES, WEAPONS } from '../src/engine/defs.js';
import { ammoCap } from '../src/engine/progress.js';
import { crosshairTarget, RangeMeter } from '../src/game/rangemeter.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });
const W = (n) => '#'.repeat(n);
const grid = [W(34), '#' + '.'.repeat(32) + '#', '#' + '.'.repeat(32) + '#', '#' + '.'.repeat(32) + '#', '#' + '.'.repeat(32) + '#', W(34)];
const EAST = Math.PI / 2, WEST = -Math.PI / 2;
/** a range world: `ents` are enemy entities placed on cell [x, 2] (world z = 5), the player at world (px, 5) */
function range(ents, { px = 40, armor = 0, hp = 100, range: isRange = true } = {}) {
  const src = { format: 1, id: 'K1', version: 1, name: 'Kit', ...(isRange ? { range: true } : {}), grid, doors: [], secrets: [], entities: [{ type: 'player', at: [1, 1], facing: 'east' }, { type: 'exit', at: [31, 1] }, ...ents.map(({ x, z = 2, ...e }) => ({ type: 'enemy', at: [x, z], ...e }))] };
  const w = createWorld(parseMap(src), { seed: 1, carry: { hp, armor, ammo: { flare: 8 }, weapons: ['flare'] } });
  Object.assign(w.player, { x: px, z: 5, yaw: 0, weapon: 'flare', switchT: 0 });
  return w;
}
const run = (w, seconds, cmd = idle()) => { for (let i = 0; i < Math.round(seconds * 60); i++) { step(w, cmd); drainEvents(w); } };
const post = (e) => Math.hypot(e.x - e.post.x, e.z - e.post.z);

test('the range map is a dev map: it is NOT in maps/, it loads, and it holds every kind of target and the loadout for every weapon', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'maps', 'RANGE.json')), false, 'never in the campaign folder');
  const src = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps-dev', 'RANGE.json'), 'utf8')), m = parseMap(src);
  assert.equal(m.range, true); assert.ok(validateMap(src).ok);
  const ens = src.entities.filter((e) => e.type === 'enemy'), kinds = new Set(ens.map((e) => e.kind));
  for (const k of Object.keys(ENEMIES)) assert.ok(kinds.has(k), 'a ' + k + ' stands in the range');
  for (const h of RANGE.holdModes) assert.ok(ens.some((e) => e.hold === h), 'a target of kind ' + h);
  assert.ok(ens.some((e) => !e.hold && e.group === 'pen'), 'the pen has live creatures');
  const w = createWorld(m, { seed: 1 }); assert.deepEqual(w.player.weapons.sort(), Object.keys(WEAPONS).filter((id) => id !== 'fists').sort(), 'every weapon from the start (the fists are always owned)');
});
test('hold / hp / sight belong to a range map only: a campaign map that uses them is invalid', () => {
  const mk = (extra, isRange) => ({ format: 1, id: 'K1', version: 1, name: 'Kit', ...(isRange ? { range: true } : {}), grid, doors: [], secrets: [], entities: [{ type: 'player', at: [1, 1] }, { type: 'exit', at: [31, 1] }, { type: 'enemy', kind: 'tollbearer', at: [10, 2], ...extra }] });
  assert.ok(!validateMap(mk({ hold: 'inert' }, false)).ok, 'hold outside a range'); assert.ok(!validateMap(mk({ hp: 50 }, false)).ok, 'hp outside a range'); assert.ok(!validateMap(mk({ sight: 6 }, false)).ok, 'sight outside a range');
  assert.ok(validateMap(mk({ hold: 'inert', hp: 5000, sight: 6 }, true)).ok); assert.ok(!validateMap(mk({ hold: 'sleepwalk' }, true)).ok, 'an unknown hold mode'); assert.ok(!validateMap(mk({ hp: -1 }, true)).ok);
  const campaign = createWorld(parseMap(mk({}, false)), { seed: 1 }); assert.equal(campaign.range, undefined); step(campaign, idle()); assert.equal(campaign.range, undefined, 'a campaign world never grows range state');
});

test('an inert target takes every hit and never fights back; it heals when left alone', () => {
  const w = range([{ kind: 'tollbearer', x: 10, facing: EAST, hold: 'inert', hp: 5000 }], { px: 22.6 }), e = w.enemies[0];
  assert.equal(e.state, 'chase', 'always awake'); run(w, 3); assert.equal(w.stats.damageTaken, 0, 'it never swings'); assert.equal(post(e), 0, 'it never moves'); assert.equal(e.attackT, -1);
  damageEnemy(w, e, 100); assert.equal(e.hp, 4900); run(w, RANGE.healAfter - 0.2); assert.equal(e.hp, 4900, 'not yet'); run(w, 0.5); assert.equal(e.hp, 5000, 'healed after ' + RANGE.healAfter + ' s unhurt');
  damageEnemy(w, e, 100); run(w, 2); damageEnemy(w, e, 100); run(w, 2); assert.equal(e.hp, 4800, 'being hit again starts the wait again');
});
test('a target that is killed stands up again at its post after a few seconds, and the kill count follows', () => {
  const w = range([{ kind: 'tollbearer', x: 10, facing: EAST, hold: 'inert' }], { px: 30 }), e = w.enemies[0], ev = [];
  damageEnemy(w, e, 1000); assert.equal(e.state, 'dead'); assert.equal(w.stats.kills, 1);
  for (let i = 0; i < Math.round((RANGE.respawnAfter - 0.2) * 60); i++) step(w, idle()); assert.equal(e.state, 'dead', 'still down');
  for (let i = 0; i < 40; i++) { step(w, idle()); ev.push(...drainEvents(w)); }
  assert.equal(e.state, 'chase'); assert.equal(e.hp, ENEMIES.tollbearer.hp); assert.equal(e.dead, 0); assert.equal(w.stats.kills, 0); assert.ok(ev.some((x) => x.type === 'enemy_revived'));
});
test('a "turn" target faces you and swings; a "fixed" one never turns, so you take nothing from its side or back and a blow from its front', () => {
  const turner = range([{ kind: 'tollbearer', x: 10, facing: WEST, hold: 'turn' }], { px: 22.6 }), e = turner.enemies[0];
  run(turner, 3); assert.ok(turner.stats.damageTaken > 0, 'it swung at you'); assert.ok(Math.abs(e.yaw - EAST) < 0.2, 'turned to face you'); assert.equal(post(e), 0, 'and stayed on its post');
  const dmg = (px, pz) => { const w = range([{ kind: 'tollbearer', x: 10, facing: EAST, hold: 'fixed' }], { px }); w.player.z = pz; run(w, 3); return [w.stats.damageTaken, w.enemies[0].yaw]; };
  const front = dmg(22.6, 5), behind = dmg(19.4, 5), side = dmg(21, 6.6);
  assert.ok(front[0] > 0, 'in front: hit'); assert.equal(behind[0], 0, 'behind it: nothing'); assert.equal(side[0], 0, 'beside it: nothing');
  for (const r of [front, behind, side]) assert.ok(Math.abs(r[1] - EAST) < 1e-9, 'a fixed target never turns');
});
test('a target\'s "sight" decides when it notices you: a swinger with a short sight ignores a player across the hall', () => {
  const far = range([{ kind: 'tollbearer', x: 10, facing: WEST, hold: 'turn', sight: 6 }], { px: 29 }), e = far.enemies[0]; run(far, 3); assert.equal(e.yaw, WEST, 'it did not turn'); assert.equal(e.attackT, -1);
  const near = range([{ kind: 'tollbearer', x: 10, facing: WEST, hold: 'turn', sight: 6 }], { px: 25 }); run(near, 1); assert.ok(Math.abs(near.enemies[0].yaw - WEST) > 1, 'inside its sight it turns');
});
test('a Gaunt that lunges is brought back to its post; a Warden that charges too', () => {
  const w = range([{ kind: 'gaunt', x: 10, facing: EAST, hold: 'turn' }], { px: 26 }), e = w.enemies[0]; let away = 0, back = false;
  for (let i = 0; i < 150; i++) { step(w, idle()); drainEvents(w); const d = post(e); away = Math.max(away, d); if (away > 1 && d < 0.3) back = true; }
  assert.ok(away > 1.5, 'it lunged off its post (' + away.toFixed(2) + ' m)'); assert.ok(back, 'and walked back');
  const ww = range([{ kind: 'wardengraft', x: 10, facing: EAST, hold: 'turn' }], { px: 28 }), we = ww.enemies[0]; let far = 0, home = false; for (let i = 0; i < 60 * 9; i++) { step(ww, idle()); drainEvents(ww); far = Math.max(far, post(we)); if (far > 3 && post(we) < 0.3) home = true; }
  assert.ok(far > 3, 'the Warden charged (' + far.toFixed(1) + ' m)'); assert.ok(home, 'and walked home again');
});

test('the range protects the player: no death, a heal after a quiet moment, ammunition back after a pause, at once when the gun in hand is empty', () => {
  const w = range([], { px: 20, hp: 3 }); w.stats.damageTaken += 0; w.player.hp = -50; step(w, idle()); assert.equal(w.status, 'playing', 'a blow past zero does not kill'); assert.ok(w.player.hp >= 1);
  w.player.hp = 40; w.player.armor = 0; run(w, RANGE.playerHealAfter + 0.3); assert.equal(w.player.hp, 100, 'healed'); assert.ok(w.player.armor > 0, 'and armoured');
  w.player.ammo = { flare: 3, shell: 0, rivet: 5, bolt: 1, cell: 9 }; run(w, RANGE.refillAfter + 0.3); for (const k of ['flare', 'shell', 'rivet', 'bolt', 'cell']) assert.equal(w.player.ammo[k], ammoCap(k, w.upgrades), k + ' refilled');
  w.player.weapon = 'scattergun'; w.player.ammo.shell = 0; w.range.fireT = 0; step(w, idle()); assert.equal(w.player.ammo.shell, ammoCap('shell', w.upgrades), 'an empty gun is refilled at once');
  const plain = range([], { px: 20, range: false }); plain.player.weapon = 'scattergun'; plain.player.ammo = { flare: 3, shell: 0 }; run(plain, 3); assert.equal(plain.player.ammo.shell, 0, 'outside the range nothing refills');
});

test('the readout: the target under the crosshair, the damage a hit did, the burst, what you took', () => {
  const w = range([{ kind: 'tollbearer', x: 10, facing: WEST, hold: 'inert', hp: 5000 }, { kind: 'gaunt', x: 14, z: 4, facing: WEST, hold: 'fixed' }], { px: 40 }), e = w.enemies[0], g = w.enemies[1], m = new RangeMeter();
  const look = (target) => { const dx = target.x - w.player.x, dz = target.z - w.player.z, h = Math.hypot(dx, dz); w.player.yaw = Math.atan2(dx / h, dz / h) + Math.PI; w.player.pitch = Math.atan2((ENEMIES[target.kind].height / 2) - 1.6, h); };      // the player's forward is (-sin yaw, -cos yaw)
  look(e); assert.equal(crosshairTarget(w), e, 'the Tollbearer is under the crosshair'); look(g); assert.equal(crosshairTarget(w), g, 'then the Gaunt'); w.player.yaw += 0.6; assert.equal(crosshairTarget(w), null, 'nothing within the cone');
  look(g); m.update(w); damageEnemy(w, g, 10); w.time += 0.1; m.update(w);
  const txt = m.lines(w).join('\n'); assert.match(txt, /Gaunt/); assert.match(txt, /never turns/); assert.match(txt, /LAST HIT\s+10\.0/); assert.match(txt, /BURST\s+10 in/);
  damageEnemy(w, e, 20); damageEnemy(w, g, 5); w.time += 0.1; m.update(w); assert.match(m.lines(w).join('\n'), /LAST HIT\s+25\.0 on 2 targets/);
  m.events([{ type: 'hurt', amount: 18 }, { type: 'block' }]); assert.match(m.lines(w).join('\n'), /TAKEN\s+last 18\s+·\s+total 18\s+·\s+blocked/);
});

// ---- the real map -------------------------------------------------------------------------------------------------------------------
import { activateSwitch } from '../src/engine/script.js';
const REAL = () => parseMap(JSON.parse(fs.readFileSync(path.join(ROOT, 'maps-dev', 'RANGE.json'), 'utf8')));
test('on the real range every weapon lands on a sponge, and the harpoon pins one against the wall behind it', () => {
  for (const id of Object.keys(WEAPONS)) {
    const w = createWorld(REAL(), { seed: 1 }), e = w.enemies.find((x) => x.hold === 'inert' && x.kind === 'tollbearer' && x.post.z < 14), melee = WEAPONS[id].kind === 'melee';
    Object.assign(w.player, { x: e.x, z: e.z + (melee ? 1.7 : 6), weapon: id, switchT: 0, yaw: 0, pitch: melee ? 0 : Math.atan2(1.125 - 1.6, 6) });
    const hp0 = e.hp; for (let i = 0; i < 150; i++) { step(w, idle({ fire: i < 90 })); drainEvents(w); }      // held, then released (the lamp and the fists fire on release)
    assert.ok(e.hp < hp0, id + ' hurt the sponge (' + (hp0 - e.hp).toFixed(1) + ')');
    if (id === 'harpoon') assert.ok((e.stunT || 0) > 0 || e.hurtT < 3, 'the harpoon pinned it');
  }
  const w = createWorld(REAL(), { seed: 1 }), e = w.enemies.find((x) => x.hold === 'inert' && x.kind === 'tollbearer' && x.post.z < 14), ev = [];
  Object.assign(w.player, { x: e.x, z: e.z + 6, weapon: 'harpoon', switchT: 0, yaw: 0, pitch: Math.atan2(1.125 - 1.6, 6) }); for (let i = 0; i < 30; i++) { step(w, idle({ fire: true })); ev.push(...drainEvents(w)); }
  assert.ok(ev.some((x) => x.type === 'pin'), 'a bolt into a target a metre from the north wall pins it');
});
test('on the real range the pen sleeps until the lever, then opens and wakes; the exit just ends the visit', () => {
  const m = REAL(), w = createWorld(m, { seed: 1 }), pen = w.enemies.filter((e) => e.group === 'pen');
  assert.equal(pen.length, 9); assert.ok(pen.every((e) => e.state === 'idle')); run(w, 5); assert.ok(pen.every((e) => e.state === 'idle'), 'asleep behind the door');
  activateSwitch(w, m.switches.find((s) => s.id === 'pen')); assert.ok(pen.every((e) => e.state === 'chase'), 'awake'); assert.equal(w.doors.find((d) => d.cx === 46 && d.cz === 16).target, 1, 'and the door is open');
  assert.equal(m.exits.length, 1); assert.equal(w.exitLocked[m.exits[0].id], false, 'the exit is open (the shell sends a range visit back to the title)');
});
test('a long idle on the real range: nothing moves that should not, nobody is hurt, no number goes bad', () => {
  const w = createWorld(REAL(), { seed: 1 }); run(w, 20);
  assert.equal(w.stats.damageTaken, 0); assert.equal(w.status, 'playing');
  for (const e of w.enemies) { assert.ok(Number.isFinite(e.x) && Number.isFinite(e.z) && Number.isFinite(e.hp) && Number.isFinite(e.yaw), e.kind + ' stays finite'); if (e.hold === 'inert') assert.equal(post(e), 0, e.kind + ' inert stays'); }
  const sponge = w.enemies.filter((e) => e.hold === 'inert' && e.hp === 5000).length; assert.ok(sponge >= 7);
});
test('the readout names the near body the line of sight runs through, even when a far one is nearer the middle of the crosshair (the swinger in your face, not the sponge behind it)', () => {
  const w = range([{ kind: 'tollbearer', x: 5, facing: WEST, hold: 'inert', hp: 5000 }, { kind: 'tollbearer', x: 10, facing: WEST, hold: 'turn' }], { px: 22.6 }); w.player.yaw = EAST; w.player.pitch = 0;      // forward is (-sin yaw, -cos yaw): EAST looks along -x
  assert.equal(crosshairTarget(w), w.enemies[1], 'the Tollbearer a metre and a half away, though the eye is above its middle');
  w.enemies[1].hp = 0; w.enemies[1].state = 'dead'; assert.equal(crosshairTarget(w), w.enemies[0], 'and with it down, the one behind');
});
