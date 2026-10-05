// PT-005 / owner decision 2026-10-05: "the hit box should match the enemy". The fairness rule (src/engine/hitvolume.js) is measured on the REAL rigs here:
//   1. HEIGHT: the sim's hit height is the drawn height (+-0.10 m). A shot at the head registers; a shot just above it does not.
//   2. WIDTH: the hit cylinder (radius + the pellet's thickness, centred `hitForward` ahead of the feet) covers 85% of the standing rig's vertices
//      horizontally, and is no more than 0.15 m wider than that needs (no phantom hits in empty air).
//   3. A flare that strikes the head of a tall enemy hurts it like a flare that strikes its torso (splash is measured from where the blast is on the body).
// Arms, weapons and trailing cloth that stick out past the torso are deliberately not hittable. The standing pose is the reference; attack poses move limbs, not the mass.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeTollbearer, makeGaunt } from '../src/render/models.js';
import { makeBellNodeEnemy } from '../src/render/models_g2.js';
import { createWorld, step, spawnEnemy } from '../src/engine/world.js';
import { ENEMIES, PLAYER } from '../src/engine/defs.js';
import { hitCylinder, insideHit } from '../src/engine/hitvolume.js';
import { parseMap } from '../src/engine/mapformat.js';

const RIGS = {
  tollbearer: () => makeTollbearer(null), bellhand: () => makeTollbearer(null, 'bellhand'), sexton: () => makeTollbearer(null, 'sexton'), wardengraft: () => makeTollbearer(null, 'warden'),
  cantor: () => makeTollbearer(null, 'cantor'), gaunt: () => makeGaunt(null), bellnode: () => makeBellNodeEnemy(),
};
const STAND = { t: 1, walk: 0, phase: 0, attack: 0, lunge: 0, dead: 0, flash: 0 };
const COLS = 40, ROWS = 20;
const arena = () => parseMap({
  format: 1, id: 'HVF', version: 1, name: 'Hit volume fairness', ceilingHeight: 14,
  grid: Array.from({ length: ROWS }, (_, z) => (z === 0 || z === ROWS - 1 ? '#'.repeat(COLS) : '#' + '.'.repeat(COLS - 2) + '#')),
  heights: Array.from({ length: ROWS }, () => '.'.repeat(COLS / 2) + '6'.repeat(COLS / 2)),        // the east half stands 3 m up
  doors: [], entities: [{ type: 'player', at: [2, 2] }, { type: 'exit', at: [COLS - 3, ROWS - 3] }],
});
const FLOORS = [['flat floor', 12], ['3 m floor', 28]];
const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });
const cellC = (map, cx, cz) => [(cx + 0.5) * map.cell, (cz + 0.5) * map.cell];
/** a world with exactly one enemy, facing west (toward the player the tests put 6 m to its west) */
function placed(kind, cx, seed = 1) {
  const map = arena(), w = createWorld(map, { seed }); w.enemies.length = 0;
  const [ex, ez] = cellC(map, cx, 10), e = spawnEnemy(w, kind, ex, ez, -Math.PI / 2); e.state = 'idle'; e.hp = 1e6;
  return { w, e };
}
/** every vertex of the rig, placed exactly as GameView places it (root at the sim's x, y, z and yaw), standing */
function vertsOf(kind, e) {
  const v = RIGS[kind](); v.root.position.set(e.x, e.y, e.z); v.root.rotation.y = e.yaw; v.pose(STAND); v.root.updateMatrixWorld(true);
  const out = [], t = new THREE.Vector3();
  v.root.traverse((o) => { const pos = o.isMesh && o.geometry?.attributes?.position; if (!pos) return; for (let i = 0; i < pos.count; i++) { t.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); out.push([t.x, t.y, t.z]); } });
  return out;
}
const drawnTop = (vs) => Math.max(...vs.map((p) => p[1]));
const drawnBase = (vs) => Math.min(...vs.map((p) => p[1]));
/** one rivet from 6 m west, aimed `above` metres above the enemy's feet at the point `dist` m along the line (6 = the enemy's axis); returns the damage the sim applied */
function shoot(kind, cx, above, dist = 6) {
  const { w, e } = placed(kind, cx), y = e.y + above;
  Object.assign(w.player, { weapons: ['flare', 'rivet'], weapon: 'rivet', switchT: 0, x: e.x - 6, z: e.z, y: e.y }); w.player.ammo.rivet = 20;
  w.player.yaw = Math.atan2(-(e.x - w.player.x), -(e.z - w.player.z)); w.player.pitch = Math.atan2(y - (w.player.y + PLAYER.eye), dist);
  for (let i = 0; i < 20; i++) step(w, idle({ aim: true }));                      // sights up: the tightest cone
  const before = e.hp; step(w, idle({ aim: true, fire: true })); return before - e.hp;
}

test('HEIGHT: a shot at the drawn head (85%, 95%, 99% of the rendered height) registers on every enemy kind, on a flat floor and on a 3 m floor', () => {
  const bad = [];
  for (const kind of Object.keys(RIGS)) for (const [name, cx] of FLOORS) {
    const { e } = placed(kind, cx), vs = vertsOf(kind, e), h = drawnTop(vs) - drawnBase(vs);
    for (const f of [0.85, 0.95, 0.99]) if (!(shoot(kind, cx, f * h) > 0)) bad.push(`${kind} on the ${name}: a shot ${(f * 100)}% up the DRAWN body (${(f * h).toFixed(2)} m of ${h.toFixed(2)} m) passes over it (hit volume is ${ENEMIES[kind].height} m tall)`);
  }
  assert.equal(bad.length, 0, bad.join(' | '));
});

