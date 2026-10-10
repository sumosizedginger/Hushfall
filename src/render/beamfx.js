// What the Mirror Array looks like (PT-033, Episode 4 Batch B; engine/beams.js): the EMITTERS (a bronze plinth, a barrel with a bright lens pointing where the beam goes), the MIRRORS (a plinth with a framed plate that turns a quarter step when
// you Use it: a bright glass face, a black back), the RECEIVERS (a socket that is dull until a beam enters it, then gold), and the BEAMS themselves (thin bright bars along the grid with a soft halo). A read-only view of the sim: the mirror rotations
// are `w.mirrors`, the lit receivers `w.beams.lit`, the doors `w.doors`; the lines are traced again here with the same pure function (the sim and the picture cannot disagree).
import * as THREE from 'three';
import { traceBeams, BEAM, DIRS } from '../engine/beams.js';

const lam = (o) => new THREE.MeshLambertMaterial(o);
const bas = (o) => new THREE.MeshBasicMaterial(o);
const add = (o) => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, ...o });
/** the world yaw (about y) that turns local +z towards the facing of a mirror: NW, NE, SE, SW */
const YAW = [-3 * Math.PI / 4, 3 * Math.PI / 4, Math.PI / 4, -Math.PI / 4];
const shortest = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };

function plinth(h, r) { const g = new THREE.Group(), base = lam({ color: 0x2a2236, emissive: 0x0c0814 }), brass = lam({ color: 0xc09040, emissive: 0x3a2808 });
  const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.15, h, 10), base); b.position.y = h / 2; g.add(b);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.02, 0.045, 5, 14), brass); ring.rotation.x = Math.PI / 2; ring.position.y = h; g.add(ring);
  return g; }

