// LOOK POLISH 2 and 3 (2026-10-26; the owner: "show me your style and your art and your taste"): ARCHITECTURE the grid never drew, built from the map and drawn only (the simulation, its collisions,
// sight lines and shots never see any of it; every piece stands at most 22 cm proud of a wall, inside the distance a body keeps from a wall).
//   * a SKIRTING along the foot of every wall that faces a roofed room, and a CORNICE under its ceiling; outdoors a stone PLINTH at the foot and a COPING along the top. They are the wall's own paint,
//     darker, so every map keeps its palette; the ink pass draws their edges, which is what turns a box into a room.
//   * PILASTERS on long straight walls: a shaft with a base and a capital every few cells, never at a corner and never near a door, a lever, a secret panel, a closet or an exit.
//   * DOOR FRAMES: jambs and a lintel round every door on both sides, and a small lamp over each doorway (warm for an open door, the key's own colour for a locked one), with its light spilled on
//     the floor in front, so a way on reads from across a room.
//   * a halo round every LEVER, and a pool of light on the floor under every lamp, lantern and lamppost (additive, vertex-coloured: no texture, no light of its own, nothing the light budget counts).
// Pure in its inputs (a MapData and the textures), deterministic, and cheap: a few merged meshes per map. `TRIMS` holds every size.
import * as THREE from 'three';
import { WALL_SKINS, KEYS } from '../engine/defs.js';

export const TRIMS = Object.freeze({
  skirt: { h: 0.3, d: 0.07, tint: 0x6c645c }, cornice: { h: 0.3, d: 0.12, tint: 0x7c7268 },                   // (the second pass made them bolder: at the game's 480 pixels the first ones were a pixel tall)
  plinth: { h: 0.5, d: 0.09, tint: 0x7e7c78 }, coping: { h: 0.24, d: 0.12, tint: 0x9a9690 },
  pilaster: { w: 0.52, d: 0.18, every: 3, minRun: 5, base: { w: 0.68, h: 0.38, d: 0.24 }, cap: { w: 0.68, h: 0.3, d: 0.24 }, tint: 0xc4bcb2, clear: 1.6 },
  jamb: { w: 0.26, d: 0.12, lintel: 0.32 }, doorLamp: { w: 0.34, h: 0.12, d: 0.1, open: 0xffd08a, k: 0.9 }, doorSpill: [[1.9, 1.4, 0.16], [1.2, 0.9, 0.14]],
  lever: { r: 0.85, k: 0.22, color: 0xff6a3a }, pool: { lamp: [2.6, 0.16], lantern: [1.8, 0.14], lamppost: [2.4, 0.13], pod: [2.0, 0.1] }, poolColor: { warm: 0xffc890, cool: 0xb8dcff, teal: 0x70ffe0, pod: 0x9affc8 },
});

const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]];