test('HEIGHT: a shot 0.2 m above the drawn head does not register (no phantom body above the enemy)', () => {
  const bad = [];
  for (const kind of Object.keys(RIGS)) for (const [name, cx] of FLOORS) {
    const { e } = placed(kind, cx), vs = vertsOf(kind, e), top = drawnTop(vs) - e.y;
    const c = hitCylinder(e), nearEdge = 6 - (e.x - c.x) - (c.r + 0.05);      // horizontal distance from the shooter to the cylinder's near edge: the ray must clear the top THERE, not just over the axis
    if (shoot(kind, cx, top + 0.2, nearEdge) > 0) bad.push(`${kind} on the ${name}: a shot 0.2 m above the drawn head (${(top + 0.2).toFixed(2)} m) still hits (hit volume ${ENEMIES[kind].height} m, drawn ${top.toFixed(2)} m)`);
  }
  assert.equal(bad.length, 0, bad.join(' | '));
});

test('HEIGHT: every enemy kind\'s hit height equals its drawn height within 0.10 m', () => {
  const bad = [];
  for (const kind of Object.keys(RIGS)) {
    const { e } = placed(kind, 12), vs = vertsOf(kind, e), h = drawnTop(vs) - drawnBase(vs), hit = ENEMIES[kind].height;
    if (Math.abs(hit - h) > 0.10) bad.push(`${kind}: drawn ${h.toFixed(3)} m, hit volume ${hit} m (off by ${(hit - h).toFixed(3)})`);
  }
  assert.equal(bad.length, 0, bad.join(' | '));
});

test('WIDTH: the hit cylinder covers 85% of the drawn rig horizontally and is at most 0.15 m wider than that needs (every kind, flat and raised)', () => {
  const bad = [];
  for (const kind of Object.keys(RIGS)) for (const [name, cx] of FLOORS) {
    const { e } = placed(kind, cx), vs = vertsOf(kind, e), c = hitCylinder(e), PAD = 0.05;
    const d = vs.map((p) => Math.hypot(p[0] - c.x, p[2] - c.z)).sort((a, b) => a - b), need = d[Math.floor(d.length * 0.85)], have = c.r + PAD;
    if (have < need) bad.push(`${kind} on the ${name}: the hit cylinder (r ${c.r} + ${PAD} = ${have.toFixed(2)}, centred ${(ENEMIES[kind].hitForward ?? 0)} m ahead) is narrower than the body needs (85% of the drawn vertices lie within ${need.toFixed(2)} m of its axis)`);
    else if (have > need + 0.15) bad.push(`${kind} on the ${name}: the hit cylinder (${have.toFixed(2)} m) is wider than the body needs (${need.toFixed(2)} m) by more than 0.15 m: shots would hit empty air`);
  }
  assert.equal(bad.length, 0, bad.join(' | '));
});

test('SPLASH: a flare that strikes the head of the Cantor hurts it nearly as much as one that strikes its torso (splash is measured from the blast on the body)', () => {
  const hurt = (above, cx) => {
    const { w, e } = placed('cantor', cx), start = e.hp; e.state = 'idle';
    w.projectiles.push({ id: w.nextId++, weapon: 'flare', x: e.x - 4, y: e.y + above, z: e.z, vx: 24, vy: 0, vz: 0, life: 4 });
    for (let i = 0; i < 200 && w.projectiles.length; i++) step(w, idle());      // until the flare has burst (or flown away)
    return { dmg: start - e.hp };
  };
  const bad = [];
  for (const [name, cx] of FLOORS) {
    const torso = hurt(1.5, cx).dmg, head = hurt(4.2, cx).dmg;
    if (!(torso > 0)) bad.push(`${name}: a flare at the Cantor's torso did no damage (${torso}); the test setup is wrong`);
    else if (!(head >= 0.8 * torso)) bad.push(`${name}: a flare at the Cantor's head (4.2 m) did ${head.toFixed(1)} damage, against ${torso.toFixed(1)} at its torso`);
  }
  assert.equal(bad.length, 0, bad.join(' | '));
});

test('insideHit: the cylinder is centred hitForward ahead of the feet along the facing, and uses the shot\'s own pad', () => {
  const e = { kind: 'gaunt', x: 10, z: 10, y: 0, yaw: Math.PI / 2 };         // facing +x
  const fwd = ENEMIES.gaunt.hitForward ?? 0, r = ENEMIES.gaunt.hitRadius ?? ENEMIES.gaunt.radius;
  assert.ok(insideHit(e, 10 + fwd, 0.5, 10, 0), 'the cylinder centre is inside');
  assert.ok(!insideHit(e, 10 + fwd + r + 0.2, 0.5, 10, 0.05), 'beyond radius + pad is outside');
  assert.ok(insideHit(e, 10 + fwd + r + 0.2, 0.5, 10, 0.3), 'a thicker projectile reaches it');
  assert.ok(!insideHit(e, 10, ENEMIES.gaunt.height + 0.01, 10), 'above the height is outside');
  assert.ok(!insideHit({ ...e, y: 3 }, 10 + fwd, 0.5, 10), 'below its feet is outside');
});
