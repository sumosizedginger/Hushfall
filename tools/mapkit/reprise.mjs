// THE REPRISE (PT-046, design/ACTC.md C2M23): the harbour copied wrong. This reads the shipped plan of Marrow Quay (maps/C1E1M01.json: it has no source, only a JSON) and gives a map source the pieces to stamp it again, MIRRORED east to west, in crystal and bone:
// a cell is turned by `skin`, a position by `at`, an entity by `entity`, and the canonical route's ops by `routeOp`. Pure functions over the committed JSON (node only, no browser), like tools/dev/reshape-m01.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const QUAY = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps/C1E1M01.json'), 'utf8'));
export const QUAY_ROUTE = JSON.parse(fs.readFileSync(path.join(ROOT, 'routes/C1E1M01.main.route.json'), 'utf8'));
export const QW = QUAY.grid[0].length, QH = QUAY.grid.length;                       // 48 x 34

/** the stamp: where the mirrored Quay's cell (0, 0) lands in the new map (the new x of an original x is ox + QW - 1 - x) */
export function reprise(ox, oz) {
  const at = ([x, z]) => [ox + QW - 1 - Math.floor(x), oz + Math.floor(z)];
  const SKIN = { '~': '~', B: 'η', '#': 'γ', ':': 'Η', p: 'Η', '.': 'Ζ', D: 'D', S: 'η' };         // water stays water (glass, in the look); brick turns to crystal, cobbles and planks to crystal pavement, interiors to pale slate
  const cells = [];
  for (let z = 0; z < QH; z++) for (let x = 0; x < QW; x++) { const c = QUAY.grid[z][x], [nx, nz] = at([x, z]); cells.push({ x: nx, z: nz, from: [x, z], ch: SKIN[c] ?? 'η', orig: c }); }
  const entity = (e) => ({ ...e, at: at(e.at) });
  const routeOp = (o) => (o.at ? { ...o, at: at(o.at) } : { ...o });
  return { at, cells, entity, routeOp, doors: QUAY.doors.map((d) => ({ at: at(d.at), key: d.key })), secrets: QUAY.secrets, entities: QUAY.entities.map(entity), route: QUAY_ROUTE.map(routeOp) };
}
