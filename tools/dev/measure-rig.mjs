// Where is each enemy rig really drawn, against what the sim thinks (defs.js: height, hover, hitRadius)? Prints the drawn world-space bounds of the standing rig and how much of its vertex cloud the hit cylinder covers.
// Usage: node tools/dev/measure-rig.mjs [kind ...]   (default: the Episode 2 roster, the ten creatures of models_choir.js). The fairness rule it supports: tests/enemy-hit-volume.test.js (the hit volume matches the drawn body).
import * as THREE from 'three';
import { FACTORIES as CHOIR } from '../../src/render/models_choir.js';
import { ENEMIES } from '../../src/engine/defs.js';

const R = Object.fromEntries(Object.entries(CHOIR).map(([kind, make]) => [kind, () => make(null)]));
const kinds = process.argv.slice(2).length ? process.argv.slice(2) : ['gill', 'feeder', 'graftmother'];
for (const k of kinds) {
  const v = R[k](); v.root.position.set(0, 0, 0); v.pose({ t: 1, walk: 0, phase: 0, attack: 0, lunge: 0, dead: 0, flash: 0 }); v.root.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(v.root, true), d = ENEMIES[k], pts = [];
  v.root.traverse((o) => { if (o.isMesh) { const pos = o.geometry.attributes.position; for (let i = 0; i < pos.count; i++) pts.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld)); } });
  const r = d.hitRadius ?? d.radius, fwd = d.hitForward ?? 0, dist = pts.map((p) => Math.hypot(p.x, p.z - fwd)).sort((x, y) => x - y), need = dist[Math.floor(dist.length * 0.85)], PAD = 0.05;
  console.log(`${k}: drawn y ${b.min.y.toFixed(2)}..${b.max.y.toFixed(2)} (height ${(b.max.y - b.min.y).toFixed(2)}) | def: hover ${d.hover ?? 0}, height ${d.height}, hitRadius ${r} | the 85th-percentile vertex is ${need.toFixed(2)} m from the axis: hitRadius must be in [${(need - PAD).toFixed(2)}, ${(need - PAD + 0.15).toFixed(2)}]`);
}
