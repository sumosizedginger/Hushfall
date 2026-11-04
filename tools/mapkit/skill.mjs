// Placement by difficulty (PT-083 D2). A map's sidecar `maps-src/skill/<ID>.json` says, in the SHIPPED frame: { "hard": [{ "kind": "gaunt", "at": [x, z] }, ...], "easy": [[x, z], ...] }.
// `hard` creatures are appended at the very end of the entity list, so nothing on Easy or Normal changes id; the creature in an `easy` cell is left out on Easy only.
//   applySkill(map) is called by compile.mjs on the finished map; node tools/mapkit/skill.mjs <ID...> applies a sidecar to a map with no source (Marrow Quay) or checks one.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
export const sidecarFile = (id) => path.join(root, 'maps-src', 'skill', id + '.json');
export const readSidecar = (id) => {
  try {
    return JSON.parse(fs.readFileSync(sidecarFile(id), 'utf8'));
  } catch {
    return null;
  }
};

/** the map with its sidecar in force (idempotent: anything an earlier pass marked goes first) */
export function applySkill(map, side = readSidecar(map.id)) {
  map.entities = map.entities.filter((e) => e.skill !== 'hard');
  for (const e of map.entities) delete e.skill;
  if (!side) return map;
  for (const [x, z] of side.easy ?? []) {
    const e = map.entities.find((q) => q.type === 'enemy' && q.at[0] === x && q.at[1] === z);
    if (!e) throw new Error(`${map.id}: no creature at [${x}, ${z}] to leave out on Easy`);
    e.skill = 'normal';
  }
  for (const c of side.hard ?? [])
    map.entities.push({ type: 'enemy', kind: c.kind, at: [...c.at], ...(c.facing != null ? { facing: c.facing } : {}), skill: 'hard' });
  return map;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  for (const id of process.argv.slice(2)) {
    const file = path.join(root, 'maps', id + '.json'),
      map = JSON.parse(fs.readFileSync(file, 'utf8'));
    applySkill(map);
    fs.writeFileSync(file, JSON.stringify(map, null, 1));
    console.log(id, 'hard', map.entities.filter((e) => e.skill === 'hard').length, 'easy cuts', map.entities.filter((e) => e.skill === 'normal').length);
  }
}
