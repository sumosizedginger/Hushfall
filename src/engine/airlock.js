// AIRLOCKS AND VACUUM (PT-033, Episode 4 Batch C, design/EPISODE4.md E2). PURE reads of the sim's doors; the sim keeps the door states and the player's lazy `p.vac`, the view frosts the screen, the audio announces it.
//   interlock  a door entry `interlock: [x, z]` (its partner's cell, and the partner says the same) refuses Use while the partner is open or opening, and for LOCK.cycle seconds after the partner has shut (the pressure equalising):
//              you can never open both doors of an airlock at once, which is what an airlock is. Enemies do not open doors, so a lock is a room they cannot follow you through.
//   vacuum     a map's `vacuum: [{ rect: [x0, z0, x1, z1], seals: [[x, z], ...], and: [[x, z], ...] }]` is in VACUUM while ANY of its seals (a hull door open to the dark) is open and EVERY door in `and` is open (a lock's outer door).
//              The player there takes VACUUM.dps a second (scaled by the difficulty, as a toxic bed is); creatures are grown for it and do not mind. Shutting the seal (a script `close`) ends it.
import { LOCK } from './defs.js';

const doorAt = (w, [cx, cz]) => w.doors.find((d) => d.cx === cx && d.cz === cz);
/** is this door's lock partner busy: open, opening, or shut less than LOCK.cycle seconds ago? */
export function lockBusy(w, d) {
  if (!d?.interlock) return false;
  const p = doorAt(w, d.interlock); if (!p) return false;
  return p.target === 1 || p.open > 0 || w.time - (p.closedAt ?? -99) < LOCK.cycle;
}
/** is the region in vacuum right now? */
export function vacuumOn(w, v) {
  const open = (c) => { const d = doorAt(w, c); return !!d && (d.open > 0.05 || d.target === 1); };
  return v.seals.some(open) && (v.and ?? []).every(open);
}
/** is the point (x, z) metres in vacuum? */
export function inVacuum(w, x, z) {
  const m = w.map; if (!m.vacuum?.length) return false;
  const cx = Math.floor(x / m.cell), cz = Math.floor(z / m.cell);
  for (const v of m.vacuum) if (cx >= v.rect[0] && cz >= v.rect[1] && cx <= v.rect[2] && cz <= v.rect[3] && vacuumOn(w, v)) return true;
  return false;
}
