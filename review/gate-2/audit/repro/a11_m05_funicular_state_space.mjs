// A11: state-space search of M05's funicular. State = (player cell, car high?). Transitions: walk (step up <= 0.6 m, any drop), or operate a switch the
// player can use from that cell (switch cell, |switch.fy - floor under the player| < 1.5 as in world.useTarget). Reports states reachable from spawn (car low)
// from which the exit can no longer be reached (softlock states).
// Run: node review/gate-2/audit/repro/a11_m05_funicular_state_space.mjs
import { loadMapFile } from '../../../../src/engine/harness.js';
import { PROPS, STEP } from '../../../../src/engine/defs.js';
const map = loadMapFile('maps/C1E1M05.json'), W = map.w, H = map.h;
const car = map.sectors[0], carCells = new Set(car.cells.map((c) => c.join(',')));
const blocked = new Set(map.props.filter((p) => PROPS[p.kind]?.blocksCell).map((p) => Math.floor(p.at[0]) + ',' + Math.floor(p.at[1])));
const floorNow = (cx, cz, high) => (carCells.has(cx + ',' + cz) ? (high ? car.high : car.low) : map.floor(cx, cz));
const pass = (cx, cz) => { if (cx < 0 || cz < 0 || cx >= W || cz >= H) return false; const k = map.kind(cx, cz); return (k === 'floor' || k === 'outdoor' || k === 'door') && !blocked.has(cx + ',' + cz); };
const sw = map.switches.filter((s) => s.do.some((a) => a.sector)); // car-up, car-down
const key = (cx, cz, h) => cx + ',' + cz + ',' + (h ? 1 : 0);
// switch usable from a cell within reach: the real rule is distance < useReach (2.3 m) to the switch panel, facing it, and |fy - p.y| < 1.5
const usable = (cx, cz, high) => sw.filter((s) => { const px = (cx + 0.5) * map.cell, pz = (cz + 0.5) * map.cell; return Math.hypot(s.px - px, s.pz - pz) < 2.3 && Math.abs(s.fy - floorNow(cx, cz, high)) < 1.5; });
function neighbours(cx, cz, h) {
  const out = [];
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, nz = cz + dz; if (pass(nx, nz) && floorNow(nx, nz, h) - floorNow(cx, cz, h) <= STEP + 1e-6) out.push([nx, nz, h]); }
  for (const s of usable(cx, cz, h)) for (const a of s.do) if (a.sector) { const nh = a.sector.to === 'high'; if (nh !== h) out.push([cx, cz, nh]); }
  return out;
}
const spawn = [Math.floor(map.spawn.x / map.cell), Math.floor(map.spawn.z / map.cell)];
const seen = new Map([[key(spawn[0], spawn[1], false), [spawn[0], spawn[1], false]]]), q = [[spawn[0], spawn[1], false]], edges = new Map();
while (q.length) { const s = q.pop(), ns = neighbours(...s); edges.set(key(...s), ns); for (const n of ns) if (!seen.has(key(...n))) { seen.set(key(...n), n); q.push(n); } }
// reverse reachability to exit cell in either car state
const rev = new Map(); for (const [k, ns] of edges) for (const n of ns) { const kk = key(...n); if (!rev.has(kk)) rev.set(kk, []); rev.get(kk).push(k); }
const good = new Set(), gq = []; for (const e of map.exits) for (const h of [false, true]) { const k = key(Math.floor(e.at[0]), Math.floor(e.at[1]), h); if (seen.has(k)) { good.add(k); gq.push(k); } }
while (gq.length) { const k = gq.pop(); for (const p of rev.get(k) || []) if (!good.has(p)) { good.add(p); gq.push(p); } }
const bad = [...seen.keys()].filter((k) => !good.has(k));
console.log('M05 states reachable:', seen.size, ' states with no route to the exit:', bad.length);
console.log('sample softlock states (cx,cz,carHigh):', bad.slice(0, 20).join(' | '));
console.log('switch fy/px/pz:', sw.map((s) => `${s.id} fy=${s.fy} at=${s.at} px=${s.px.toFixed(2)} pz=${s.pz.toFixed(2)}`).join(' ; '));

// Is the car required at all? Search with switch use disabled (car stays low): can the exit cell still be reached by walking?
{
  const seen2 = new Set([key(spawn[0], spawn[1], false)]), q2 = [[spawn[0], spawn[1], false]];
  while (q2.length) { const [cx, cz, h] = q2.pop(); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, nz = cz + dz; if (pass(nx, nz) && floorNow(nx, nz, false) - floorNow(cx, cz, false) <= STEP + 1e-6 && !seen2.has(key(nx, nz, false))) { seen2.add(key(nx, nz, false)); q2.push([nx, nz, false]); } } }
  const ex = map.exits[0], ek = key(Math.floor(ex.at[0]), Math.floor(ex.at[1]), false);
  console.log('exit reachable with the funicular car never used (car stays low):', seen2.has(ek), '| cells reachable', seen2.size);
}
