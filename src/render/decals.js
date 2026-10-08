// The marks themselves (PT-021 step 2): ONE mesh of quads, drawn after the level, lit by the scene's lights (a stain in a dark room is dark), blended over the floor and the walls with no depth write (so the ink pass, which reads
// depth, never sees them). Three rings of fixed size (DECALS.rings: bullet pocks, spatter, and the big marks: pools, scorch, smears, what the map started with) so a long fight with the rivet driver recycles its own pocks
// and never the pool under a body. Specs come from decalplace.js; nothing here reads the simulation.
import * as THREE from 'three';
import { DECALS } from '../engine/defs.js';

const INSET = 0.5 / 256;                                                          // half a texel: a cell never bleeds into its neighbour
const smooth = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };

export class DecalLayer {
  constructor(atlas) {
    this.rings = {}; let base = 0;
    for (const [name, cap] of Object.entries(DECALS.rings)) { this.rings[name] = { base, cap, next: 0 }; base += cap; }
    this.total = base; this.time = 0; this.items = new Array(base).fill(null); this.growing = new Set();
    this.pos = new Float32Array(base * 12); this.nor = new Float32Array(base * 12); this.uv = new Float32Array(base * 8); this.col = new Float32Array(base * 16);
    const idx = new Uint16Array(base * 6); for (let i = 0; i < base; i++) idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
    const g = this.geometry = new THREE.BufferGeometry();
    for (const [name, arr, n] of [['position', this.pos, 3], ['normal', this.nor, 3], ['uv', this.uv, 2], ['color', this.col, 4]]) { const a = new THREE.BufferAttribute(arr, n); a.setUsage(THREE.DynamicDrawUsage); g.setAttribute(name, a); }
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    this.material = new THREE.MeshLambertMaterial({ map: atlas, emissive: 0x303030, emissiveMap: atlas, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });       // emissive: a stain keeps some of its own colour in a dark room
    this.mesh = new THREE.Mesh(g, this.material); this.mesh.renderOrder = 1; this.mesh.frustumCulled = false;
  }

  /** put one mark down (a spec from decalplace.js); the ring's oldest is overwritten when it is full. Returns the slot. */
  add(spec) {
    const ring = this.rings[spec.ring]; if (!ring) throw new Error('unknown decal ring ' + spec.ring);
    const slot = ring.base + (ring.next % ring.cap); ring.next++;
    this.items[slot] = { ...spec, t0: this.time }; if (spec.grow > 0) this.growing.add(slot); else this.growing.delete(slot);
    this.write(slot, spec.grow > 0 ? 0 : 1); return slot;
  }
  addAll(specs) { for (const s of specs) this.add(s); }

  /** advance the pools that are still spreading */
  update(dt) {
    this.time += dt; if (!this.growing.size) return;
    for (const slot of this.growing) { const it = this.items[slot]; if (!it) { this.growing.delete(slot); continue; } const t = (this.time - it.t0) / it.grow; this.write(slot, t); if (t >= 1) this.growing.delete(slot); }
  }

  /** write the quad of `slot` at growth t (0..1): a mark spreads from 30% of its size and fades in */
  write(slot, t) {
    const it = this.items[slot], k = it.grow > 0 ? 0.3 + 0.7 * smooth(t) : 1, al = it.a * (it.grow > 0 ? Math.min(1, 0.35 + 0.65 * Math.min(1, t)) : 1);
    const [nx, ny, nz] = it.n, cs = Math.cos(it.rot), sn = Math.sin(it.rot); let ux, uy, uz, vx, vy, vz;
    if (Math.abs(ny) > 0.9) { ux = cs; uy = 0; uz = sn; vx = -sn; vy = 0; vz = cs; }                  // floor and ceiling: turned about the normal
    else { const hx = nz, hz = -nx; ux = hx * cs; uy = sn; uz = hz * cs; vx = -hx * sn; vy = cs; vz = -hz * sn; }       // a wall: along it and up, turned a little
    const lift = 0.010 + (slot % 5) * 0.0012, cx = it.pos[0] + nx * lift, cy = it.pos[1] + ny * lift, cz = it.pos[2] + nz * lift, hw = it.w * k / 2, hh = it.h * k / 2;
    const col = it.cell % 4, row = Math.floor(it.cell / 4), u0 = col / 4 + INSET, u1 = (col + 1) / 4 - INSET, vTop = 1 - row / 4 - INSET, vBot = 1 - (row + 1) / 4 + INSET;
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let i = 0; i < 4; i++) {
      const [su, sv] = corners[i], o = slot * 4 + i;
      this.pos[o * 3] = cx + ux * su * hw + vx * sv * hh; this.pos[o * 3 + 1] = cy + uy * su * hw + vy * sv * hh; this.pos[o * 3 + 2] = cz + uz * su * hw + vz * sv * hh;
      this.nor[o * 3] = nx; this.nor[o * 3 + 1] = ny; this.nor[o * 3 + 2] = nz;
      this.uv[o * 2] = su < 0 ? u0 : u1; this.uv[o * 2 + 1] = sv < 0 ? vBot : vTop;
      this.col[o * 4] = it.tint[0]; this.col[o * 4 + 1] = it.tint[1]; this.col[o * 4 + 2] = it.tint[2]; this.col[o * 4 + 3] = al;
    }
    for (const n of ['position', 'normal', 'uv', 'color']) this.geometry.getAttribute(n).needsUpdate = true;
  }

  /** how many marks each ring holds (tests, the readout) */
  stats() { const s = {}; for (const [name, r] of Object.entries(this.rings)) s[name] = Math.min(r.next, r.cap); return s; }
}
