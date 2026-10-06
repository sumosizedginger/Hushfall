// Text-map compiler: maps-src/<ID>.level.mjs -> maps/<ID>.json. The source is drawn as layers of ASCII (geometry, heights, ceilings, fx, objects) so a level
// can be read and edited as a picture; this turns it into the runtime map format and validates it. Usage: node tools/mapkit/compile.mjs [ID ...]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateMap } from '../../src/engine/mapformat.js';

const root = path.resolve(import.meta.dirname, '../..');

/** default object symbols (one char per cell in the `objects` layer). Maps can add or override with `legend`. */
export const LEGEND = {
  '@': { type: 'player' }, '>': { type: 'exit', dest: 'next' }, '$': { type: 'exit', dest: 'secret' },
  t: { type: 'enemy', kind: 'tollbearer' }, g: { type: 'enemy', kind: 'gaunt' }, b: { type: 'enemy', kind: 'bellhand' }, x: { type: 'enemy', kind: 'sexton' }, w: { type: 'enemy', kind: 'wardengraft' }, K: { type: 'enemy', kind: 'cantor' }, G: { type: 'enemy', kind: 'gill' }, Y: { type: 'enemy', kind: 'graftmother' }, Z: { type: 'enemy', kind: 'feeder' },
  h: { type: 'pickup', kind: 'health_small' }, H: { type: 'pickup', kind: 'health_large' }, a: { type: 'pickup', kind: 'ammo_flare' }, e: { type: 'pickup', kind: 'ammo_shell' }, r: { type: 'pickup', kind: 'ammo_rivet' },
  v: { type: 'pickup', kind: 'armor_vest' }, k: { type: 'pickup', kind: 'key_brass' }, i: { type: 'pickup', kind: 'key_iron' }, q: { type: 'pickup', kind: 'key_bell' }, S: { type: 'pickup', kind: 'weapon_scattergun' }, R: { type: 'pickup', kind: 'weapon_rivet' },
  c: { type: 'prop', kind: 'crate' }, C: { type: 'prop', kind: 'crate2' }, o: { type: 'prop', kind: 'barrel' }, P: { type: 'prop', kind: 'pillar' }, m: { type: 'prop', kind: 'lamp' }, M: { type: 'prop', kind: 'lamp', tint: 'cool' }, Q: { type: 'prop', kind: 'lamp', tint: 'teal' },
  j: { type: 'prop', kind: 'lamppost' }, u: { type: 'prop', kind: 'bollard' }, n: { type: 'prop', kind: 'lantern' }, z: { type: 'prop', kind: 'cart' }, y: { type: 'prop', kind: 'sack' }, d: { type: 'prop', kind: 'rope' },
  f: { type: 'prop', kind: 'table' }, F: { type: 'prop', kind: 'shelf' }, O: { type: 'prop', kind: 'cradle' }, N: { type: 'prop', kind: 'bellnode' }, D: { type: 'prop', kind: 'pod' }, A: { type: 'prop', kind: 'stall' },
};
const DIRS = { north: 0, south: Math.PI, east: -Math.PI / 2, west: Math.PI / 2 };

