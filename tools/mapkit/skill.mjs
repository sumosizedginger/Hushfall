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
  const before = map.entities.some((e) => e.skill || e.extra);
  map.entities = map.entities.filter((e) => e.skill !== 'hard' && !e.extra);
  for (const e of map.entities) delete e.skill;
  if (!side) return map;
  // a map a sidecar changed is not the map a mid-level save was made on (once: a second pass over a map that has no source changes nothing)
  if (!before) map.version = (map.version ?? 1) + 1;
  if (side.dropsHard && map.drops) map.drops = { ...map.drops, hard: side.dropsHard };
  // a key hunt: the door locked, the key where it was put with a light by it, and what the player says finding it
  for (const k of side.keys ?? []) {
    const d = (map.doors ?? []).find((q) => q.at[0] === k.door[0] && q.at[1] === k.door[1]);
    if (!d) throw new Error(`${map.id}: no door at [${k.door}] for a key`);
    d.key = k.key;
    map.entities.push({ type: 'pickup', kind: 'key_' + k.key, at: [...k.at], extra: true });
    if (k.lamp) map.entities.push({ type: 'prop', kind: 'lantern', at: [...k.lamp], extra: true });
    map.messages = [...(map.messages ?? []).filter((m) => m.id !== 'keyhunt'), { id: 'keyhunt', at: [...k.at], radius: 3, speaker: 'INES', text: k.line }];
  }
  // pickups a pass has added (in pairs: an odd number flips the steering side of every creature spawned later)
  for (const p of side.pickups ?? []) map.entities.push({ type: 'pickup', kind: p.kind, at: [...p.at], extra: true });
  for (const [x, z] of side.easy ?? []) {
    const e = map.entities.find((q) => q.type === 'enemy' && q.at[0] === x && q.at[1] === z);
    if (!e) throw new Error(`${map.id}: no creature at [${x}, ${z}] to leave out on Easy`);
    e.skill = 'normal';
  }
  for (const c of side.all ?? [])
    map.entities.push({ type: 'enemy', kind: c.kind, at: [...c.at], ...(c.facing != null ? { facing: c.facing } : {}), extra: true });
  for (const c of side.hard ?? [])
    map.entities.push({ type: 'enemy', kind: c.kind, at: [...c.at], ...(c.facing != null ? { facing: c.facing } : {}), skill: 'hard' });
  return map;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  for (const id of process.argv.slice(2)) {
    const file = path.join(root, 'maps', id + '.json'),
      map = JSON.parse(fs.readFileSync(file, 'utf8'));
    applySkill(map);
    fs.writeFileSync(file, JSON.stringify(map, null, 1).replace(/\[\s+(-?[\d.]+),\s+(-?[\d.]+)\s+\]/g, '[$1, $2]'));
    console.log(id, 'hard', map.entities.filter((e) => e.skill === 'hard').length, 'easy cuts', map.entities.filter((e) => e.skill === 'normal').length);
  }
}
