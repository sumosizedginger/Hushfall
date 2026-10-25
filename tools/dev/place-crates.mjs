// Where do the heavy ammunition crates go? (FREEZE F8, src/engine/crate.js.) One in the secret room of the densest fight of every episode and act (the drop-fed economy is tightest there) and one in the cache of every secret map. Reads the SHIPPED map (none of
// these maps is squeezed, so the authoring cell and the shipped cell are the same), picks a free floor cell INSIDE the secret room (or, for a secret map, within a few cells of its first ammunition box) that is off the traffic of the routes
// (maps-src/lanes/<ID>.json, when it exists) and is not the cell of any other entity, and prints it; with --write it appends a block `FREEZE F8 ... end F8` to the map's source just before `export default MAP;` (idempotent: a source that has the block is left alone).
// Where the secret room has a cell off the traffic the crate takes it, so the route fingerprints do not move; where it has none (an Episode 3 closet) the secret route walks over it and is judged again by the gates.
//   node tools/dev/place-crates.mjs [--write]
import fs from 'node:fs';
import path from 'node:path';
import { FLOOR_SKINS } from '../../src/engine/defs.js';

const root = path.resolve(import.meta.dirname, '../..'), write = process.argv.includes('--write');
export const CRATE_MAPS = ['C1E1M05', 'C1E2M02', 'C1E3M03', 'C1E4M06', 'C2M05', 'C2M10', 'C2M18', 'C2M27', 'C1E1S01', 'C1E2S01', 'C1E3S01', 'C1E4S01', 'C2S01'];
const floor = (m, x, z) => x >= 0 && z >= 0 && x < m.grid[0].length && z < m.grid.length && Object.hasOwn(FLOOR_SKINS, m.grid[z][x]);

export function crateCell(id) {
  const m = JSON.parse(fs.readFileSync(path.join(root, 'maps', id + '.json'), 'utf8')), lanePath = path.join(root, 'maps-src', 'lanes', id + '.json');
  const lane = fs.existsSync(lanePath) ? new Set(JSON.parse(fs.readFileSync(lanePath, 'utf8'))) : new Set(), occupied = new Set(m.entities.filter((e) => e.at).map((e) => e.at.join(','))), laneNear = (x, z) => { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (lane.has((x + a) + ',' + (z + b))) return true; return false; };
  let candidates;
  if (m.secrets?.length) candidates = m.secrets.flatMap((s) => s.cells).filter(([x, z]) => floor(m, x, z));
  else { const box = m.entities.find((e) => e.type === 'pickup' && /^ammo_/.test(e.kind)); if (!box) return null; candidates = []; for (let dz = -5; dz <= 5; dz++) for (let dx = -5; dx <= 5; dx++) { const x = box.at[0] + dx, z = box.at[1] + dz; if (floor(m, x, z)) candidates.push([x, z]); } }
  const free = candidates.filter(([x, z]) => !occupied.has(x + ',' + z));                    // (an Episode 3 closet is three cells in a row that the secret route walks end to end: there the crate has to be on the traffic, and that route is judged again)
  const nearBox = (c) => Math.min(...m.entities.filter((e) => e.type === 'pickup').map((e) => Math.hypot(e.at[0] - c[0], e.at[1] - c[1])), 99);
  free.sort((a, b) => Number(lane.has(a.join(','))) - Number(lane.has(b.join(','))) || Number(laneNear(...a)) - Number(laneNear(...b)) || nearBox(a) - nearBox(b));                    // off the traffic and its neighbours first, then the one nearest the cache it sits beside
  return free.length ? free : null;
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('place-crates.mjs')) {
  for (const id of CRATE_MAPS) {
    const cells = crateCell(id); if (!cells) { console.log(id.padEnd(8), 'NO CELL'); continue; } const cell = cells[0], pair = id.includes('S0') ? null : cells[1] ?? null;      // (a creature a map spawns takes its steering side from the parity of its id: one new entity would flip it, so a map gets two, and a pickup of 15 hit points beside the crate is the second; a secret map spawns nothing)
    const file = path.join(root, 'maps-src', id + '.level.mjs'); let t = fs.readFileSync(file, 'utf8'); const has = t.includes('FREEZE F8');
    console.log(id.padEnd(8), `[${cell}]`, pair ? `+ dressing [${pair}]` : id.includes('S0') ? '' : '(no second cell: a lone crate; checked by the route fingerprints)', has ? '(block already in the source)' : write ? 'written' : '');
    if (write && !has) {
      const eol = t.includes('\r\n') ? '\r\n' : '\n'; t = t.replace(/\r\n/g, '\n'); const at = t.indexOf('export default MAP;'); if (at < 0) { console.log('  no "export default MAP;" in', id); continue; }
      const dressing = pair ? `, { type: 'pickup', kind: 'health_small', at: [${pair[0]}, ${pair[1]}] }` : '';
      const block = `// ---- FREEZE F8 (src/engine/crate.js): a heavy ammunition crate in the cache, appended after every other entity (no id shifts), with a dressing beside it where the room has a second cell (an even count of new entities keeps the id parity); off the traffic of the routes (tools/dev/place-crates.mjs) ----\nMAP.entities ??= []; MAP.entities.push({ type: 'pickup', kind: 'ammo_crate', at: [${cell[0]}, ${cell[1]}] }${dressing});\n// ---- end F8 ----\n\n`;
      fs.writeFileSync(file, (t.slice(0, at) + block + t.slice(at)).replace(/\n/g, eol));
    }
  }
}