/** quads with world-unit UVs and normals (one mesh per material) */
class Q {
  constructor() { this.pos = []; this.nor = []; this.uv = []; this.idx = []; }
  get empty() { return this.pos.length === 0; }
  quad(p, n, uv) {
    const e1 = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]], e2 = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]];
    const front = (e1[1] * e2[2] - e1[2] * e2[1]) * n[0] + (e1[2] * e2[0] - e1[0] * e2[2]) * n[1] + (e1[0] * e2[1] - e1[1] * e2[0]) * n[2] >= 0;        // wound so the face looks along its normal
    const b = this.pos.length / 3; for (let i = 0; i < 4; i++) { this.pos.push(...p[i]); this.nor.push(...n); this.uv.push(...uv[i]); }
    if (front) this.idx.push(b, b + 1, b + 2, b, b + 2, b + 3); else this.idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
  }
  /** a box in a wall's frame: origin o on the wall plane, tangent t, outward normal n (unit, horizontal), u0..u1 along t, 0..d out of the wall, y0..y1 up; the face against the wall is left out. UVs: world metres / S, v counted from vBase */
  box(o, t, n, u0, u1, d, y0, y1, S, vBase) {
    const P = (u, v, y) => [o[0] + t[0] * u + n[0] * v, y, o[1] + t[1] * u + n[1] * v], ua = (o[0] * t[0] + o[1] * t[1]) / S, V = (y) => (y - vBase) / S;
    const U = (u) => ua + u / S;
    this.quad([P(u0, d, y0), P(u1, d, y0), P(u1, d, y1), P(u0, d, y1)], [n[0], 0, n[1]], [[U(u0), V(y0)], [U(u1), V(y0)], [U(u1), V(y1)], [U(u0), V(y1)]]);                                   // the front
    this.quad([P(u1, 0, y0), P(u1, d, y0), P(u1, d, y1), P(u1, 0, y1)], [t[0], 0, t[1]], [[0, V(y0)], [d / S, V(y0)], [d / S, V(y1)], [0, V(y1)]]);                                            // the two ends
    this.quad([P(u0, d, y0), P(u0, 0, y0), P(u0, 0, y1), P(u0, d, y1)], [-t[0], 0, -t[1]], [[0, V(y0)], [d / S, V(y0)], [d / S, V(y1)], [0, V(y1)]]);
    this.quad([P(u0, 0, y1), P(u0, d, y1), P(u1, d, y1), P(u1, 0, y1)], [0, 1, 0], [[U(u0), 0], [U(u0), d / S], [U(u1), d / S], [U(u1), 0]]);                                                // the top and the underside
    this.quad([P(u0, d, y0), P(u0, 0, y0), P(u1, 0, y0), P(u1, d, y0)], [0, -1, 0], [[U(u0), d / S], [U(u0), 0], [U(u1), 0], [U(u1), d / S]]);
  }
  geometry() {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2)); g.setIndex(this.idx); return g;
  }
}

/** additive light (no texture): discs that fade from a centre and quads that fade along one axis, the intensity in the vertex colour */
class Glow {
  constructor() { this.pos = []; this.col = []; this.idx = []; }
  get empty() { return this.pos.length === 0; }
  /** a disc at ctr in the plane of the unit axes ax and ay, radius r, colour c (THREE.Color) times k at the centre, nothing at the rim */
  disc(ctr, ax, ay, r, c, k, seg = 18) {
    const b = this.pos.length / 3; this.pos.push(...ctr); this.col.push(c.r * k, c.g * k, c.b * k);
    for (let i = 0; i < seg; i++) { const a = (i / seg) * Math.PI * 2, u = Math.cos(a) * r, v = Math.sin(a) * r; this.pos.push(ctr[0] + ax[0] * u + ay[0] * v, ctr[1] + ax[1] * u + ay[1] * v, ctr[2] + ax[2] * u + ay[2] * v); this.col.push(0, 0, 0); }
    for (let i = 0; i < seg; i++) this.idx.push(b, b + 1 + ((i + 1) % seg), b + 1 + i);
  }
  /** a quad from a lit edge to a dark one: ctr, the axis along the lit edge (a, half-length ha) and the axis away from it (b, length lb) */
  spill(ctr, a, ha, bdir, lb, c, k) {
    const q = this.pos.length / 3, P = (s, t) => [ctr[0] + a[0] * s + bdir[0] * t, ctr[1] + a[1] * s + bdir[1] * t, ctr[2] + a[2] * s + bdir[2] * t];
    for (const [s, t, kk] of [[-ha, 0, k], [ha, 0, k], [ha, lb, 0], [-ha, lb, 0]]) { this.pos.push(...P(s, t)); this.col.push(c.r * kk, c.g * kk, c.b * kk); }
    this.idx.push(q, q + 1, q + 2, q, q + 2, q + 3);
  }
  mesh() {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3)); g.setIndex(this.idx);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));        // additive: fog would ADD its own colour far away
    m.renderOrder = 2; m.frustumCulled = false; m.userData.trimGlow = true; return m;
  }
}

/** a wall face of cell (cx, cz) toward (dx, dz): the plane's origin at the face's start corner, the tangent along it (its length is S) and the outward normal */
function faceFrame(S, cx, cz, dx, dz) {
  if (dz === -1) return { o: [cx * S, cz * S], t: [1, 0], n: [0, -1] };
  if (dz === 1) return { o: [cx * S, (cz + 1) * S], t: [1, 0], n: [0, 1] };
  if (dx === -1) return { o: [cx * S, cz * S], t: [0, 1], n: [-1, 0] };
  return { o: [(cx + 1) * S, cz * S], t: [0, 1], n: [1, 0] };
}

