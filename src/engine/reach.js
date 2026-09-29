// Static reachability on the cell grid: can the player get from spawn to the exit, given keys and doors?
// Conservative: 4-connected cell walking; cells holding cell-blocking props are impassable.
import { PICKUPS, PROPS } from './defs.js';

export function analyseReach(map) {
  const blocked = new Set(map.props.filter((p) => PROPS[p.kind]?.blocksCell).map((p) => Math.floor(p.at[0]) + ',' + Math.floor(p.at[1])));
  const keys = new Set(), reach = new Set();
  const cellOf = (e) => [Math.floor(e.at[0]), Math.floor(e.at[1])];
  const passable = (cx, cz) => {
    const k = map.kind(cx, cz);
    if (blocked.has(cx + ',' + cz)) return false;
    if (k === 'floor' || k === 'outdoor' || k === 'secret') return true;         // secret panels are opened with Use
    if (k === 'door') { const d = map.doorAt(cx, cz); return !d.key || keys.has(d.key); }
    return false;
  };
  let changed = true;
  while (changed) {
    changed = false;
    reach.clear();
    const [sx, sz] = [Math.floor(map.spawn.x / map.cell), Math.floor(map.spawn.z / map.cell)];
    const q = [[sx, sz]]; reach.add(sx + ',' + sz);
    while (q.length) {
      const [cx, cz] = q.pop();
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, nz = cz + dz, k = nx + ',' + nz;
        if (!reach.has(k) && passable(nx, nz)) { reach.add(k); q.push([nx, nz]); }
      }
    }
    for (const e of map.entities) if (e.type === 'pickup' && PICKUPS[e.kind].key) {
      const [cx, cz] = cellOf(e);
      if (reach.has(cx + ',' + cz) && !keys.has(PICKUPS[e.kind].key)) { keys.add(PICKUPS[e.kind].key); changed = true; }
    }
  }
  const at = (e) => reach.has(cellOf(e).join(','));
  return {
    keysObtainable: [...keys],
    exitReachable: map.exits.every(at) && map.exits.length > 0,
    unreachable: map.entities.filter((e) => e.type !== 'player' && !(e.type === 'prop' && PROPS[e.kind]?.blocksCell) && !at(e)).map((e) => ({ type: e.type, kind: e.kind ?? null, at: e.at })),
    secretsReachable: map.secrets.map((s) => ({ id: s.id, reachable: s.cells.every(([cx, cz]) => reach.has(cx + ',' + cz)) })),
    reachableCells: reach.size,
  };
}