export function makeBeamView(map, tex = {}) {
  const S = map.cell, group = new THREE.Group(), mirrors = new Map(), receivers = new Map(), emitters = [];
  const fy = (c) => map.floor(c[0], c[1]), pos = (c) => [(c[0] + 0.5) * S, fy(c), (c[1] + 0.5) * S];
  for (const m of map.mirrors) {                                                                       // a plinth and a turning plate
    const [x, y, z] = pos(m.at), g = new THREE.Group(); g.position.set(x, y, z); g.add(plinth(0.55, 0.5));
    const pivot = new THREE.Group(); pivot.position.y = 0.55; g.add(pivot);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.25, 0.1), lam({ color: 0xc09040, emissive: 0x3a2808 })); frame.position.set(0, 0.62, 0); pivot.add(frame);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.1), bas({ color: 0xcfd8ff })); face.position.set(0, 0.62, 0.056); pivot.add(face);
    const sheen = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.1), add({ color: 0xb58cff, opacity: 0.25 })); sheen.position.set(0, 0.62, 0.06); pivot.add(sheen);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.1), bas({ color: 0x08060c })); back.rotation.y = Math.PI; back.position.set(0, 0.62, -0.056); pivot.add(back);
    pivot.rotation.y = YAW[m.rot]; mirrors.set(m.id, { g, pivot, yaw: YAW[m.rot], target: YAW[m.rot], flash: 0, sheen }); group.add(g);
  }
  for (const e of map.emitters) {                                                                      // a plinth with a barrel pointing along the beam
    const [x, y, z] = pos(e.at), g = new THREE.Group(); g.position.set(x, y, z); g.add(plinth(0.5, 0.52));
    const [dx, dz] = DIRS[e.dir], yaw = Math.atan2(dx, dz), barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.9, 10), lam({ color: 0x3a3048, emissive: 0x100c18 })); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, BEAM.height, 0);
    const turret = new THREE.Group(); turret.rotation.y = yaw; turret.add(barrel); const lens = new THREE.Mesh(new THREE.CircleGeometry(0.2, 12), bas({ color: 0xfff3c9 })); lens.position.set(0, BEAM.height, 0.46); turret.add(lens);
    const halo = new THREE.Mesh(new THREE.CircleGeometry(0.5, 14), add({ color: 0xffd36b, opacity: 0.35 })); halo.position.set(0, BEAM.height, 0.48); turret.add(halo); g.add(turret);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, BEAM.height - 0.5, 0.3), lam({ color: 0x2a2236 })); post.position.y = 0.5 + (BEAM.height - 0.5) / 2 - 0.15; g.add(post);
    emitters.push({ g, halo }); group.add(g);
  }
  for (const r of map.receivers) {                                                                     // a socket: a ring and a dull lens that goes gold
    const [x, y, z] = pos(r.at), g = new THREE.Group(); g.position.set(x, y, z); g.add(plinth(0.7, 0.5));
    const ringM = lam({ color: 0xc09040, emissive: 0x3a2808 }), ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.07, 6, 16), ringM); ring.position.y = BEAM.height; g.add(ring);
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.2, BEAM.height - 0.7, 0.2), lam({ color: 0x2a2236 })); stem.position.y = 0.7 + (BEAM.height - 0.7) / 2; g.add(stem);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.3, 14), bas({ color: 0x2a2030 })); lens.position.y = BEAM.height; g.add(lens);
    const halo = new THREE.Mesh(new THREE.CircleGeometry(0.8, 16), add({ color: 0xffd36b, opacity: 0 })); halo.position.y = BEAM.height; g.add(halo);
    receivers.set(r.id, { g, lens, halo, lit: 0, ring }); group.add(g);
  }
  const lines = new THREE.Group(); group.add(lines); let key = '';
  const bar = (x0, z0, x1, z1, y, w, mat) => { const len = Math.hypot(x1 - x0, z1 - z0); if (len < 0.01) return; const m = new THREE.Mesh(new THREE.BoxGeometry(w, w, len), mat); m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.rotation.y = Math.atan2(x1 - x0, z1 - z0); lines.add(m); };
  const coreM = bas({ color: 0xfff3c9 }), haloM = add({ color: 0xffc860, opacity: 0.32 }), outerM = add({ color: 0xb58cff, opacity: 0.12 });

  /** per frame: turn the plates towards their rotations, redraw the beams when they changed, light the receivers */
  function update(w, dt, time) {
    for (const [id, v] of mirrors) { const rot = w.mirrors?.[id] ?? 0; v.target = YAW[rot]; const d = shortest(v.yaw, v.target); v.yaw += d * Math.min(1, dt * 14); v.pivot.rotation.y = v.yaw; v.sheen.material.opacity = 0.2 + 0.1 * Math.sin(time * 2 + v.g.position.x); }
    const open = (cx, cz) => { const d = w.doors.find((q) => q.cx === cx && q.cz === cz); return !!d && d.open >= 0.85; };
    const t = traceBeams(map, w.mirrors, open), k = JSON.stringify(t.lines.map((l) => l.pts));
    if (k !== key) {
      key = k; while (lines.children.length) { const c = lines.children.pop(); c.geometry.dispose(); }
      for (const l of t.lines) for (let i = 0; i + 1 < l.pts.length; i++) { const [x0, z0] = l.pts[i], [x1, z1] = l.pts[i + 1], Y = (map.floor(Math.floor(x0), Math.floor(z0)) || 0); bar(x0 * S, z0 * S, x1 * S, z1 * S, Y + BEAM.height, 0.06, coreM); bar(x0 * S, z0 * S, x1 * S, z1 * S, Y + BEAM.height, 0.2, haloM); bar(x0 * S, z0 * S, x1 * S, z1 * S, Y + BEAM.height, 0.5, outerM); }
    }
    for (const [id, r] of receivers) { const on = (w.beams?.lit ?? []).includes(id) ? 1 : 0; r.lit += (on - r.lit) * Math.min(1, dt * 8); r.lens.material.color.setRGB(0.16 + 0.84 * r.lit, 0.12 + 0.72 * r.lit, 0.19 + 0.36 * r.lit); r.halo.material.opacity = r.lit * (0.45 + 0.15 * Math.sin(time * 5)); }
    for (const e of emitters) e.halo.material.opacity = 0.3 + 0.1 * Math.sin(time * 3);
  }
  return { group, update, mirrors, receivers, lines };
}