/**
 * Every piece of trim for a map: returns { meshes: [THREE.Mesh], stats } (the caller adds them to the level's group and owns their disposal with it). `tex(name)` gives a texture, `wallTex(skin)` the
 * texture of a wall skin. `patch(material, kind)` (optional) gives the trims the level's surface treatment.
 */
export function buildTrims(map, { tex, wallTex, patch = null }) {
  const S = map.cell, H = map.ceiling, out = [], stats = { skirt: 0, cornice: 0, plinth: 0, coping: 0, pilasters: 0, doors: 0, levers: 0, pools: 0 };
  const kind = (x, z) => map.kind(x, z), fl = (x, z) => map.floor(x, z), ce = (x, z) => map.ceilingAt(x, z);
  const roofed = (k) => k === 'floor' || k === 'door' || k === 'secret';
  const sector = (x, z) => map.sectorAt(x, z) >= 0;
  const panels = new Set([...map.secrets.map((s) => s.panel.join(',')), ...[...map.doors.values()].filter((d) => d.closet).map((d) => d.cx + ',' + d.cz)]);
  const isWallLike = (x, z) => kind(x, z) === 'wall' || panels.has(x + ',' + z);
  const skinOf = (x, z) => { const c = map.skin(x, z); return WALL_SKINS[c] ? c : '#'; };
  const near = []; for (const d of map.doors.values()) near.push([(d.cx + 0.5) * S, (d.cz + 0.5) * S]); for (const s of map.secrets) near.push([(s.panel[0] + 0.5) * S, (s.panel[1] + 0.5) * S]);
  for (const sw of map.switches) near.push([sw.px, sw.pz]); for (const e of map.exits) near.push([e.x, e.z]);
  const clearOf = (x, z) => near.every(([px, pz]) => Math.hypot(px - x, pz - z) > TRIMS.pilaster.clear + S * 0.5);

  const band = new Map(), pil = new Map(), bucket = (m, k) => { let q = m.get(k); if (!q) m.set(k, q = new Q()); return q; };
  // the top of an outdoor wall (where its coping goes): the highest of its open neighbours, as the level mesh raises it
  const wallTop = (cx, cz) => { let wt = -Infinity; for (const [ex, ez] of DIRS) { const k2 = kind(cx + ex, cz + ez); if (k2 === 'wall') continue; wt = Math.max(wt, roofed(k2) ? ce(cx + ex, cz + ez) : fl(cx + ex, cz + ez) + H); } return wt; };
  /** what band a wall face carries: null, or { cat, f, top, skin } (a closet or secret panel carries the band across like the wall it pretends to be: open, the skirting reads as a sill) */
  const bandOf = (cx, cz, dx, dz) => {
    if (!isWallLike(cx, cz)) return null; const nx = cx + dx, nz = cz + dz, nk = kind(nx, nz); if (isWallLike(nx, nz) || sector(nx, nz)) return null;
    const f = fl(nx, nz), skin = skinOf(cx, cz);
    if (roofed(nk)) return { cat: 'in', f, top: ce(nx, nz), skin };
    if (nk === 'outdoor') { const wt = wallTop(cx, cz); return { cat: 'out', f, top: Math.abs(wt - (f + H)) < 1e-6 ? wt : null, skin }; }
    return null;
  };
  const same = (a, b) => a && b && a.cat === b.cat && a.skin === b.skin && Math.abs(a.f - b.f) < 1e-6 && (a.top === b.top || (a.top != null && b.top != null && Math.abs(a.top - b.top) < 1e-6));
  // skirting, cornice, plinth and coping: one box per straight run of faces along a line (not per cell: a big map would carry a hundred thousand hidden end faces)
  for (const [dx, dz] of DIRS) {
    const alongX = dz !== 0, lines = alongX ? map.h : map.w, len = alongX ? map.w : map.h;
    for (let L = 0; L < lines; L++) {
      let start = -1, cur = null;
      for (let i = 0; i <= len; i++) {
        const cx = alongX ? i : L, cz = alongX ? L : i, b = i < len ? bandOf(cx, cz, dx, dz) : null;
        if (cur && same(cur, b)) continue;
        if (cur) {
          const c0x = alongX ? start : L, c0z = alongX ? L : start, { o, t, n } = faceFrame(S, c0x, c0z, dx, dz), q = bucket(band, cur.skin + '|lo'), qh = bucket(band, cur.skin + '|hi'), u1 = (i - start) * S;
          if (cur.cat === 'in') { q.box(o, t, n, 0, u1, TRIMS.skirt.d, cur.f - 0.02, cur.f + TRIMS.skirt.h, S, cur.f); stats.skirt += i - start; if (cur.top - cur.f > 1.4) { qh.box(o, t, n, 0, u1, TRIMS.cornice.d, cur.top - TRIMS.cornice.h, cur.top + 0.01, S, cur.f); stats.cornice += i - start; } }
          else { q.box(o, t, n, 0, u1, TRIMS.plinth.d, cur.f - 0.02, cur.f + TRIMS.plinth.h, S, cur.f); stats.plinth += i - start; if (cur.top != null) { qh.box(o, t, n, 0, u1, TRIMS.coping.d, cur.top - TRIMS.coping.h, cur.top, S, cur.f); stats.coping += i - start; } }
        }
        cur = b; start = i;
      }
    }
  }
  // pilasters: runs of plain wall faces along one line into one roofed room (same floor, same ceiling), a shaft every few cells, symmetric in the run, never at its ends
  const P = TRIMS.pilaster;
  for (const [dx, dz] of DIRS) {
    const alongX = dz !== 0, lines = alongX ? map.h : map.w, len = alongX ? map.w : map.h;
    for (let L = 0; L < lines; L++) {
      let run = [];
      const flush = () => {
        if (run.length >= P.minRun) {
          const k = run.length, first = 2 + Math.floor(((k - 4) % P.every) / 2);
          for (let b = first; b <= k - 2; b += P.every) {
            const [cx, cz] = run[b], f = fl(cx + dx, cz + dz), top = ce(cx + dx, cz + dz), { o, t, n } = faceFrame(S, cx, cz, dx, dz);
            const bx = o[0] + n[0] * 0.1, bz = o[1] + n[1] * 0.1; if (!clearOf(bx, bz)) continue;
            const q = bucket(pil, skinOf(cx, cz)), h2 = P.w / 2;
            q.box(o, t, n, -h2, h2, P.d, f, top, S, f);
            q.box(o, t, n, -P.base.w / 2, P.base.w / 2, P.base.d, f - 0.02, f + P.base.h, S, f);
            if (top - f > 2) q.box(o, t, n, -P.cap.w / 2, P.cap.w / 2, P.cap.d, top - TRIMS.cornice.h - P.cap.h, top - TRIMS.cornice.h + 0.01, S, f);
            stats.pilasters++;
          }
        }
        run = [];
      };
      for (let i = 0; i <= len; i++) {
        const cx = alongX ? i : L, cz = alongX ? L : i, nx = cx + dx, nz = cz + dz;
        const ok = i < len && kind(cx, cz) === 'wall' && !panels.has(cx + ',' + cz) && kind(nx, nz) === 'floor' && !sector(nx, nz);
        const cont = ok && run.length && (() => { const [px, pz] = run[run.length - 1]; return Math.abs(fl(px + dx, pz + dz) - fl(nx, nz)) < 1e-6 && Math.abs(ce(px + dx, pz + dz) - ce(nx, nz)) < 1e-6 && skinOf(px, pz) === skinOf(cx, cz); })();
        if (ok && (cont || !run.length)) run.push([cx, cz]); else { flush(); if (ok) run.push([cx, cz]); }
      }
    }
  }
  // door frames: on each open side of a door, two jambs where the wall meets the opening and a lintel across its head; a lamp on the lintel and its light spilled on the floor in front
  const frames = new Q(), lamps = new Map(), glow = new Glow(), J = TRIMS.jamb, warm = new THREE.Color(TRIMS.doorLamp.open);
  for (const d of map.doors.values()) {
    if (d.closet) continue;
    const axis = map.doorAxis(d.cx, d.cz), f = fl(d.cx, d.cz), top = ce(d.cx, d.cz), lampC = d.key && KEYS[d.key] ? new THREE.Color(KEYS[d.key].color) : warm;
    for (const s of [-1, 1]) {
      const ox = axis === 'x' ? 0 : s, oz = axis === 'x' ? s : 0, nk = kind(d.cx + ox, d.cz + oz); if (nk !== 'floor' && nk !== 'outdoor' && nk !== 'door') continue;
      const { o, t, n } = faceFrame(S, d.cx, d.cz, ox, oz), nf = fl(d.cx + ox, d.cz + oz);
      frames.box(o, t, n, -J.w, 0.02, J.d, f - 0.02, top, S, f); frames.box(o, t, n, S - 0.02, S + J.w, J.d, f - 0.02, top, S, f);
      frames.box(o, t, n, -J.w, S + J.w, J.d, top - J.lintel, top + 0.01, S, f);
      const L = TRIMS.doorLamp, ly = top - J.lintel - L.h - 0.02; if (ly - f > 1.9) { bucket(lamps, lampC.getHex()).box(o, t, n, S / 2 - L.w / 2, S / 2 + L.w / 2, L.d + J.d * 0.5, ly, ly + L.h, S, f); }
      for (const [len, wid, k] of TRIMS.doorSpill) glow.spill([o[0] + t[0] * S / 2, nf + 0.06, o[1] + t[1] * S / 2], [t[0], 0, t[1]], wid, [n[0], 0, n[1]], len, lampC, k * (d.key ? 1.25 : 1));
      stats.doors++;
    }
  }
  // the levers' halos, and the pools of light under lamps
  const lc = new THREE.Color(TRIMS.lever.color);
  for (const sw of map.switches) { const dir = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] }[sw.wallDir] || [0, -1]; glow.disc([sw.px - dir[0] * 0.05, sw.fy + 1.35, sw.pz - dir[1] * 0.05], [-dir[1], 0, dir[0]], [0, 1, 0], TRIMS.lever.r, lc, TRIMS.lever.k); stats.levers++; }
  for (const p of map.props) { const pool = TRIMS.pool[p.kind]; if (!pool) continue; const pcx = Math.floor(p.at[0]), pcz = Math.floor(p.at[1]); if (kind(pcx, pcz) === 'water' || kind(pcx, pcz) === 'void') continue; glow.disc([p.x, fl(pcx, pcz) + 0.05, p.z], [1, 0, 0], [0, 0, 1], pool[0], new THREE.Color(TRIMS.poolColor[p.kind === 'pod' ? 'pod' : p.tint] ?? TRIMS.poolColor.warm), pool[1]); stats.pools++; }          // the lamp's own tint (models.js LAMP_TINTS names)

  const mat = (texture, tint, kindName) => { const m = new THREE.MeshLambertMaterial({ map: texture, color: tint }); patch?.(m, kindName); return m; };
  for (const [key, q] of band) { if (q.empty) continue; const [skin, part] = key.split('|'), m = new THREE.Mesh(q.geometry(), mat(wallTex(skin), part === 'lo' ? TRIMS.skirt.tint : TRIMS.cornice.tint, 'trim')); m.userData.trim = 'band'; out.push(m); }          // the foot darker than the head
  for (const [skin, q] of pil) { if (q.empty) continue; const m = new THREE.Mesh(q.geometry(), mat(wallTex(skin), P.tint, 'trim')); m.userData.trim = 'pilaster'; out.push(m); }
  if (!frames.empty) { const m = new THREE.Mesh(frames.geometry(), mat(tex('wall_iron_a'), 0x9a948c, 'trim')); m.userData.trim = 'frame'; out.push(m); }
  for (const [hex, q] of lamps) { const m = new THREE.Mesh(q.geometry(), new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(TRIMS.doorLamp.k) })); m.userData.trim = 'lamp'; out.push(m); }
  if (!glow.empty) out.push(glow.mesh());
  return { meshes: out, stats };
}
