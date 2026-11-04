// Placement by difficulty (PT-083 D2). A map's sidecar `maps-src/skill/<ID>.json` says, in the SHIPPED frame: { "hard": [{ "kind": "gaunt", "at": [x, z] }, ...] }.
// `hard` creatures are appended at the very end of the entity list, so nothing on Easy or Normal changes id. Easy has every creature Normal has (the owner, 2026-11-04: leaving
// creatures out made Easy far too easy); it differs by what they do to you and what you find.
//   applySkill(map) is called by compile.mjs on the finished map; node tools/mapkit/skill.mjs <ID...> applies a sidecar to a map with no source (Marrow Quay) or checks one.
import fs from 'node:fs';
import path from 'node:path';
import { WALL_SKINS } from '../../src/engine/defs.js';

const root = path.resolve(import.meta.dirname, '../..');
export const sidecarFile = (id) => path.join(root, 'maps-src', 'skill', id + '.json');
export const readSidecar = (id) => {
  try {
    return JSON.parse(fs.readFileSync(sidecarFile(id), 'utf8'));
  } catch {
    return null;
  }
};

/**
 * A door must close something (src/engine/doorways.js): `walls` fills a gap beside a door (with the wall next to it), `doors` sets a door in a way round,
 * or gives an existing door a key: { at: [x, z], key?, why }. Run with the door check after any change: `node tools/dev/door-bypass.mjs <ID>`.
 */
function closeDoorways(map, side) {
  const put = (x, z, c) => {
    map.grid[z] = map.grid[z].slice(0, x) + c + map.grid[z].slice(x + 1);
  };
  const isWall = (c) => c === '#' || c in WALL_SKINS;
  // the nearest wall's skin, so the new stretch matches what it joins
  const skinNear = (x, z) => {
    for (let r = 1; r <= 4; r++)
      for (let b = -r; b <= r; b++)
        for (let a = -r; a <= r; a++) {
          const c = map.grid[z + b]?.[x + a];
          if (Math.max(Math.abs(a), Math.abs(b)) === r && c && isWall(c)) return c;
        }
    return null;
  };
  for (const [x, z] of side.walls ?? []) {
    const beside = skinNear(x, z);
    if (!beside) throw new Error(`${map.id}: no wall near [${x}, ${z}] to copy`);
    if (map.entities.some((e) => e.at && Math.floor(e.at[0]) === x && Math.floor(e.at[1]) === z)) throw new Error(`${map.id}: something stands at [${x}, ${z}]: no wall there`);
    put(x, z, beside);
  }
  for (const d of side.doors ?? []) {
    const old = (map.doors ?? []).find((q) => q.at[0] === d.at[0] && q.at[1] === d.at[1]);
    if (old) {
      if (d.key) old.key = d.key;
      continue;
    }
    put(d.at[0], d.at[1], 'D');
    (map.doors ??= []).push({ at: [...d.at], ...(d.key ? { key: d.key } : {}) });
  }
}

/** the map with its sidecar in force (idempotent: anything an earlier pass marked goes first) */
export function applySkill(map, side = readSidecar(map.id)) {
  const before = map.entities.some((e) => e.skill || e.extra);
  map.entities = map.entities.filter((e) => e.skill !== 'hard' && !e.extra);
  for (const e of map.entities) delete e.skill;
  if (!side) return map;
  // a map a sidecar changed is not the map a mid-level save was made on (once: a second pass over a map that has no source changes nothing)
  if (!before) map.version = (map.version ?? 1) + 1;
  map.version = (map.version ?? 1) + (before ? 0 : (side.bump ?? 0));
  closeDoorways(map, side);
  if (side.dropsHard && map.drops) map.drops = { ...map.drops, hard: side.dropsHard };
  // a key hunt: the door locked, the key where it was put with a light by it, and what the player says finding it
  for (const k of side.keys ?? []) {
    if (k.lever) {
      const sw = map.entities.find((e) => e.type === 'switch' && e.id === k.lever);
      if (!sw) throw new Error(`${map.id}: no lever ${k.lever} for a key`);
      sw.needs = [k.key];
    } else {
      const d = (map.doors ?? []).find((q) => q.at[0] === k.door[0] && q.at[1] === k.door[1]);
      if (!d) throw new Error(`${map.id}: no door at [${k.door}] for a key`);
      d.key = k.key;
    }
    map.entities.push({ type: 'pickup', kind: 'key_' + k.key, at: [...k.at], extra: true });
    if (k.lamp) map.entities.push({ type: 'prop', kind: 'lantern', at: [...k.lamp], extra: true });
    map.messages = [...(map.messages ?? []).filter((m) => m.id !== 'keyhunt'), { id: 'keyhunt', at: [...k.at], radius: 3, speaker: 'INES', text: k.line }];
  }
  // an ambush on a walk that had nothing on it: creatures that know where you are, from round a corner, when you reach the place
  map.triggers = (map.triggers ?? []).filter((t) => !String(t.id).startsWith('skill-'));
  (side.ambush ?? []).forEach((a, i) =>
    map.triggers.push({
      id: 'skill-' + i,
      when: 'enter',
      at: [...a.at],
      radius: a.radius ?? 3,
      do: a.spawn.map((s) => ({ spawn: { kind: s.kind, at: [...s.at], hunt: true } })),
    }),
  );
  // pickups a pass has added (in pairs: an odd number flips the steering side of every creature spawned later)
  for (const p of side.pickups ?? []) map.entities.push({ type: 'pickup', kind: p.kind, at: [...p.at], extra: true });
  for (const c of side.all ?? [])
    map.entities.push({ type: 'enemy', kind: c.kind, at: [...c.at], ...(c.facing != null ? { facing: c.facing } : {}), extra: true });
  // a creature the map already had, kept for Hard only (D3: an opener that was the peak of its stretch)
  for (const [x, z] of side.hardOnly ?? []) {
    const e = map.entities.find((q) => q.type === 'enemy' && q.at[0] === x && q.at[1] === z);
    if (!e) throw new Error(`${map.id} skill sidecar: no creature at ${x},${z} to keep for Hard`);
    e.skill = 'hard';
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
    fs.writeFileSync(file, JSON.stringify(map, null, 1).replace(/\[\s+(-?[\d.]+),\s+(-?[\d.]+)\s+\]/g, '[$1, $2]'));
    console.log(id, 'hard', map.entities.filter((e) => e.skill === 'hard').length);
  }
}
