// Do the refined rigs (tools/look/rigs_v2.js) fit the game's architecture? This re-applies the project's OWN rules to them, headless, on the true world-space vertices, exactly as the shipped rigs are judged:
//   HEIGHT   drawn height = defs.js `height` within 0.10 m (tests/hit-volume-fair.test.js)
//   WIDTH    the hit cylinder (hitRadius + 0.05 pellet, centred hitForward ahead of the feet) covers 85% of the drawn vertices horizontally, and is at most 0.15 m wider than that needs (same file)
//   GROUND   across every pose family the view can ask for, on floors 0 / 0.5 / 1 / 3 m: the lowest vertex stays within the ground band (tests/rig-grounding.test.js, src/render/ground-contract.js), a flyer by hoverLift
//   ROOT     a pose never writes the root's position, yaw or scale
//   BUDGET   meshes, materials and triangles against the shipped rig of the same kind (each mesh is a draw call while the creature is awake; a sleeper merges to one call per material)
//   node tools/look/check-rigs.mjs [kind ...]
import * as THREE from 'three';
import { FACTORIES } from '../../src/render/models_choir.js';
import { makeTollbearer, makeGaunt } from '../../src/render/models.js';
import { makeBellNodeEnemy } from '../../src/render/models_g2.js';
import { makeDroneGill, makeFeeder, makeGraftMother } from '../../src/render/models_e2.js';
import { ENEMIES, PLAYER } from '../../src/engine/defs.js';
import { hitCylinder } from '../../src/engine/hitvolume.js';
import { GROUND_BAND, groundVerdict, hoverLift } from '../../src/render/ground-contract.js';

const SHIPPED = { tollbearer: () => makeTollbearer(null), bellhand: () => makeTollbearer(null, 'bellhand'), sexton: () => makeTollbearer(null, 'sexton'), wardengraft: () => makeTollbearer(null, 'warden'), cantor: () => makeTollbearer(null, 'cantor'), gaunt: () => makeGaunt(null), bellnode: () => makeBellNodeEnemy(), gill: () => makeDroneGill(null), feeder: () => makeFeeder(null), graftmother: () => makeGraftMother(null) };
const kinds = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(FACTORIES);
const STAND = { t: 1, walk: 0, phase: 0, attack: 0, lunge: 0, dead: 0, flash: 0 }, BASE = { t: 1.3, walk: 0, phase: 0, attack: 0, lunge: 0, dead: 0, flash: 0 };
const POSES = [['idle', {}]];
for (let k = 0; k < 8; k++) POSES.push(['walk@' + k, { walk: 1, phase: k * Math.PI / 4 }], ['half-walk@' + k, { walk: 0.5, phase: k * Math.PI / 4 + 0.3 }]);
for (const a of [0.05, 0.2, 0.4, 0.55, 0.65, 0.8, 0.95]) POSES.push(['attack ' + a, { attack: a }], ['attack-walking ' + a, { attack: a, walk: 1, phase: 2 }]);
for (const l of [-1, -0.7, -0.3, 0.3, 0.7, 1]) POSES.push(['lunge ' + l, { lunge: l }], ['lunge-running ' + l, { lunge: l, walk: 1, phase: 1 }]);
for (let d = 0.05; d <= 1.0001; d += 0.05) POSES.push(['dead ' + d.toFixed(2), { dead: d }]);
POSES.push(['dying while still walking', { dead: 0.3, walk: 0.8, phase: 2 }], ['flash', { flash: 1 }]);

const verts = (v) => { const out = [], t = new THREE.Vector3(); v.root.updateMatrixWorld(true); v.root.traverse((o) => { const pos = o.isMesh && o.geometry?.attributes?.position; if (!pos) return; for (let i = 0; i < pos.count; i++) { t.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); out.push([t.x, t.y, t.z]); } }); return out; };
const stats = (v) => { let meshes = 0, tris = 0; const mats = new Set(); v.root.traverse((o) => { if (o.isMesh) { meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => mats.add(m)); } }); return { meshes, tris: Math.round(tris), mats: mats.size }; };

