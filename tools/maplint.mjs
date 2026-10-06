// Placement lint (PT-007, the owner: "are we inside or outside? ... you need to build this right"). The simulation gates and the real-game evidence cannot see that a map READS as indoors in
// the open: a bot walks under a floating ceiling slab without noticing. Two rules, both about what the level mesh will DRAW (src/render/levelmesh.js: a cell of kind floor / door / secret gets a ceiling):
//   roofed-has-walls      every connected region of roofed cells has more wall edges than open edges. A bridge made of an indoor floor skin is a roofed region with no walls: a slab hanging in the sky.
//   hung-props-have-roof  a ceiling-hung prop (lamp, pod, cradle) stands on a roofed cell. In open air it floats at the ceiling height with its wire.
// Used by tools/verify-map.mjs (so by `npm run map`). Pure: takes a parsed map (src/engine/mapformat.js).
const ROOFED = new Set(['floor', 'door', 'secret']);          // = hasCeil in levelmesh.js
const HUNG = new Set(['lamp', 'pod', 'cradle']);              // props that hang from the ceiling height (levelmesh.js: m.position.set(p.x, cy, p.z))

export function mapLintChecks(map) {
  const checks = [], cells = (x, z) => map.kind(x, z);
  // 1. roofed regions and their walls
  const seen = new Set(), bad = [];
  for (let z = 0; z < map.h; z++) for (let x = 0; x < map.w; x++) {
    if (!ROOFED.has(cells(x, z)) || seen.has(x + ',' + z)) continue;
    const stack = [[x, z]]; seen.add(x + ',' + z); let walls = 0, open = 0, n = 0, first = [x, z];
    while (stack.length) {
      const [cx, cz] = stack.pop(); n++;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, nz = cz + dz, k = nx < 0 || nz < 0 || nx >= map.w || nz >= map.h ? 'wall' : cells(nx, nz);
        if (ROOFED.has(k)) { if (!seen.has(nx + ',' + nz)) { seen.add(nx + ',' + nz); stack.push([nx, nz]); } } else if (k === 'wall') walls++; else open++;
      }
    }
    if (open > walls) bad.push({ at: first, cells: n, walls, open });
  }
  checks.push({ name: 'placement: every roofed region has walls (a floating ceiling slab over open ground is a map that reads as indoors outside)', ok: bad.length === 0,
    detail: bad.length ? bad.slice(0, 4).map((b) => `${b.cells} roofed cells near ${b.at} have ${b.walls} wall edges and ${b.open} open edges`).join('; ') : 'ok' });
  // 2. ceiling-hung props under a roof
  const floating = map.props.filter((p) => HUNG.has(p.kind) && !ROOFED.has(cells(Math.floor(p.x / map.cell), Math.floor(p.z / map.cell))));
  checks.push({ name: 'placement: ceiling-hung props (lamp, pod, cradle) stand under a roof, not in open air', ok: floating.length === 0,
    detail: floating.length ? `${floating.length} floating: ` + floating.slice(0, 6).map((p) => `${p.kind}@${Math.floor(p.x / map.cell)},${Math.floor(p.z / map.cell)}`).join(' ') : 'ok' });
  return checks;
}
