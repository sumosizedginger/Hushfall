// The floors every main map is held to (PT-083 L0): node tools/dev/floors.mjs [--json] [--no-routes] [ID ...]. Read-only, node only.
// A map may be excused from a floor only by a written reason in design/level-floors.json ("excused": { "ID": { "loop": "why" } }), and tests/level-floors.test.js holds both.
import fs from 'node:fs';
import path from 'node:path';
import { auditAll, routeStats } from './director-audit.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
export const FLOORS = {
  loop: 'at least one loop',
  firstFight: 'the first fight within 60 s of bot time',
  quiet: 'the longest walk with nothing awake under 90 m',
  mirror: 'mirror overlap under 0.9',
  density: 'at least 18 creatures per thousand walkable cells',
  secrets: 'two secrets of two kinds',
  gate: 'a gate beyond walking to the exit',
  moment: 'a named moment',
};
export const FLOOR_DOC = path.join(ROOT, 'design', 'level-floors.json');
export const readFloorDoc = () => (fs.existsSync(FLOOR_DOC) ? JSON.parse(fs.readFileSync(FLOOR_DOC, 'utf8')) : { excused: {}, moments: {} });

/** what a map fails: { floor: detail } */
export function failing(row, route, map, doc = readFloorDoc()) {
  const out = {},
    ex = doc.excused?.[row.id] ?? {},
    kinds = new Set((map.secrets ?? []).map((s) => s.open ?? 'use')),
    gates =
      (row.keys ?? 0) > 0 ||
      (row.switches ?? 0) > 0 ||
      (map.exits ?? []).some((e) => e.locked) ||
      (map.triggers ?? []).some((t) => JSON.stringify(t.do ?? '').includes('"open"') || JSON.stringify(t.do ?? '').includes('unlock'));
  const fail = (k, detail) => {
    if (!ex[k]) out[k] = detail;
  };
  if (!row.loops && !row.roomLoops) fail('loop', 'no loop');
  if (route && (route.firstFightS == null || route.firstFightS > 60)) fail('firstFight', `first fight at ${route.firstFightS ?? 'never'} s`);
  if (route && route.longestWalkM > 90) fail('quiet', `quiet walk of ${route.longestWalkM} m`);
  if (row.symmetry >= 0.9) fail('mirror', `mirror overlap ${row.symmetry}`);
  if (row.density < 18) fail('density', `${row.density} per thousand`);
  if ((map.secrets ?? []).length < 2 || kinds.size < 2) fail('secrets', `${(map.secrets ?? []).length} secrets, ${kinds.size} kind(s)`);
  if (!gates) fail('gate', 'nothing stands between the start and the exit but walking');
  if (!doc.moments?.[row.id]) fail('moment', 'no moment written');
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const args = process.argv.slice(2),
    named = args.filter((a) => !a.startsWith('--')),
    rows = auditAll().filter((r) => /M/.test(r.id.slice(2)) && (!named.length || named.includes(r.id))),
    doc = readFloorDoc(),
    result = [];
  for (const r of rows) {
    const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', r.id + '.json'), 'utf8')),
      rt = args.includes('--no-routes') ? null : routeStats(r.id),
      f = failing(r, rt, map, doc);
    result.push({ id: r.id, name: r.name, fails: f, keys: r.keys, loops: r.loops, density: r.density, symmetry: r.symmetry, secrets: r.secrets, route: rt });
    if (!args.includes('--json')) console.log(`${r.id} ${r.name}: ${Object.values(f).join('; ') || 'ok'}`);
  }
  const keyed = rows.filter((r) => r.keys > 0).length;
  if (args.includes('--json')) console.log(JSON.stringify({ keyed, total: rows.length, result }, null, 1));
  else
    console.log(
      `\n${result.filter((x) => Object.keys(x.fails).length).length} of ${result.length} maps fail something; ${keyed} of ${rows.length} have a key hunt (the floor is a third)`,
    );
}
