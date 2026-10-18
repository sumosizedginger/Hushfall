// THE ENCOUNTER KIT (PT-052, R1 of the Director's Plan, workstream B): the scripted surprises of the ambush catalogue as calls, so a map source can say what it means instead of writing triggers by hand, and every one is checked
// against the level it goes in (a cell that is not floor, or that already holds an object, is an error at BUILD time, not a creature stuck in a wall at play time). Node only.
//   const E = new Encounters(L);                         L = the Level the map is drawn in (call BEFORE L.layers(): a closet carves a niche)
//   E.closet({ panel: [x, z], niche: [x0, z0, x1, z1], kinds: 't' | ['t', 'g'], when: { at: [x, z], radius } })   a wall panel slides back and a niche of sleepers wakes (CLOSET)
//   E.cage({ at: [x, z], radius, cells: [[x, z], ...], kind })                          stepping onto a spot spawns a pack round you (CAGE: the spot is where a reward lies)
//   E.dropIn({ at: [x, z], radius, cells, kind })                                        a pack drops in from the far side of a room as you cross it (DROP-IN)
//   E.lightsOut({ at: [x, z], radius, cells, kind, level })                              the room goes dark, a pack comes, the light returns when they are dead (LIGHTS OUT)
//   E.reinforce({ when: 'time:90' | 'dead:<group>', cells, kind })                      a second wave that always knows where you are (REINFORCEMENT)
//   E.apply(MAP)                                                                        append the groups, triggers and messages to the map definition
// A kind is a LEGEND character ('t' Tollbearer, 'g' Gaunt, 'b' Bellhand ...) in a closet and an enemy KIND name ('tollbearer') in a spawn: both accepted in either place. The flood (the tide) is not in the kit: it is a map field, not an encounter.
import { FLOOR_SKINS, ENEMIES } from '../../src/engine/defs.js';
import { LEGEND } from './legend.mjs';

const FLOOR = new Set(Object.keys(FLOOR_SKINS));
const kindOf = (k) => (ENEMIES[k] ? k : LEGEND[k]?.type === 'enemy' ? LEGEND[k].kind : null);
const charOf = (k) => (LEGEND[k]?.type === 'enemy' ? k : Object.keys(LEGEND).find((c) => LEGEND[c].type === 'enemy' && LEGEND[c].kind === k) ?? null);