export function compile(lv) {
  const errors = [], geo = lv.geometry, h = geo.length, w = geo[0].length;
  const layer = (name, rows) => { if (rows == null) return null; if (rows.length !== h || rows.some((r) => r.length !== w)) errors.push(`layer '${name}' must be ${w} x ${h} (got ${rows.length} rows, widths ${[...new Set(rows.map((r) => r.length))]})`); return rows; };
  if (geo.some((r) => r.length !== w)) errors.push(`geometry rows differ in width: ${[...new Set(geo.map((r) => r.length))]}`);
  const heights = layer('heights', lv.heights), ceilings = layer('ceilings', lv.ceilings), fx = layer('fx', lv.fx), objects = layer('objects', lv.objects);
  const legend = { ...LEGEND, ...(lv.legend || {}) }, entities = [], doors = [], closets = [];
  let spawn = null;
  const at = (s) => s.split(',').map(Number);
  if (objects) for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
    const c = objects[z]?.[x]; if (!c || c === ' ' || c === '.') continue;
    const def = legend[c]; if (!def) { errors.push(`objects: unknown symbol '${c}' at ${x},${z}`); continue; }
    const e = { ...def, at: [x, z] }; entities.push(e); if (e.type === 'player') spawn = e;
  }
  for (const e of lv.entities || []) { entities.push({ ...e }); if (e.type === 'player') spawn = e; }
  if (!spawn) errors.push('no player symbol (@) in objects'); else if (lv.startFacing) spawn.facing = lv.startFacing;
  // enemies face the player's start unless told otherwise (radians, or a compass word); everything else keeps the map's own facing rules
  for (const e of entities) {
    if (e.type !== 'enemy' || e.facing != null) continue;
    const o = lv.facing?.[e.at.join(',')]; if (o != null) { e.facing = typeof o === 'string' ? DIRS[o] : o; continue; }
    if (spawn) e.facing = Math.round(Math.atan2(spawn.at[0] - e.at[0], spawn.at[1] - e.at[1]) * 1000) / 1000;
  }
  for (const g of lv.groups || []) for (const e of entities) if (e.type === 'enemy' && !e.group && e.at[0] >= g.rect[0] && e.at[1] >= g.rect[1] && e.at[0] <= g.rect[2] && e.at[1] <= g.rect[3]) e.group = g.name;
  for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
    if (geo[z][x] === 'D') doors.push({ at: [x, z], ...(lv.doorKeys?.[x + ',' + z] ? { key: lv.doorKeys[x + ',' + z] } : {}), ...(lv.remoteDoors?.includes(x + ',' + z) ? { remote: true } : {}) });
    if (geo[z][x] === 'X') closets.push({ at: [x, z] });
  }
  const out = {
    format: 1, id: lv.id, version: lv.version ?? 1, name: lv.name, ...(lv.cellSize ? { cellSize: lv.cellSize } : {}), ...(lv.ceilingHeight ? { ceilingHeight: lv.ceilingHeight } : {}),
    ...(lv.atmosphere ? { atmosphere: lv.atmosphere } : {}), ...(lv.keyLabels ? { keyLabels: lv.keyLabels } : {}), grid: geo, ...(heights ? { heights } : {}), ...(ceilings ? { ceilings } : {}), ...(fx ? { fx } : {}),
    doors, secrets: lv.secrets || [], ...(closets.length ? { closets } : {}), ...(lv.sectors ? { sectors: lv.sectors } : {}), ...(lv.triggers ? { triggers: lv.triggers } : {}),
    entities, ...(lv.scenery ? { scenery: lv.scenery } : {}), ...(lv.par ? { par: lv.par } : {}), ...(lv.intro ? { intro: lv.intro } : {}), ...(lv.outro ? { outro: lv.outro } : {}), ...(lv.messages ? { messages: lv.messages } : {}), ...(lv.objective ? { objective: lv.objective } : {}), ...(lv.entryLoadout ? { entryLoadout: lv.entryLoadout } : {}),
    ...(lv.quality ? { quality: lv.quality } : {}),
  };
  const v = validateMap(out); if (!v.ok) errors.push(...v.errors);
  return { map: out, errors };
}

const pretty = (m) => JSON.stringify(m, null, 1).replace(/\[\s+(-?[\d.]+),\s+(-?[\d.]+)\s+\]/g, '[$1, $2]');
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = path.join(root, 'maps-src');
  const ids = process.argv.slice(2), files = fs.readdirSync(dir).filter((f) => f.endsWith('.level.mjs') && (!ids.length || ids.includes(f.split('.')[0])));
  let bad = 0;
  for (const f of files) {
    const lv = (await import(pathToFileURL(path.join(dir, f)).href)).default, { map, errors } = compile(lv);
    if (errors.length) { bad++; console.error(`FAIL ${f}:\n  ` + errors.slice(0, 40).join('\n  ')); continue; }
    fs.writeFileSync(path.join(root, 'maps', lv.id + '.json'), pretty(map));
    console.log(`ok   ${lv.id} ${lv.name}: ${map.grid[0].length}x${map.grid.length}, ${map.entities.filter((e) => e.type === 'enemy').length} enemies -> maps/${lv.id}.json`);
    for (const w of lv.placementWarnings ?? []) console.log(`  WARN ${w}: an objects-layer cell holds ONE character, the earlier object is gone`);
  }
  process.exit(bad ? 1 : 0);
}
