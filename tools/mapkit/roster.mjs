// THE ROSTER PASS (PT-052, R2 of the Director's Plan): change WHICH creature stands where without moving anyone. A map source calls `reroster(L, ...)` after its objects are placed and before `L.layers()`; it turns some of the creatures
// of one kind into another kind (a Tollbearer into a Bellhand that can see the lane, into a Gaunt that meets you in the open), chosen by what the cell is for, never at random, and the same choice every time. Node only.
//   reroster(L, { lane, plan: [{ from: 't', to: 'b', n: 4, pick: 'range' }, { from: 't', to: 'g', n: 3, pick: 'spread' }], keep: [[x, z], ...] })   -> { changed: [{ from, to, at }], left: { t: n, ... } }
//   pick 'range'  : cells that SEE the lane from 6 to 18 cells away (a shooter has something to shoot at), best first, no two within `sep` cells of each other
//   pick 'spread' : the candidates sorted along the map and taken at even intervals (the pack is spread through the map, not one end of it)
//   `keep`: cells that never change (a creature a switch, a group or a message refers to by position); `lane`: the map's traffic (shape.mjs laneOf), or null (then range falls back to the map's open floor)
// A creature is a LEGEND character ('t' Tollbearer, 'g' Gaunt, 'b' Bellhand ...). Only the objects layer of the Level changes; the map's own enemy count stays the same.
import { FLOOR_SKINS } from '../../src/engine/defs.js';

const FLOOR = new Set(Object.keys(FLOOR_SKINS));
const floor = (L, x, z) => FLOOR.has(L.get(x, z));
function sees(L, a, b) {                                                       // a straight line over floor (a door, a wall or a panel stops it; props are ignored: an upper bound)
  const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); for (let i = 1; i < n; i++) if (!floor(L, Math.round(a[0] + (b[0] - a[0]) * i / n), Math.round(a[1] + (b[1] - a[1]) * i / n))) return false; return true;
}

export function reroster(L, { id = null, lane = null, plan, keep = [], sep = 5 }) {
  if (id && process.env.ROSTER_ID === id && process.env.ROSTER_PLAN) plan = JSON.parse(process.env.ROSTER_PLAN);          // tools/dev/tune-roster.mjs tries other plans without editing the source
  const kept = new Set(keep.map(([x, z]) => x + ',' + z)), changed = [], laneCells = lane ? [...lane].map((k) => k.split(',').map(Number)) : null;
  const taken = new Set();
  for (const step of plan) {
    const cand = []; for (let z = 0; z < L.h; z++) for (let x = 0; x < L.w; x++) if (L.ob[z][x] === step.from && !kept.has(x + ',' + z) && !taken.has(x + ',' + z)) cand.push([x, z]);
    if (cand.length < step.n) throw new Error(`reroster: wanted ${step.n} of '${step.from}' to change, the map has ${cand.length}`);
    let picked = [];
    if (step.pick === 'range') {
      const sample = laneCells ? laneCells.filter((_, i) => i % 3 === 0) : null, scored = cand.map(([x, z]) => {
        let s = 0; if (sample) { for (const [lx, lz] of sample) { const d = Math.hypot(lx - x, lz - z); if (d >= 6 && d <= 18 && sees(L, [x, z], [lx, lz])) s++; } } else { for (let a = 0; a < 16; a++) { let d = 0; for (; d < 18; d++) if (!floor(L, Math.round(x + Math.cos(a * Math.PI / 8) * d), Math.round(z + Math.sin(a * Math.PI / 8) * d))) break; if (d >= 8) s++; } }
        return { x, z, s };
      }).sort((p, q) => q.s - p.s || p.z - q.z || p.x - q.x);
      for (const c of scored) { if (picked.length >= step.n) break; if (picked.every((q) => Math.hypot(q[0] - c.x, q[1] - c.z) >= sep)) picked.push([c.x, c.z]); }
      for (const c of scored) { if (picked.length >= step.n) break; if (!picked.some((q) => q[0] === c.x && q[1] === c.z)) picked.push([c.x, c.z]); }       // not enough spread cells: take the next best
    } else {
      const sorted = cand.sort((p, q) => p[0] - q[0] || p[1] - q[1]); for (let i = 0; i < step.n; i++) picked.push(sorted[Math.min(sorted.length - 1, Math.floor((i + 0.5) * sorted.length / step.n))]);
    }
    for (const [x, z] of picked) { L.ob[z][x] = step.to; taken.add(x + ',' + z); changed.push({ from: step.from, to: step.to, at: [x, z] }); }
  }
  const left = {}; for (let z = 0; z < L.h; z++) for (let x = 0; x < L.w; x++) { const c = L.ob[z][x]; if (c !== '.' && ' tgbxwK'.includes(c)) left[c] = (left[c] ?? 0) + 1; }
  return { changed, left };
}
