// Automap model: what the player has actually seen, as plain data. The sim records exploration (deterministic, saved);
// this module only turns it into a drawable description, so it is testable without a canvas.
import { cellSolid } from './world.js';

export const EXPLORE_RADIUS_CELLS = 5;
export const EXPLORE_EVERY_TICKS = 6;

/** Can the player see cell (cx,cz)? The ray stops as soon as it ENTERS the target cell, so a solid cell (wall, closed door) is seen by its near face. */
function canSee(w, cx, cz) {
  const S = w.map.cell, p = w.player, x1 = (cx + 0.5) * S, z1 = (cz + 0.5) * S, d = Math.hypot(x1 - p.x, z1 - p.z), n = Math.max(1, Math.ceil(d / 0.3));
  for (let i = 1; i <= n; i++) {
    const x = p.x + (x1 - p.x) * i / n, z = p.z + (z1 - p.z) * i / n, px = Math.floor(x / S), pz = Math.floor(z / S);
    if (px === cx && pz === cz) return true;
    if (cellSolid(w, px, pz)) return false;
  }
  return true;
}

/** Mark cells in line of sight within the radius as seen. Called by the sim every few ticks. */
export function updateExplored(w) {
  const m = w.map, p = w.player, S = m.cell, size = m.w * m.h;
  if (!Array.isArray(w.explored) || w.explored.length !== size) w.explored = new Array(size).fill(0);     // lazily created (also covers saves from before the automap)
  const pcx = Math.floor(p.x / S), pcz = Math.floor(p.z / S), R = EXPLORE_RADIUS_CELLS;
  for (let cz = Math.max(0, pcz - R); cz <= Math.min(m.h - 1, pcz + R); cz++) for (let cx = Math.max(0, pcx - R); cx <= Math.min(m.w - 1, pcx + R); cx++) {
    const i = cz * m.w + cx; if (w.explored[i]) continue;
    const x = (cx + 0.5) * S, z = (cz + 0.5) * S;
    if (Math.hypot(x - p.x, z - p.z) <= R * S && (cx === pcx && cz === pcz || canSee(w, cx, cz))) w.explored[i] = 1;
  }
}

/**
 * Drawable description of the explored level.
 * cells: only explored cells, with a kind of 'floor' | 'outdoor' | 'wall' | 'door' | 'secret-revealed'.
 * A secret panel that has not been opened is reported as a plain wall, so the automap never gives it away.
 */
export function automapModel(w) {
  const m = w.map, cells = [], doors = [], exits = [];
  const seen = (cx, cz) => Array.isArray(w.explored) && cx >= 0 && cz >= 0 && cx < m.w && cz < m.h && w.explored[cz * m.w + cx] === 1;
  for (let cz = 0; cz < m.h; cz++) for (let cx = 0; cx < m.w; cx++) {
    if (!seen(cx, cz)) continue;
    let kind = m.kind(cx, cz);
    const door = w.doors.find((d) => d.cx === cx && d.cz === cz);
    if (kind === 'secret') kind = door && door.open > 0 ? 'secret-revealed' : 'wall';
    cells.push({ cx, cz, kind });
    if (kind === 'door') doors.push({ cx, cz, key: door?.key ?? null, open: door?.open ?? 0, axis: m.doorAxis(cx, cz) });
  }
  for (const e of m.exits) if (seen(Math.floor(e.x / m.cell), Math.floor(e.z / m.cell))) exits.push({ x: e.x, z: e.z });
  return { w: m.w, h: m.h, cell: m.cell, name: m.name, cells, doors, exits, player: { x: w.player.x, z: w.player.z, yaw: w.player.yaw }, kills: w.stats.kills, secrets: w.stats.secrets, totals: w.stats.total, exploredCount: cells.length };
}
