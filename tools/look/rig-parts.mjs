// Which meshes of a refined rig sit furthest from its axis (the usual reason the WIDTH rule of check-rigs.mjs fails). node tools/look/rig-parts.mjs <kind>
import * as THREE from 'three';
import { FACTORIES } from '../../src/render/models_choir.js';
const kind = process.argv[2] ?? 'bellhand';
const v = FACTORIES[kind](null); v.pose({ t: 1, walk: 0, phase: 0, attack: 0, lunge: 0, dead: 0, flash: 0 }); v.root.updateMatrixWorld(true);
const rows = [], t = new THREE.Vector3();
v.root.traverse((o) => {
  if (!o.isMesh) return; const pos = o.geometry.attributes.position; let sum = 0, mx = 0, miny = 9, maxy = -9;
  for (let i = 0; i < pos.count; i++) { t.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); const d = Math.hypot(t.x, t.z); sum += d; mx = Math.max(mx, d); miny = Math.min(miny, t.y); maxy = Math.max(maxy, t.y); }
  rows.push({ geom: o.geometry.type, verts: pos.count, meanR: +(sum / pos.count).toFixed(2), maxR: +mx.toFixed(2), y: `${miny.toFixed(2)}..${maxy.toFixed(2)}`, parent: o.parent?.name || '' });
});
rows.sort((a, b) => b.meanR - a.meanR); console.table(rows.slice(0, 8));
// the budget the WIDTH rule gives: with hit radius r the 85th-percentile vertex must lie within r + 0.05 (and no more than 0.15 inside it), so at most 15% of the vertices may be further out.
{ const d = []; v.root.traverse((o) => { if (!o.isMesh) return; const pos = o.geometry.attributes.position; for (let i = 0; i < pos.count; i++) { t.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); d.push(Math.hypot(t.x, t.z)); } });
  d.sort((a, b) => a - b); const lim = +process.argv[3] || 0.43; console.log(`vertices ${d.length}; p85 ${d[Math.floor(d.length * 0.85)].toFixed(2)}; beyond ${lim} m: ${d.filter((x) => x > lim).length} (${(100 * d.filter((x) => x > lim).length / d.length).toFixed(1)}%, the rule allows 15%)`); }
