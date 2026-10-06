// Placement lint (PT-007, the owner: "are we inside or outside? ... you need to build this right"). The simulation gates and the real-game evidence cannot see that a map READS as indoors in
// the open: a bot walks under a floating ceiling slab without noticing. Two rules, both about what the level mesh will DRAW (src/render/levelmesh.js: a cell of kind floor / door / secret gets a ceiling):
//   roofed-has-walls      every connected region of roofed cells has more wall edges than open edges. A bridge made of an indoor floor skin is a roofed region with no walls: a slab hanging in the sky.
//   hung-props-have-roof  a ceiling-hung prop (lamp, pod, cradle) stands on a roofed cell. In open air it floats at the ceiling height with its wire.
// Used by tools/verify-map.mjs (so by `npm run map`). Pure: takes a parsed map (src/engine/mapformat.js).
import { mapFeel } from './dev/map-feel.mjs';

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

// ---- the space contract (PT-008, design/CAMPAIGN_SPINE.md section 2): a map declares HOW it is shaped, and the measured grid must agree ----------------------------------------------------
// quality.scaleClass  COMPRESSION: >= 80% of the walkable cells roofed, 90th-percentile sightline <= 20 m
//                     MIXED:       40-80% roofed, sightline <= 30 m
//                     SET-PIECE:   an open arena (< 40% roofed); needs quality.reason (why the player crosses open ground), at most one per episode, never the opener (a human check: the brief)
// quality.introduces  the one new thing the map teaches (enemy, weapon, hazard, mechanic or alien reveal), in words
// ceilingHeight       4.2 m or less; taller only with quality.tallReason (a named hall or cathedral)
// Episode 1 (approved before the contract existed) is grandfathered; every later map must declare.
export const SCALE_CLASSES = { COMPRESSION: { minRoofed: 80, maxSight: 20 }, MIXED: { minRoofed: 40, maxRoofed: 80, maxSight: 30 }, 'SET-PIECE': { maxRoofed: 39.99, maxSight: Infinity } };
const GRANDFATHERED = /^C1E1/;

export function feelChecks(src) { return GRANDFATHERED.test(src.id) ? [] : contractChecks(src, mapFeel(src)); }
/** the checks themselves, on a map source and its measured feel (a test passes made-up numbers; the pipeline passes mapFeel(src)) */
export function contractChecks(src, f) {
  const q = src.quality ?? {}, checks = [], add = (name, ok, detail) => checks.push({ name: 'feel: ' + name, ok: !!ok, detail });
  const cls = SCALE_CLASSES[q.scaleClass];
  add('the map declares a scale class (COMPRESSION, MIXED or SET-PIECE)', !!cls, cls ? q.scaleClass : `quality.scaleClass is ${JSON.stringify(q.scaleClass)}`);
  if (cls) {
    const fits = (cls.minRoofed == null || f.roofedPct >= cls.minRoofed) && (cls.maxRoofed == null || f.roofedPct <= cls.maxRoofed) && f.sightP90 <= cls.maxSight;
    add(`the measured map is ${q.scaleClass}`, fits, `${f.roofedPct}% roofed, p90 sightline ${f.sightP90} m (${q.scaleClass}: ${cls.minRoofed != null ? '>= ' + cls.minRoofed + '% roofed' : ''}${cls.maxRoofed != null ? ' <= ' + Math.floor(cls.maxRoofed) + '% roofed' : ''}${cls.maxSight !== Infinity ? ', sightline <= ' + cls.maxSight + ' m' : ''})`);
    if (q.scaleClass === 'SET-PIECE') add('a set-piece names its reason (quality.reason)', typeof q.reason === 'string' && q.reason.length > 10, q.reason ?? 'missing');
  }
  add('the map names the one new thing it introduces (quality.introduces)', typeof q.introduces === 'string' && q.introduces.length > 10, q.introduces ?? 'missing');
  add('walls and ceilings are 4.2 m or less (or quality.tallReason names the hall)', f.ceiling <= 4.2 || (typeof q.tallReason === 'string' && q.tallReason.length > 10), `ceilingHeight ${f.ceiling}`);
  // beats: the objective the map starts with plus the ones its triggers and switches set; a main map also hides at least one secret (design/CAMPAIGN_SPINE.md section 4)
  const actions = [...(src.triggers ?? []).flatMap((t) => t.do ?? []), ...(src.entities ?? []).filter((e) => e.type === 'switch').flatMap((e) => e.do ?? [])];
  const beats = new Set([src.objective, ...actions.map((a) => a.objective)].filter((x) => typeof x === 'string' && x.length));
  add('the map has three or more objective beats (the starting objective and the ones its triggers and switches set)', beats.size >= 3, `${beats.size} beats`);
  if (/M\d\d$/.test(src.id)) add('a main map hides at least one secret', (src.secrets ?? []).length >= 1, `${(src.secrets ?? []).length} secrets`);
  return checks;
}