let bad = 0; const rows = [];
for (const kind of kinds) {
  const make = FACTORIES[kind]; if (!make) { console.log('no rig for', kind); bad++; continue; }
  const def = ENEMIES[kind], problems = [];
  // HEIGHT + WIDTH, placed as the view places it (root at the sim's x, y, z and yaw), standing
  const e = { kind, x: 10, y: 0, z: 10, yaw: -Math.PI / 2 };
  const v = make(null); v.root.position.set(e.x, e.y, e.z); v.root.rotation.y = e.yaw; v.pose(STAND);
  const vs = verts(v), top = Math.max(...vs.map((p) => p[1])), base = Math.min(...vs.map((p) => p[1])), h = top - base;
  if (Math.abs(def.height - h) > 0.10) problems.push(`HEIGHT drawn ${h.toFixed(2)} vs hit ${def.height}`);
  { const eye = PLAYER.eye, rr = (def.hitRadius ?? def.radius) + 0.05, yTop = 0.99 * h;                                  // tests/hit-volume-fair.test.js: a pellet aimed at 99% of the DRAWN head from 6 m must register: it enters the cylinder rr short of the axis
    const yEntry = eye + (yTop + (def.hover ?? 0) - eye) * ((6 - rr) / 6); if (yEntry > def.height + (def.hover ?? 0)) problems.push(`HEIGHT a shot at 99% of the drawn head (${yTop.toFixed(2)} m) enters the hit cylinder at ${yEntry.toFixed(2)} m, above its ${def.height} m top`); }
  const c = hitCylinder(e), d = vs.map((p) => Math.hypot(p[0] - c.x, p[2] - c.z)).sort((a, b) => a - b), need = d[Math.floor(d.length * 0.85)], have = c.r + 0.05;
  if (have < need) problems.push(`WIDTH hit cylinder ${have.toFixed(2)} narrower than the body needs (${need.toFixed(2)})`); else if (have > need + 0.15) problems.push(`WIDTH hit cylinder ${have.toFixed(2)} wider than needed (${need.toFixed(2)}) by more than 0.15`);
  // GROUND + ROOT over every pose and floor
  let worstBuried = 0, worstFloat = 0, rootBad = 0, groundBad = 0;
  for (const g of [0, 0.5, 1, 3]) {
    const w = make(null); w.root.position.set(0.37, g, -0.21); w.root.rotation.set(0, 0.8, 0); w.root.updateMatrixWorld(true);
    for (const [name, p] of POSES) {
      const pb = [w.root.position.x, w.root.position.y, w.root.position.z, w.root.rotation.y, w.root.scale.x, w.root.scale.y, w.root.scale.z];
      w.pose({ ...BASE, ...p }); w.root.updateMatrixWorld(true);
      const pa = [w.root.position.x, w.root.position.y, w.root.position.z, w.root.rotation.y, w.root.scale.x, w.root.scale.y, w.root.scale.z];
      if (pb.some((x, i) => Math.abs(x - pa[i]) > 1e-9)) rootBad++;
      const minY = new THREE.Box3().setFromObject(w.root, true).min.y, ref = g + hoverLift(def, p.dead ?? 0), vd = groundVerdict(minY, ref);
      if (vd.off < worstBuried) worstBuried = vd.off; if (vd.off > worstFloat) worstFloat = vd.off;
      if (!vd.ok) { groundBad++; if (groundBad <= 2) problems.push(`GROUND ${name} on ${g} m: ${vd.off.toFixed(3)} m ${vd.buried ? 'BURIED' : 'FLOATING'}`); }
    }
  }
  if (rootBad) problems.push(`ROOT written by a pose ${rootBad}x`);
  const st = stats(v), sh = SHIPPED[kind] ? stats(SHIPPED[kind]()) : null;
  rows.push({ kind, h: h.toFixed(2), def: def.height, need: need.toFixed(2), have: have.toFixed(2), buried: worstBuried.toFixed(3), float: worstFloat.toFixed(3), st, sh });
  if (problems.length) { bad++; console.log(`FAIL ${kind}: ${problems.join(' | ')}`); } else console.log(`ok   ${kind}`);
}
console.log('\nkind          drawn/def    85%-radius need/have   buried/float(worst)   meshes mats tris   shipped meshes mats tris');
for (const r of rows) console.log(`${r.kind.padEnd(13)} ${r.h}/${String(r.def).padEnd(5)}    ${r.need}/${r.have}              ${r.buried}/${r.float}        ${String(r.st.meshes).padStart(4)} ${String(r.st.mats).padStart(3)} ${String(r.st.tris).padStart(5)}    ${r.sh ? `${String(r.sh.meshes).padStart(4)} ${String(r.sh.mats).padStart(3)} ${String(r.sh.tris).padStart(5)}` : '-'}`);
console.log(`\nground band: buried ${GROUND_BAND.buried} m, floating ${GROUND_BAND.floating} m`);
process.exit(bad ? 1 : 0);