export class Encounters {
  constructor(L, { prefix = 'amb' } = {}) { this.L = L; this.prefix = prefix; this.groups = []; this.triggers = []; this.messages = []; this.secrets = []; this.decals = []; this.log = []; this.n = 0; }
  #name(kind) { return `${this.prefix}-${kind}-${++this.n}`; }
  #floor(x, z, what) {
    const c = this.L.get(x, z); if (!FLOOR.has(c)) throw new Error(`${what}: cell ${x},${z} is not floor ('${c}')`);
    if (this.L.ob[z][x] !== '.') throw new Error(`${what}: cell ${x},${z} already holds '${this.L.ob[z][x]}'`);
  }
  #spawns(what, cells, kind, group, extra = {}) {
    const k = kindOf(kind); if (!k) throw new Error(`${what}: unknown creature '${kind}'`);
    return cells.map(([x, z]) => { this.#floor(x, z, what); return { spawn: { kind: k, at: [x, z], group, facing: extra.facing ?? 'south', hunt: extra.hunt !== false } }; });
  }

  /** SECRET ROOM: a small room behind a panel in a straight wall, with its rewards inside and a scuffed-wall decal on the near face as the hint. `search` = { region: [x0, z0, x1, z1], prefer: [x, z], lane?: Set } finds the viable spot nearest `prefer` (never on the lane); `from` + `dir` ('n' 's' 'e' 'w') says exactly where. w is odd (the width across the wall), d the depth; rewards are LEGEND characters. Returns { id, panel, rect }. */
  secretRoom({ id, from = null, dir = null, search = null, w = 3, d = 2, floor = null, wall = null, rewards = [], message = null }) {
    const L = this.L, V = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }, solid = (x, z) => x >= 1 && z >= 1 && x < L.w - 1 && z < L.h - 1 && !FLOOR.has(L.get(x, z)) && L.get(x, z) !== 'D' && L.get(x, z) !== 'S' && L.get(x, z) !== 'X';
    const spot = (fx, fz, k) => {
      const [dx, dz] = V[k], px = fx + dx, pz = fz + dz, [lx, lz] = [-dz, dx], half = (w - 1) / 2; if (!solid(px, pz) || !solid(px + lx, pz + lz) || !solid(px - lx, pz - lz)) return null;
      const cells = []; for (let i = 1; i <= d; i++) for (let j = -half; j <= half; j++) cells.push([px + dx * (i - 1) + lx * j + dx, pz + dz * (i - 1) + lz * j + dz]);
      if (cells.some(([x, z]) => !solid(x, z) || L.ob[z][x] !== '.')) return null;
      // the ring round the new room must be solid wall (it takes the room's wall skin): the room may touch nothing else; the panel's own cell is the one opening
      const set = new Set(cells.map(([x, z]) => x + ',' + z)); for (const [x, z] of cells) for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const nx = x + a, nz = z + b; if (set.has(nx + ',' + nz) || (nx === px && nz === pz)) continue; if (!solid(nx, nz)) return null; }
      const xs = cells.map((c) => c[0]), zs = cells.map((c) => c[1]); return { panel: [px, pz], rect: [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)], cells, front: [fx, fz], dir: k };
    };
    let pick = null;
    if (from) { pick = spot(from[0], from[1], dir); if (!pick) throw new Error(`secretRoom ${id}: no room fits behind ${from} going ${dir}`); }
    else {
      const [x0, z0, x1, z1] = search.region, best = []; for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { if (!FLOOR.has(L.get(x, z)) || L.ob[z][x] !== '.' || search.lane?.has(x + ',' + z)) continue; for (const k of Object.keys(V)) { const s = spot(x, z, k); if (s) best.push({ s, d: Math.hypot(x - search.prefer[0], z - search.prefer[1]) }); } }
      best.sort((p, q) => p.d - q.d || p.s.panel[1] - q.s.panel[1] || p.s.panel[0] - q.s.panel[0]); pick = best[0]?.s; if (!pick) throw new Error(`secretRoom ${id}: no viable spot in ${search.region}`);
    }
    L.room(pick.rect, { floor: floor ?? L.get(pick.front[0], pick.front[1]), wall: wall ?? L.get(pick.panel[0], pick.panel[1]) }); L.secretPanel(pick.panel[0], pick.panel[1]);          // by default the room wears the floor in front of its panel and the wall the panel is set in
    const free = pick.cells.slice().reverse(); rewards.forEach((c, i) => { const [x, z] = free[i % free.length]; L.put(x, z, c); });
    const half = (w - 1) / 2, far = [pick.cells[half], pick.cells[w + half]].filter(Boolean);          // the secret counts as found when the player stands in the first cells behind the panel (the centre column), as in the hand-built ones
    this.secrets.push({ id, panel: pick.panel, cells: far });
    // the hint: a scuffed patch on the PLAIN wall one cell to the side of the panel (a decal sits on a wall, and the panel is a secret tile, not a wall); none if neither side is floor in front of plain wall
    const [vx, vz] = V[pick.dir], hint = [1, -1].map((s) => [pick.front[0] - vz * s, pick.front[1] + vx * s]).find(([cx, cz]) => FLOOR.has(L.get(cx, cz)) && solid(cx + vx, cz + vz));
    if (hint) this.decals.push({ kind: 'scrape', at: hint, wall: { n: 'north', s: 'south', e: 'east', w: 'west' }[pick.dir], y: 1.0, size: 1.0 });
    if (message) this.messages.push({ id, at: far[0], radius: 2, ...message });
    this.log.push({ kind: 'secret', id, panel: pick.panel }); return { id, panel: pick.panel, rect: pick.rect };
  }
  /** n free floor cells `min`..`max` cells from `at` that SEE `at` over level floor, within half a metre of its height, at least `sep` cells apart; the same answer every time (best to a middle distance first) */
  around(at, { n, min = 4, max = 9, sep = 3, avoid = [] }) {
    const L = this.L, mid = (min + max) / 2, h0 = L.ht[at[1]]?.[at[0]] ?? 0, bad = new Set(avoid.map(([x, z]) => x + ',' + z)), cand = [];
    for (let z = at[1] - max; z <= at[1] + max; z++) for (let x = at[0] - max; x <= at[0] + max; x++) {
      const d = Math.hypot(x - at[0], z - at[1]); if (d < min || d > max || !FLOOR.has(L.get(x, z)) || L.ob[z]?.[x] !== '.' || bad.has(x + ',' + z) || Math.abs((L.ht[z]?.[x] ?? 0) - h0) > 1) continue;
      let seen = true; const m = Math.max(Math.abs(x - at[0]), Math.abs(z - at[1])); for (let i = 1; i < m; i++) if (!FLOOR.has(L.get(Math.round(at[0] + (x - at[0]) * i / m), Math.round(at[1] + (z - at[1]) * i / m)))) { seen = false; break; }
      if (seen) cand.push({ x, z, k: Math.abs(d - mid), a: Math.atan2(z - at[1], x - at[0]) });
    }
    cand.sort((p, q) => p.k - q.k || p.a - q.a); const out = [];
    for (const c of cand) { if (out.length >= n) break; if (out.every(([x, z]) => Math.hypot(x - c.x, z - c.z) >= sep)) out.push([c.x, c.z]); }
    if (out.length < n) throw new Error(`around: wanted ${n} cells near ${at}, found ${out.length}`); return out;
  }
  #trigger(id, when, at, radius, list) { const t = { id, when, ...(at ? { at, radius } : {}), do: list }; this.triggers.push(t); return t; }

  /** CLOSET: carve a niche (floor `floor`, walls `wall`), set a closet panel in the wall in front of it, put the sleepers in; `when` makes a trigger that opens it, or splice the returned `actions` into a switch's `do` */
  closet({ panel, niche, kinds, floor = 'f', wall = 'W', when = null, sound = 'bell_strike', message = null }) {
    const [x0, z0, x1, z1] = niche, cells = []; for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) cells.push([x, z]);
    const list = Array.isArray(kinds) ? kinds : cells.map(() => kinds); if (list.length !== cells.length) throw new Error(`closet: ${cells.length} niche cells but ${list.length} creatures`);
    for (const k of list) if (!charOf(k) || !kindOf(k)) throw new Error(`closet: unknown creature '${k}'`);
    const name = this.#name('closet'); this.L.room(niche, { floor, wall }); this.L.closet(panel[0], panel[1]);
    cells.forEach(([x, z], i) => this.L.put(x, z, charOf(list[i]) ?? list[i]));
    this.groups.push({ name, rect: niche });
    const actions = [{ open: [panel[0], panel[1]] }, { wake: name }, { sound }, { shake: 0.6 }];
    if (when) this.#trigger(name, 'enter', when.at, when.radius ?? 1.5, actions);
    if (message) this.messages.push({ id: name, at: when?.at ?? panel, radius: when?.radius ?? 1.5, ...message });
    this.log.push({ kind: 'closet', id: name, creatures: cells.length }); return { group: name, actions };
  }
  /** CAGE: a spot (where the reward lies) that, stepped on, spawns a pack round the player */
  cage({ at, radius = 1.6, cells, kind, sound = 'bell_strike', message = null, facing }) {
    const name = this.#name('cage'), list = [{ sound }, { shake: 1 }, ...this.#spawns('cage', cells, kind, name, { facing })]; this.#trigger(name, 'enter', at, radius, list);
    if (message) this.messages.push({ id: name, at, radius, ...message }); this.log.push({ kind: 'cage', id: name, creatures: cells.length }); return { group: name };
  }
  /** DROP-IN: the same, wider, with the pack dropping in at the far side of the room as the player crosses it */
  dropIn({ at, radius = 3, cells, kind, sound = 'creak', message = null, facing }) {
    const name = this.#name('dropin'), list = [{ sound }, { shake: 0.8 }, ...this.#spawns('dropIn', cells, kind, name, { facing })]; this.#trigger(name, 'enter', at, radius, list);
    if (message) this.messages.push({ id: name, at, radius, ...message }); this.log.push({ kind: 'dropin', id: name, creatures: cells.length }); return { group: name };
  }
  /** LIGHTS OUT: dim the room (`level`), send a pack, and give the light back when the pack is dead */
  lightsOut({ at, radius = 3, cells, kind, level = 0.3, sound = 'toll_alert', message = null, facing }) {
    const name = this.#name('dark'), list = [{ lights: level }, { sound }, ...this.#spawns('lightsOut', cells, kind, name, { facing })]; this.#trigger(name, 'enter', at, radius, list);
    this.#trigger(name + '-light', 'dead:' + name, null, 0, [{ lights: '__ambient' }]);
    if (message) this.messages.push({ id: name, at, radius, ...message }); this.log.push({ kind: 'lightsout', id: name, creatures: cells.length }); return { group: name };
  }
  /** REINFORCEMENT: a wave that always knows where the player stands, sent by a clock ('time:90') or by the death of another group ('dead:<group>') */
  reinforce({ when, cells, kind, sound = 'toll_alert', message = null, facing }) {
    if (!/^(time:\d+|dead:[\w-]+)$/.test(when)) throw new Error(`reinforce: when must be 'time:<seconds>' or 'dead:<group>' (got '${when}')`);
    const name = this.#name('wave'), list = [{ sound }, ...this.#spawns('reinforce', cells, kind, name, { facing, hunt: true })]; this.#trigger(name, when, null, 0, list);
    if (message) this.messages.push({ id: name, at: cells[0], radius: 1, ...message }); this.log.push({ kind: 'reinforce', id: name, creatures: cells.length }); return { group: name };
  }
  /** append everything to the map definition (call after MAP is built; the dark's restore level is the map's own ambient light) */
  apply(MAP) {
    const amb = MAP.atmosphere?.ambient ?? 1;
    MAP.groups = [...(MAP.groups ?? []), ...this.groups];
    MAP.triggers = [...(MAP.triggers ?? []), ...this.triggers.map((t) => ({ ...t, do: t.do.map((a) => (a.lights === '__ambient' ? { lights: amb } : a)) }))];
    if (this.messages.length) MAP.messages = [...(MAP.messages ?? []), ...this.messages];
    if (this.secrets.length) MAP.secrets = [...(MAP.secrets ?? []), ...this.secrets];
    if (this.decals.length) MAP.decals = [...(MAP.decals ?? []), ...this.decals];
    return MAP;
  }
}
