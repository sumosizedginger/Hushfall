// PT-082 (the Campaign 2 fun pass): a map drawn BY HAND. A plan is a picture in characters, one character a cell, and a legend says what each
// character is (the tile, its floor height and its lid);
// marker characters stand on the floor round them and say where things go. It is how the REDRAW maps of design/FUN_CHECK.md are made: a place drawn
// as a place, not a formula of boxes and rings.
//   const S = sketch(L, PLAN, { a: { t: '-', h: 0 }, b: { t: '.', h: 4, lid: 9 }, '#': { t: '$' } }, { marks: 'TG@X' });
//   for (const [x, z] of S.at('T')) E('tollbearer', x, z);   const [sx, sz] = S.one('@');
// PLAN is a template string; the newline after its backtick and its trailing empty lines are dropped (a blank row inside the picture stays a row) and
// a line's characters start at column 0 (so write the plan at the left margin of the file). A space leaves the cell as the Level's fill.
// A legend entry is { t: tile, h: floor height (0.5 m units) or (x, z) => height, c: absolute lid or lid: lid above the floor (both 0.5 m units;
// neither = open sky), fx: a floor effect }.
// A marker (a character of `marks`) takes the terrain of the first floor beside it (left, right, up, down; then the diagonals), so a creature or a
// lever can be drawn anywhere on a floor.
import { FLOOR_SKINS } from '../../src/engine/defs.js';
import { setCell } from './c2.mjs';

const FLOORS = new Set(Object.keys(FLOOR_SKINS));

export function sketch(L, plan, legend, { ox = 0, oz = 0, marks = '' } = {}) {
  const lines = plan.split(/\r?\n/);
  if (lines.length && lines[0] === '') lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const isMark = (ch) => marks.includes(ch),
    pos = new Map(),
    terrainOf = (ch) => legend[ch];
  // a roofed floor called 'T' and a creature called 'T' made 189 creatures once
  for (const ch of marks) if (legend[ch]) throw new Error(`sketch: '${ch}' is both a mark and a legend entry`);
  for (const line of lines)
    for (const ch of line) if (ch !== ' ' && !isMark(ch) && !legend[ch]) throw new Error(`sketch: '${ch}' is in the plan but neither in the legend nor a mark`);
  const at = (x, z) => lines[z]?.[x] ?? ' ';
  const floorAround = (x, z) => {
    for (const [dx, dz] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
      [-2, 0],
      [2, 0],
      [0, -2],
      [0, 2],
    ]) {
      const c = at(x + dx, z + dz),
        e = terrainOf(c);
      if (e && FLOORS.has(e.t)) return { e, x: x + dx, z: z + dz };
    }
    throw new Error(`sketch: the mark '${at(x, z)}' at ${x + ox},${z + oz} has no floor beside it`);
  };
  const paint = (e, x, z, ex = x, ez = z) => {
    const h = typeof e.h === 'function' ? e.h(ex + ox, ez + oz) : (e.h ?? null);
    const c = e.c != null ? e.c : e.lid != null ? (h ?? 0) + e.lid : null;
    setCell(L, x + ox, z + oz, e.t, h, c);
    if (e.fx) {
      L.usedFx = true;
      L.fxl[z + oz][x + ox] = e.fx;
    }
  };
  lines.forEach((line, z) =>
    [...line].forEach((ch, x) => {
      if (ch === ' ') return;
      if (isMark(ch)) {
        const f = floorAround(x, z);
        paint(f.e, x, z, f.x, f.z);
        const k = pos.get(ch) ?? [];
        k.push([x + ox, z + oz]);
        pos.set(ch, k);
        return;
      }
      paint(legend[ch], x, z);
    }),
  );
  const S = {
    w: Math.max(...lines.map((l) => [...l].length)),
    h: lines.length,
    at: (ch) => pos.get(ch) ?? [],
    one: (ch) => {
      const p = pos.get(ch) ?? [];
      if (p.length !== 1) throw new Error(`sketch: '${ch}' is marked ${p.length} times, wanted once`);
      return p[0];
    },
    cells: (ch) => {
      const out = [];
      lines.forEach((line, z) =>
        [...line].forEach((c, x) => {
          if (c === ch) out.push([x + ox, z + oz]);
        }),
      );
      return out;
    },
  };
  return S;
}
