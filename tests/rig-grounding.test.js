// Render truth, headless: every enemy rig, in every pose, placed on floors of different heights, measured on its true world-space
// vertices. PT-001/PT-002: the pose functions used to overwrite the world root's y (the enemy was drawn at world 0 on a raised floor) and
// the death/crouch poses drove the mesh below the contact plane. The contract is in src/render/ground-contract.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeTollbearer, makeGaunt } from '../src/render/models.js';
import { makeBellNodeEnemy } from '../src/render/models_g2.js';
import { GROUND_BAND, groundVerdict } from '../src/render/ground-contract.js';

const RIGS = {
  tollbearer: () => makeTollbearer(null), bellhand: () => makeTollbearer(null, 'bellhand'), sexton: () => makeTollbearer(null, 'sexton'), wardengraft: () => makeTollbearer(null, 'warden'),
  cantor: () => makeTollbearer(null, 'cantor'), gaunt: () => makeGaunt(null), bellnode: () => makeBellNodeEnemy(),
};
const GROUNDS = [0, 0.5, 1, 3];                                                  // flat floor, a step, a raised cell, the M02 gallery
const BASE = { t: 1.3, walk: 0, phase: 0, attack: 0, lunge: 0, dead: 0, flash: 0 };
/** every pose family the view can ask for: idle, a full walk cycle, attack windups, charge/channel/pulse windups (attack 0.5-0.55), Gaunt crouch and dash, the whole death blend, and a flash */
const POSES = [['idle', {}]];
for (let k = 0; k < 8; k++) POSES.push(['walk@' + k, { walk: 1, phase: k * Math.PI / 4 }], ['half-walk@' + k, { walk: 0.5, phase: k * Math.PI / 4 + 0.3 }]);
for (const a of [0.05, 0.2, 0.4, 0.55, 0.65, 0.8, 0.95]) POSES.push(['attack ' + a, { attack: a }], ['attack-walking ' + a, { attack: a, walk: 1, phase: 2 }]);
for (const l of [-1, -0.7, -0.3, 0.3, 0.7, 1]) POSES.push(['lunge ' + l, { lunge: l }], ['lunge-running ' + l, { lunge: l, walk: 1, phase: 1 }]);
for (let d = 0.05; d <= 1.0001; d += 0.05) POSES.push(['dead ' + d.toFixed(2), { dead: d }]);
POSES.push(['dying while still walking', { dead: 0.3, walk: 0.8, phase: 2 }], ['flash', { flash: 1 }]);

const placed = (v, g) => { v.root.position.set(0.37, g, -0.21); v.root.rotation.set(0, 0.8, 0); v.root.updateMatrixWorld(true); };
const lowest = (v) => { v.root.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(v.root, true); return { min: b.min.y, max: b.max.y }; };

test('a pose never writes the WORLD placement: the root keeps the position, yaw and scale the view gave it', () => {
  const bad = [];
  for (const [kind, make] of Object.entries(RIGS)) for (const g of GROUNDS) {
    const v = make(); placed(v, g);
    for (const [name, p] of POSES) {
      const before = [v.root.position.x, v.root.position.y, v.root.position.z, v.root.rotation.x, v.root.rotation.y, v.root.rotation.z, v.root.scale.x, v.root.scale.y, v.root.scale.z];
      v.pose({ ...BASE, ...p });
      const after = [v.root.position.x, v.root.position.y, v.root.position.z, v.root.rotation.x, v.root.rotation.y, v.root.rotation.z, v.root.scale.x, v.root.scale.y, v.root.scale.z];
      if (before.some((x, i) => Math.abs(x - after[i]) > 1e-9)) bad.push(`${kind} on ${g} m, pose "${name}": root ${before.map((x) => +x.toFixed(3))} -> ${after.map((x) => +x.toFixed(3))}`);
    }
  }
  assert.equal(bad.length, 0, `${bad.length} pose(s) overwrote the world root, e.g. ${bad.slice(0, 3).join(' | ')}`);
});

test('in every pose the lowest rendered vertex sits on the authoritative ground, never buried and never hovering (all rigs, floors 0 / 0.5 / 1 / 3 m)', () => {
  const bad = []; let worst = { off: 0 }, worstFloat = { off: 0 };
  for (const [kind, make] of Object.entries(RIGS)) for (const g of GROUNDS) {
    const v = make(); placed(v, g);
    for (const [name, p] of POSES) {
      v.pose({ ...BASE, ...p }); const { min } = lowest(v), r = groundVerdict(min, g);
      if (r.off < worst.off) worst = { off: r.off, kind, g, name }; if (r.off > worstFloat.off) worstFloat = { off: r.off, kind, g, name };
      if (!r.ok) bad.push(`${kind} on ${g} m, "${name}": lowest vertex ${min.toFixed(3)} (${r.off >= 0 ? '+' : ''}${r.off.toFixed(3)} from the ground)`);
    }
  }
  assert.equal(bad.length, 0, `${bad.length} grounding violation(s) of the band -${GROUND_BAND.buried}/+${GROUND_BAND.floating} m; deepest ${JSON.stringify(worst)}; highest ${JSON.stringify(worstFloat)}; first: ${bad.slice(0, 4).join(' | ')}`);
});

test('a corpse lies ON the floor: the dead pose is lifted onto the contact plane, not left floating or half-sunk (every rig)', () => {
  const bad = [];
  for (const [kind, make] of Object.entries(RIGS)) for (const g of [0, 3]) {
    const v = make(); placed(v, g); v.pose({ ...BASE, dead: 1 }); const { min, max } = lowest(v);
    if (Math.abs(min - g) > GROUND_BAND.buried) bad.push(`${kind} on ${g} m: lowest vertex ${(min - g).toFixed(3)} from the floor`);
    if (kind !== 'bellnode' && max - g > 1.6 * (kind === 'cantor' ? 2 : 1)) bad.push(`${kind} on ${g} m: a dead body still ${(max - g).toFixed(2)} m tall`);
  }
  assert.equal(bad.length, 0, bad.join(' | '));
});

test('resurrection stands the rig back up: dead 1 -> 0 returns to exactly the idle pose (no leftover topple, scale or lift)', () => {
  for (const [kind, make] of Object.entries(RIGS)) {
    const v = make(); placed(v, 3); v.pose({ ...BASE }); const idle = lowest(v); v.pose({ ...BASE, dead: 1 }); v.pose({ ...BASE });
    const back = lowest(v);
    assert.ok(Math.abs(back.min - idle.min) < 1e-6 && Math.abs(back.max - idle.max) < 1e-6, `${kind}: idle ${idle.min.toFixed(4)}..${idle.max.toFixed(4)} vs after resurrection ${back.min.toFixed(4)}..${back.max.toFixed(4)}`);
  }
});
