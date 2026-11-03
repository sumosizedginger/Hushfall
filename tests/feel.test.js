// PT-083 phase 3: every gun answers, every creature warns, a hit moves the body and a big enough blow bursts it. All drawn and sounded: the simulation only names what happened.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { WEAPONS, ENEMIES, WALL_SKINS, FLOOR_SKINS } from '../src/engine/defs.js';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { parseMap } from '../src/engine/mapformat.js';
import { damageEnemy } from '../src/engine/weapons.js';
import { surfaceAt, WALL_FAMILY, FLOOR_FAMILY, SURFACE_FAMILIES } from '../src/engine/surfaces.js';
import { GUN_FEEL, SURFACE_BURST, CASINGS, shotFeel, bursts, flinchAt, flinchStrength, fallTurn, FLINCH, GIBS } from '../src/render/feel.js';
import { GameView } from '../src/render/view.js';
import { soundsForEvent } from '../src/audio/events.js';
import { SFX as synthRecipes } from '../src/audio/synth.js';
import { texProxy, stubRenderer } from './stubs.js';
import { ROOT, flatSource } from './helpers.js';

const quay = () => parseMap(JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', 'C1E1M01.json'), 'utf8')));
const GUNS = Object.entries(WEAPONS)
  .filter(([, d]) => ['hitscan', 'projectile', 'arc'].includes(d.kind))
  .map(([id]) => id);
const viewOf = (look = {}) => {
  const map = quay(),
    w = createWorld(map, { seed: 1, difficulty: 'normal' }),
    view = new GameView(stubRenderer(), texProxy(), map, w);
  view.setSize(640, 360, 640);
  view.setLook({ outline: true, paint: true, fov: 70, brightness: 1, ...look });
  return { map, w, view };
};
const still = { move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false };

test('J6: every gun has its feel and its sound for fire, hit, kill and overkill', () => {
  assert.ok(GUNS.length >= 8);
  for (const g of GUNS) {
    const f = GUN_FEEL[g];
    assert.ok(f, g + ' has a row');
    for (const k of ['recoil', 'recover', 'flash', 'shake', 'shakeT', 'light', 'fire', 'muzzle']) assert.ok(Number.isFinite(f[k]) && f[k] > 0, `${g}.${k}`);
    if (f.casing) assert.ok(CASINGS[f.casing], g + ' casing');
    const sounds = soundsForEvent({ type: 'fire', weapon: g });
    assert.ok(sounds.length, g + ' fires with a sound');
    for (const s of sounds) assert.ok(synthRecipes[s.id], g + ': ' + s.id);
  }
  for (const id of soundsForEvent({ type: 'dmg', amount: 10, killed: false }).concat(soundsForEvent({ type: 'dmg', amount: 10, killed: true })))
    assert.ok(synthRecipes[id.id], id.id);
});

test('J6: each gun keeps a feel of its own: the heavy guns kick harder than the light ones and no two rows are the same', () => {
  assert.ok(
    GUN_FEEL.linethrower.recoil > GUN_FEEL.carbine.recoil &&
      GUN_FEEL.scattergun.recoil > GUN_FEEL.rivet.recoil &&
      GUN_FEEL.harpoon.shake > GUN_FEEL.rivet.shake,
  );
  assert.ok(shotFeel('arc', { charge: 1 }).recoil > shotFeel('arc').recoil, 'a charged lamp kicks harder');
  assert.equal(shotFeel('scattergun', { mod: 'doublebarrel' }).recoil, 2.6);
  assert.equal(shotFeel('rivet', { load: 'slag' }).fire, 0xff7a2a, 'a load colours the light');
});

test('J6: every creature that attacks warns of it: a windup or alert sound, and the view has a tell', async () => {
  const src = flatSource('src/audio/events.js');
  const { tellOf } = await import('../src/render/tells.js');
  assert.equal(typeof tellOf, 'function');
  const silent = [];
  for (const [kind, d] of Object.entries(ENEMIES)) {
    if (d.node || d.peaceful) continue;
    if (!(d.attack || d.ranged || d.lunge || d.charge || d.pulse || d.hive || d.bell || d.tears || d.snipe)) continue;
    if (!new RegExp(`\\b${kind}: '`).test(src)) silent.push(kind);
  }
  assert.deepEqual(silent, [], 'a creature that attacks with no sound of warning');
});

test('J4: every wall and floor skin of the game belongs to a surface family, and every family has a burst', () => {
  const walls = new Set(Object.values(WALL_SKINS)),
    floors = new Set(Object.values(FLOOR_SKINS).map((s) => s.tex));
  for (const t of walls) assert.ok(WALL_FAMILY[t], t + ' has no family');
  for (const t of floors) assert.ok(FLOOR_FAMILY[t], t + ' has no family');
  for (const f of SURFACE_FAMILIES) assert.ok(SURFACE_BURST[f], f);
});

test("J4: the sim names what a shot hit, and the view throws that family's chips", () => {
  const { map, w, view } = viewOf();
  let wall = null;
  for (let z = 0; z < map.h && !wall; z++) for (let x = 0; x < map.w && !wall; x++) if (map.kind(x, z) === 'wall') wall = [x, z];
  const fam = surfaceAt(map, (wall[0] + 0.5) * map.cell, 1, (wall[1] + 0.5) * map.cell);
  assert.ok(SURFACE_FAMILIES.includes(fam), fam);
  view.handleEvents([{ type: 'impact', x: 3, y: 1, z: 3, surface: 'metal' }]);
  assert.equal(view.impacts.chips.items.length, SURFACE_BURST.metal.n);
  view.impacts.update(w, 1 / 60);
  assert.equal(view.impacts.chips.mesh.count, SURFACE_BURST.metal.n);
  for (let i = 0; i < 120; i++) view.impacts.update(w, 1 / 60);
  assert.equal(view.impacts.chips.items.length, 0, 'sparks do not outlive their life');
  for (let i = 0; i < 400; i++) view.impacts.burst('stone', 3, 1, 3);
  assert.ok(view.impacts.chips.items.length <= view.impacts.chips.cap, 'the pool never grows past its cap');
  view.dispose();
});

test('J5: a shot throws its case, the case lands and rests, and a gun with no case throws none', () => {
  const { w, view } = viewOf();
  view.handleEvents([{ type: 'fire', weapon: 'carbine' }]);
  view.render(w, 0, 1 / 60);
  assert.equal(view.impacts.cases.items.length, 1, 'a carbine throws a case');
  const c = view.impacts.cases.items[0];
  for (let i = 0; i < 120; i++) view.render(w, 0, 1 / 60);
  assert.ok(c.still, 'it comes to rest');
  view.handleEvents([{ type: 'fire', weapon: 'flare' }]);
  view.render(w, 0, 1 / 60);
  assert.equal(view.impacts.cases.items.length, 1, 'a flare has no case');
  view.handleEvents([{ type: 'fire', weapon: 'scattergun' }]);
  view.render(w, 0, 1 / 60);
  assert.equal(view.impacts.cases.items.length, 1, 'a shell leaves with the pump, not with the shot');
  for (let i = 0; i < 40; i++) view.render(w, 0, 1 / 60);
  assert.equal(view.impacts.cases.items.length, 2, 'there it goes');
  view.dispose();
});

test('J2: a hit flicks the body away from the blow, by what it took, and is gone within a third of a second', () => {
  assert.equal(flinchAt(-1, 0.2), 0);
  assert.ok(flinchAt(FLINCH.rise, 0.2) > 0.19, 'at full flick after the rise');
  assert.equal(flinchAt(FLINCH.fall + 0.01, 0.2), 0, 'and gone');
  assert.ok(flinchStrength(40, 45) > flinchStrength(5, 45), 'a bigger blow flicks further');
  assert.ok(flinchStrength(4000, 45) <= FLINCH.max, 'never past the limit');
  const { w, view } = viewOf(),
    e = w.enemies.find((q) => q.kind === 'tollbearer');
  w.player.x = e.x;
  w.player.z = e.z - 5;
  e.yaw = Math.PI; // facing the player: the blow pushes it back (-x lean)
  e.state = 'chase';
  view.beforeStep(w);
  step(w, still);
  view.handleEvents(drainEvents(w));
  view.render(w, 0, 1 / 60);
  const v = view.enemyViews.get(e.id),
    before = v.rig.rotation.x;
  view.handleEvents([{ type: 'dmg', id: e.id, amount: 30, killed: false }]);
  for (let i = 0; i < 4; i++) view.render(w, 0, 1 / 60);
  const during = v.rig.rotation.x;
  assert.ok(during < before - 0.02, `it leans back: ${before} -> ${during}`);
  for (let i = 0; i < 30; i++) view.render(w, 0, 1 / 60);
  assert.ok(Math.abs(v.rig.rotation.x - before) < 0.02, 'and comes back');
  view.dispose();
});

test('J3: a blow past the threshold bursts an ordinary body; never a boss, a node, the innocent, or at reduced gore; a small kill leaves it whole', () => {
  const toll = ENEMIES.tollbearer;
  assert.equal(bursts({ weapon: 'linethrower', over: 1.2, def: toll }), true);
  assert.equal(bursts({ weapon: 'flare', over: 0.1, def: toll }), false, 'only just dead');
  assert.equal(bursts({ weapon: 'rivet', over: 0.1, def: toll }), false, 'the rivets never do it by a little');
  assert.equal(bursts({ weapon: 'rivet', over: GIBS.anything, def: toll }), true);
  assert.equal(bursts({ weapon: 'linethrower', over: 5, def: toll, gore: 'reduced' }), false, 'the setting');
  for (const k of ['cantor', 'vaelfolk', 'seal']) assert.equal(bursts({ weapon: 'linethrower', over: 5, def: ENEMIES[k] }), false, k);
});

test('J3: the sim says how far past dead a kill went; the body bursts, the view holds no whole corpse, parts fly and land; a raised body is whole again', () => {
  const { w, view } = viewOf(),
    e = w.enemies.find((q) => q.kind === 'tollbearer');
  view.beforeStep(w);
  step(w, still);
  drainEvents(w);
  view.render(w, 0, 1 / 60);
  damageEnemy(w, e, 200, { by: { weapon: 'linethrower', atk: 1 } });
  const ev = drainEvents(w),
    died = ev.find((x) => x.type === 'enemy_died');
  assert.ok(died.over > 3, 'over: ' + died.over);
  view.handleEvents(ev);
  const v = view.enemyViews.get(e.id);
  assert.equal(v.gibbed, true);
  assert.ok(view.impacts.parts.length > 3 && view.impacts.parts.length <= GIBS.maxParts, 'parts: ' + view.impacts.parts.length);
  assert.ok(view.impacts.chips.items.length > 10, 'and a spray');
  view.render(w, 0, 1 / 60);
  assert.equal(v.root.visible, false, 'the corpse is gone');
  const y0 = view.impacts.parts[0].m.position.y;
  for (let i = 0; i < 90; i++) view.render(w, 0, 1 / 60);
  assert.ok(view.impacts.parts.some((p) => p.rest) || view.impacts.parts[0].m.position.y !== y0, 'they fly');
  view.handleEvents([{ type: 'enemy_revived', id: e.id, kind: e.kind, x: e.x, z: e.z }]);
  e.state = 'chase';
  e.hp = 20;
  e.dead = 0;
  view.render(w, 0, 1 / 60);
  assert.equal(v.gibbed, false);
  assert.equal(v.root.visible, true, 'a raised body stands');
  view.dispose();
});

test('J3: a body falls away from the blow: the rig turns so that its backwards topple goes where the blow was going', () => {
  for (const yaw of [0, 1, -2, 3]) {
    for (const a of [0, 0.7, 2, -1.5]) {
      const dx = Math.sin(a),
        dz = Math.cos(a),
        th = fallTurn(dx, dz, yaw);
      // the rig's backward (0, 0, -1), turned by th about y and then by the root's yaw
      const lx = -Math.sin(th),
        lz = -Math.cos(th),
        wx = Math.cos(yaw) * lx + Math.sin(yaw) * lz,
        wz = -Math.sin(yaw) * lx + Math.cos(yaw) * lz;
      assert.ok(Math.hypot(wx - dx, wz - dz) < 1e-9, `yaw ${yaw} blow ${a}`);
    }
  }
});

test('J1: the marks and the ticks: a kill and a head-zone hit have their own mark, the setting turns off both', () => {
  const ui = flatSource('src/game/ui.js'),
    html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'),
    audio = flatSource('src/audio/engine.js');
  assert.ok(ui.includes("e.type === 'headshot'") && ui.includes("'crit'"));
  for (const k of ['#hitmark.kill', '#hitmark.crit', 'body.no-hitmarks #hitmark']) assert.ok(html.includes(k), k);
  assert.ok(audio.includes("e.type === 'dmg' && this.settings?.hitMarks === false"));
  assert.equal(soundsForEvent({ type: 'dmg', amount: 10, killed: true })[0].id, 'kill_tick');
  assert.equal(soundsForEvent({ type: 'dmg', amount: 10, killed: false })[0].pos, undefined, 'it does not fade with distance');
});
