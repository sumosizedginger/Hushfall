// A door must close something (the owner, playing Customs Hall: "a door that you can just go around, you don't need to open it at all").
// Pure: a parsed map in, plain data out. Shut EVERY door and secret panel, then ask for each door whether its two sides still join: if one does reach
// the other, the door closes nothing, because a player can walk or drop round it without opening anything. A room with two doors passes (both are
// shut), a room with a door and an open arch does not. The walking rules are the sim's, as in traps.js: up at most STEP metres, down any distance,
// walls, deep water and the void block, a moving floor counts at either of its heights, a vent and a car carry. A prop that fills its cell is a wall.
import { STEP, PROPS } from './defs.js';
import { carLinks } from './cars.js';

const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/** the two cells a door joins: across its wall line, whichever pair is open */
export function doorSides(map, x, z) {
  const open = (cx, cz) => {
    if (cx < 0 || cz < 0 || cx >= map.w || cz >= map.h) return false;
    const k = map.kind(cx, cz);
    return k === 'floor' || k === 'outdoor';
  };
  if (open(x - 1, z) && open(x + 1, z)) return [[x - 1, z], [x + 1, z]];
  if (open(x, z - 1) && open(x, z + 1)) return [[x, z - 1], [x, z + 1]];
  return null;
}

/**
 * every door of a map that a player can get round. A list of { at, key, remote, from, to, cells, path }: `cells` is the length of the shortest way round
 * @param {*} map
 * @param {{ maxPath?: number, through?: (d: *) => boolean, wanted?: (d: *) => boolean }} [opts]
 */
export function doorBypasses(map, { maxPath = Infinity, through = () => false, wanted = () => true } = {}) {
  const W = map.w,
    H = map.h,
    key = (x, z) => z * W + x;
  const sectorH = new Map();
  for (const s of map.sectors) for (const [x, z] of s.cells) sectorH.set(key(x, z), [s.low ?? 0, s.high ?? 0]);
  const heights = (x, z) => sectorH.get(key(x, z)) ?? [map.floor(x, z)];
  let skip = null; // the door being asked about never counts as a way round itself
  const blocked = new Set();
  for (const e of map.entities) if (e.type === 'prop' && !e.movable && PROPS[e.kind]?.blocksCell) blocked.add(key(Math.floor(e.at[0]), Math.floor(e.at[1])));
  const passable = (x, z) => {
    if (x < 0 || z < 0 || x >= W || z >= H || blocked.has(key(x, z))) return false;
    const k = map.kind(x, z);
    return k === 'floor' || k === 'outdoor' || (k === 'door' && map.doorAt(x, z) !== skip && !!map.doorAt(x, z) && through(map.doorAt(x, z)));
  };
  const canStep = (ax, az, bx, bz) => {
    for (const ha of heights(ax, az)) for (const hb of heights(bx, bz)) if (hb - ha <= STEP + 1e-6) return true;
    return false;
  };
  const extra = new Map();
  const link = (a, b) => (extra.get(a) ?? extra.set(a, []).get(a)).push(b);
  for (const v of map.vents) if (passable(v.at[0], v.at[1]) && passable(v.to[0], v.to[1])) link(key(v.at[0], v.at[1]), key(v.to[0], v.to[1]));
  for (const g of map.cars.length ? carLinks(map, STEP) : [])
    for (const a of g)
      for (const b of g)
        if (a !== b) {
          const rep = b.find(([x, z]) => passable(x, z));
          if (rep) for (const [ax, az] of a) if (passable(ax, az)) link(key(ax, az), key(rep[0], rep[1]));
        }
  const walk = (from, to) => {
    const start = key(from[0], from[1]),
      goal = key(to[0], to[1]),
      prev = new Map([[start, -1]]);
    let frontier = [start];
    while (frontier.length && !prev.has(goal)) {
      const next = [];
      for (const c of frontier) {
        const x = c % W,
          z = (c - x) / W;
        for (const [dx, dz] of STEPS) {
          const nx = x + dx,
            nz = z + dz;
          if (!passable(nx, nz) || !canStep(x, z, nx, nz)) continue;
          if (dx && dz && (!passable(x + dx, z) || !passable(x, z + dz))) continue;
          const n = key(nx, nz);
          if (!prev.has(n)) {
            prev.set(n, c);
            next.push(n);
          }
        }
        for (const n of extra.get(c) ?? [])
          if (!prev.has(n)) {
            prev.set(n, c);
            next.push(n);
          }
      }
      frontier = next;
    }
    if (!prev.has(goal)) return null;
    const path = [];
    for (let c = goal; c !== -1; c = prev.get(c)) path.push([c % W, Math.floor(c / W)]);
    return path.reverse();
  };
  // where a player can be without opening this door, every other door and lock worked
  const fromSpawn = (door) => {
    const seen = new Set([key(Math.floor(map.spawn.x / map.cell), Math.floor(map.spawn.z / map.cell))]),
      q = [...seen];
    const free = (x, z) => passable(x, z) || (map.kind(x, z) === 'door' && map.doorAt(x, z) !== door);
    while (q.length) {
      const c = q.pop(),
        x = c % W,
        z = (c - x) / W;
      for (const [dx, dz] of STEPS) {
        const nx = x + dx,
          nz = z + dz,
          n = key(nx, nz);
        if (seen.has(n) || !free(nx, nz) || !canStep(x, z, nx, nz)) continue;
        if (dx && dz && (!free(x + dx, z) || !free(x, z + dz))) continue;
        seen.add(n);
        q.push(n);
      }
      for (const n of extra.get(c) ?? [])
        if (!seen.has(n)) {
          seen.add(n);
          q.push(n);
        }
    }
    return seen;
  };
  const out = [];
  for (const d of map.doors.values()) {
    const x = d.cx,
      z = d.cz;
    const sides = doorSides(map, x, z);
    if (!sides || !wanted(d)) continue;
    skip = d;
    const ways = [walk(sides[0], sides[1]), walk(sides[1], sides[0])].filter(Boolean);
    if (!ways.length) continue;
    const path = ways.sort((a, b) => a.length - b.length)[0];
    // a way round that runs only from the far side (a drop off a terrace back to the field) skips nothing: nobody reaches its start without this door
    if (ways.length === 1 && !fromSpawn(d).has(key(path[0][0], path[0][1]))) continue;
    if (path.length > maxPath) continue;
    out.push({ at: [x, z], key: d.key ?? null, remote: !!d.remote, both: ways.length === 2, from: path[0], to: path[path.length - 1], cells: path.length, path });
  }
  return out;
}

/**
 * A KEY door a player can get round through plain doors alone: the hunt for the key was for nothing. (A door that opens after a fight may have a long
 * way round through another door: it shortens the walk back, and the room is still closed.)
 */
export const fakeLocks = (map) => doorBypasses(map, { wanted: (d) => !!d.key && !d.closet, through: (d) => !d.key && !d.remote });

/** everything wrong with a map's doors. `exceptions` = { 'x,z': why } for this map: a door that opens a shortcut and says so */
export function doorFaults(map, exceptions = {}) {
  const open = doorBypasses(map).map((d) => ({ ...d, fault: 'walked round' })),
    seen = new Set(open.map((d) => d.at.join())),
    locks = fakeLocks(map)
      .filter((d) => !seen.has(d.at.join()))
      .map((d) => ({ ...d, fault: 'key door got round through plain doors' }));
  return [...open, ...locks].filter((d) => !exceptions[d.at.join()]);
}
