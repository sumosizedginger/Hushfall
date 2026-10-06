// Visible body vs gameplay hit location. The sim hits an enemy inside a cylinder (radius, height) standing on e.y; the renderer draws a rig.
// This test places each rig exactly as the view does (view.js: root at the sim's x, y, z and yaw), measures where its body really is in
// world space, then fires the SIM'S OWN hitscan (the rivet driver, one pellet, sights up) at points on that drawn body from 6 m away on the
// same floor. A body drawn at the wrong height (PT-001: world 0 on a 3 m floor) is shot over/under; a body that shifted sideways is missed.
// What is NOT asserted: the head. Several rigs are taller than their hit cylinder (Cantor ~4.8 m drawn vs 3.2 m hit): that is measured and
// reported by the browser census (`hitVolume` in validation/render-ground.json), not decided here.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeTollbearer, makeGaunt } from '../src/render/models.js';
import { makeBellNodeEnemy } from '../src/render/models_g2.js';
import { makeDroneGill, makeFeeder, makeGraftMother } from '../src/render/models_e2.js';
import { createWorld, step, spawnEnemy } from '../src/engine/world.js';
import { ENEMIES, PLAYER } from '../src/engine/defs.js';
import { parseMap } from '../src/engine/mapformat.js';

const RIGS = {
  tollbearer: () => makeTollbearer(null), bellhand: () => makeTollbearer(null, 'bellhand'), sexton: () => makeTollbearer(null, 'sexton'), wardengraft: () => makeTollbearer(null, 'warden'),
  cantor: () => makeTollbearer(null, 'cantor'), gaunt: () => makeGaunt(null), bellnode: () => makeBellNodeEnemy(),
  gill: () => makeDroneGill(null), feeder: () => makeFeeder(null), graftmother: () => makeGraftMother(null),        // Gate 4 batch 2: the first flyer, the Graft-Mother's feeder and the boss
};
// one big open room; the east half stands 3 m up (height char '6' = 6 x 0.5 m), like the M02 gallery
const COLS = 40, ROWS = 20;
const arena = () => parseMap({
  format: 1, id: 'HV', version: 1, name: 'Hit volume', ceilingHeight: 14,
  grid: Array.from({ length: ROWS }, (_, z) => (z === 0 || z === ROWS - 1 ? '#'.repeat(COLS) : '#' + '.'.repeat(COLS - 2) + '#')),
  heights: Array.from({ length: ROWS }, () => '.'.repeat(COLS / 2) + '6'.repeat(COLS / 2)),
  doors: [], entities: [{ type: 'player', at: [2, 2] }, { type: 'exit', at: [COLS - 3, ROWS - 3] }],
});
const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });
const cellC = (map, cx, cz) => [(cx + 0.5) * map.cell, (cz + 0.5) * map.cell];

/** the rig placed the way GameView places it, posed standing, and its exact world-space bounds */
function drawn(kind, e) {
  const v = RIGS[kind](); v.root.position.set(e.x, e.y, e.z); v.root.rotation.y = e.yaw; v.pose({ t: 1, walk: 0, phase: 0, attack: 0, lunge: 0, dead: 0, flash: 0 });
  v.root.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(v.root, true); return { min: b.min, max: b.max };
}
/** fire one rivet from `dist` m west of the enemy at world point (x, y, z); returns the damage the sim applied to the enemy */
function shootAt(kind, floorCx, [fx, fy], seed = 1) {
  const map = arena(), w = createWorld(map, { seed }); w.enemies.length = 0;
  const [ex, ez] = cellC(map, floorCx, 10), e = spawnEnemy(w, kind, ex, ez, -Math.PI / 2); e.state = 'idle'; e.hp = 100000;
  const body = drawn(kind, e), y = body.min.y + fy * (body.max.y - body.min.y), x = e.x;
  Object.assign(w.player, { weapons: ['flare', 'rivet'], weapon: 'rivet', switchT: 0, x: e.x - 6, z: e.z, y: e.y });
  w.player.ammo.rivet = 20; w.player.yaw = -Math.PI / 2 + Math.PI;             // face +x: yaw = atan2(-(x - px), -(z - pz)) with the target east of the player
  w.player.yaw = Math.atan2(-(x - w.player.x), -(e.z - w.player.z)); w.player.pitch = Math.atan2(y - (w.player.y + PLAYER.eye), 6);
  for (let i = 0; i < 20; i++) step(w, idle({ aim: true }));                   // sights up: the tightest cone
  const before = e.hp; step(w, idle({ aim: true, fire: true })); return { dmg: before - e.hp, y, e, body };
}

test('hitscan aimed at the DRAWN lower body (10% / 30% / 50% of its rendered height) registers on every enemy kind, on a flat floor and on a 3 m floor', () => {
  const bad = [];
  for (const kind of Object.keys(RIGS)) for (const [floorName, cx] of [['flat floor', 12], ['3 m floor', 28]]) for (const f of [0.1, 0.3, 0.5]) {
    const { dmg, y, e, body } = shootAt(kind, cx, [0, f]);
    if (!(dmg > 0)) bad.push(`${kind} on the ${floorName} (sim y ${e.y}): a shot at the drawn body ${f * 100}% up (world y ${y.toFixed(2)}, drawn ${body.min.y.toFixed(2)}..${body.max.y.toFixed(2)}, hit volume ${e.y}..${(e.y + ENEMIES[kind].height).toFixed(2)}) did nothing`);
  }
  assert.equal(bad.length, 0, bad.join(' | '));
});

test('the drawn body stands on the hit volume: the sim axis passes through it, its centre is within a hit diameter, its base is on e.y, its middle is inside the hit height (every kind, flat and raised)', () => {
  const bad = [];
  for (const kind of Object.keys(RIGS)) for (const cx of [12, 28]) {
    const map = arena(), w = createWorld(map, { seed: 1 }); w.enemies.length = 0; const [ex, ez] = cellC(map, cx, 10), e = spawnEnemy(w, kind, ex, ez, 1.1), d = drawn(kind, e), def = ENEMIES[kind];
    const cxm = (d.min.x + d.max.x) / 2, czm = (d.min.z + d.max.z) / 2, mid = (d.min.y + d.max.y) / 2;
    // a hunched Gaunt reaches forward, so its drawn centre sits ~0.38 m from the axis the hit cylinder is centred on: the axis must be INSIDE the drawn body, the centre within a diameter
    if (!(d.min.x <= e.x && e.x <= d.max.x && d.min.z <= e.z && e.z <= d.max.z)) bad.push(`${kind}: the sim position (${e.x.toFixed(2)}, ${e.z.toFixed(2)}) is outside the drawn body's footprint`);
    if (Math.hypot(cxm - e.x, czm - e.z) > 2 * def.radius) bad.push(`${kind}: drawn body centre is ${Math.hypot(cxm - e.x, czm - e.z).toFixed(2)} m off the sim position (hit diameter ${2 * def.radius})`);
    const base = e.y + (def.hover ?? 0);                                    // a flyer's body starts `hover` above its floor (it bobs a few cm, hence the wider tolerance)
    if (Math.abs(d.min.y - base) > (def.hover ? 0.08 : 0.03)) bad.push(`${kind} on ${e.y} m: drawn base ${d.min.y.toFixed(3)} is not on the sim's ground${def.hover ? ' + hover ' + def.hover : ''}`);
    if (!(mid > base && mid < base + def.height)) bad.push(`${kind} on ${e.y} m: drawn middle ${mid.toFixed(2)} is outside the hit volume ${base}..${base + def.height}`);
  }
  assert.equal(bad.length, 0, bad.join(' | '));
});
