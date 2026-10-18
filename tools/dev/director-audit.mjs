// THE DIRECTOR'S AUDIT (PT-052, 2026-10-18; the first piece of P1 "Measure" in the Director's Plan, workstream B "tools to build first"): one row per shipped map of the numbers a level designer asks first, and a triage of what each map needs.
// Read-only, deterministic, node only, no browser. It measures; the triage is a SUGGESTION from named rules, not a verdict (the owner's play outranks it).
//   node tools/dev/director-audit.mjs                 print the table
//   node tools/dev/director-audit.mjs --write         also write design/DIRECTOR_AUDIT.md (the table, the rules, the flags)
//   node tools/dev/director-audit.mjs --json          the rows as JSON
// NOT YET MEASURED (they need a route replay or a room graph and are the rest of P1): loops (cycle rank of the room graph), rewards off the lane, the longest walk with no fight, rooms with no job, secret KINDS.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMap } from '../../src/engine/mapformat.js';
import { ENEMIES, TICK } from '../../src/engine/defs.js';
import { mapFeel } from './map-feel.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
// ---- the rules (tunable; change them here, not in the callers) -------------------------------------------------------------------------------------------------------------------------------------
export const RULES = {
  sparse: [12, 15],               // enemies per 1000 walkable cells: under 12 = sparse (2 points), under 15 = thin (1)
  long: [2500, 3000],             // walkable cells: over 2500 = long (1), over 3000 = very long (2)
  symmetric: 0.88,                // mirror overlap (intersection over union of the walkable mask with itself flipped): over this = symmetrical (1)
  flat: 10,                       // share of walkable cells off the commonest floor height, in percent: under this = flat (1)
  oneNote: [50, 60],              // the commonest kind's share of the roster, percent: over 50 = one-note (1), over 60 = (2)
  thinRoster: 3,                  // kinds <= this = thin roster (1)
  noRanged: 10,                   // ranged share under this percent on a map of 20 or more creatures = melee-only (1)
  lockFrom: 'C1E2',               // locks are expected from this episode on (the Director's law 13)
};
const SETPIECES = new Set(['C1E3M04', 'C1E4M07', 'C2M28', 'C2M30', 'C1E4M01']);   // declared set pieces: judged on their own number, layout kept
const BOSSES = new Set(['cantor', 'graftmother', 'grandcantor', 'gatewarden', 'subcantor', 'hivecantor', 'rootbell']);
const EXEMPLARS = ['C2M02', 'C2M11', 'C2M21', 'C1E4M06'];                         // the Director's Plan, workstream B, level C (the four named exemplars)

const hasAction = (list, key) => (Array.isArray(list) ? list : []).some((a) => a && typeof a === 'object' && key in a);
function mirror(map, walk) {
  let lr = [0, 0], ud = [0, 0];
  for (let z = 0; z < map.h; z++) for (let x = 0; x < map.w; x++) {
    const a = walk(x, z), l = walk(map.w - 1 - x, z), u = walk(x, map.h - 1 - z);
    if (a && l) lr[0]++; if (a || l) lr[1]++; if (a && u) ud[0]++; if (a || u) ud[1]++;
  }
  return Math.max(lr[1] ? lr[0] / lr[1] : 0, ud[1] ? ud[0] / ud[1] : 0);
}

export function auditMap(src) {
  const map = parseMap(src), feel = mapFeel(src), walk = (x, z) => { const k = map.kind(x, z); return k === 'floor' || k === 'outdoor' || k === 'door' || k === 'void'; }, solidFloor = (x, z) => { const k = map.kind(x, z); return k === 'floor' || k === 'outdoor' || k === 'door'; };
  const enemies = map.entities.filter((e) => e.type === 'enemy' && !ENEMIES[e.kind]?.peaceful), total = enemies.length;      // the peaceful Vael are no combatants: they count in no share and no density
  const heights = new Map(); let cells = 0;
  for (let z = 0; z < map.h; z++) for (let x = 0; x < map.w; x++) if (solidFloor(x, z)) { const h = Math.round((map.floor(x, z) ?? 0) * 20) / 20; heights.set(h, (heights.get(h) ?? 0) + 1); cells++; }
  const commonest = Math.max(0, ...heights.values()), levelsPct = cells ? Math.round(100 * (cells - commonest) / cells) : 0;
  const kinds = {}; for (const e of enemies) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1; const top = Object.entries(kinds).sort((a, b) => b[1] - a[1])[0] ?? ['-', 0];
  const ranged = enemies.filter((e) => ENEMIES[e.kind]?.ranged).length, boss = Object.keys(kinds).some((k) => BOSSES.has(k));
  const keys = map.entities.filter((e) => e.type === 'pickup' && /^key_/.test(e.kind)).length;
  const triggers = (map.triggers ?? []).length;
  const switches = map.entities.filter((e) => e.type === 'switch');
  const ambushes = [...(map.triggers ?? []), ...switches].filter((t) => hasAction(t.do, 'spawn') || hasAction(t.do, 'wake')).length;
  const secrets = (map.secrets ?? []).length, sym = mirror(map, walk);
  let botMin = null; try { const v = JSON.parse(fs.readFileSync(path.join(ROOT, 'validation', 'maps', map.id + '.json'), 'utf8')); botMin = v.canonicalRoute ? +(v.canonicalRoute.ticks * TICK / 60).toFixed(1) : null; } catch { /* no evidence file */ }
  const row = { id: map.id, name: map.name, walk: feel.walkable, enemies: total, density: feel.walkable ? Math.round(1000 * total / feel.walkable) : 0, kinds: Object.keys(kinds).length, topKind: top[0], topShare: total ? Math.round(100 * top[1] / total) : 0, rangedShare: total ? Math.round(100 * ranged / total) : 0,
    levelsPct, floors: heights.size, symmetry: +sym.toFixed(2), keys, secrets, triggers, switches: switches.length, ambushes, botMin, boss, setpiece: SETPIECES.has(map.id) };
  const f = []; let structural = 0, roster = 0;
  if (total) {
    if (row.density < RULES.sparse[0]) { structural += 2; f.push('sparse'); } else if (row.density < RULES.sparse[1]) { structural += 1; f.push('thin'); }
    if (row.walk > RULES.long[1]) { structural += 2; f.push('very long'); } else if (row.walk > RULES.long[0]) { structural += 1; f.push('long'); }
    if (row.topShare > RULES.oneNote[1]) { roster += 2; f.push('one-note ' + row.topKind); } else if (row.topShare > RULES.oneNote[0]) { roster += 1; f.push('one-note ' + row.topKind); }
    if (row.kinds <= RULES.thinRoster) { roster += 1; f.push('thin roster'); }
    if (total >= 20 && row.rangedShare < RULES.noRanged) { roster += 1; f.push('melee-only'); }
  }
  if (row.symmetry > RULES.symmetric) { structural += 1; f.push('symmetrical'); }
  if (row.levelsPct < RULES.flat && row.walk > 400) { structural += 1; f.push('flat'); }
  const lockExpected = total > 0 && map.id >= RULES.lockFrom && !SETPIECES.has(map.id);
  if (lockExpected && keys === 0) f.push('no key');
  if (total && ambushes < 2) f.push('few ambushes');
  if (secrets === 1) f.push('one secret');
  row.flags = f; row.structural = structural; row.roster = roster;
  // tier: KEEP = no combat or a boss / set piece judged by play; C = a named exemplar; B = structural change; A = encounters and rosters only (no geometry change); A- = a light pass
  row.tier = !total ? (ambushes > 10 ? 'KEEP (a stand: its creatures come from triggers)' : 'KEEP (no combat)') : EXEMPLARS.includes(row.id) ? 'C exemplar' : (row.boss || row.setpiece) ? 'KEEP (boss or set piece: judge by play)' : structural >= 3 ? 'B structural' : (structural >= 1 || roster >= 2) ? 'A encounters and roster' : 'A- light pass';
  return row;
}

export function auditAll() {
  const out = [];
  for (const f of fs.readdirSync(path.join(ROOT, 'maps')).filter((x) => x.endsWith('.json')).sort()) out.push(auditMap(JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', f), 'utf8'))));
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rows = auditAll(), args = process.argv.slice(2);
  if (args.includes('--json')) { console.log(JSON.stringify(rows, null, 1)); process.exit(0); }
  const cols = ['id', 'walk', 'enemies', 'density', 'kinds', 'topShare', 'rangedShare', 'levelsPct', 'symmetry', 'keys', 'secrets', 'ambushes', 'botMin'];
  console.log(cols.map((c) => c.padEnd(c === 'id' ? 9 : 10)).join('') + 'tier / flags');
  for (const r of rows) console.log(cols.map((c) => String(r[c] ?? '-').padEnd(c === 'id' ? 9 : 10)).join('') + r.tier + (r.flags.length ? ' | ' + r.flags.join(', ') : ''));
  const tally = {}; for (const r of rows) tally[r.tier] = (tally[r.tier] ?? 0) + 1; console.log('\n' + Object.entries(tally).map(([k, v]) => `${k}: ${v}`).join('   '));
  if (args.includes('--write')) {
    const L = ['# THE DIRECTOR\'S AUDIT (generated by `node tools/dev/director-audit.mjs --write`, ' + new Date().toISOString().slice(0, 10) + ')', '',
      'One row per shipped map. It measures; the tier is a suggestion from the named rules at the top of the tool, not a verdict. Not yet measured (the rest of P1): loops, rewards off the lane, the longest walk with no fight, rooms with no job, secret kinds.', '',
      'Columns: walk = walkable cells; density = enemies per 1000 walkable cells; top% = the commonest kind\'s share of the roster; rng% = share of creatures that shoot at range; lvl% = share of walkable cells off the commonest floor height; sym = mirror overlap (1 = a perfect mirror); botMin = minutes of the canonical bot route (a person takes several times as long).', '',
      '| map | name | walk | enemies | dens | kinds | top% | rng% | lvl% | sym | keys | secr | ambush | botMin | tier | flags |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|'];
    for (const r of rows) L.push(`| ${r.id} | ${r.name} | ${r.walk} | ${r.enemies} | ${r.density} | ${r.kinds} | ${r.topShare} | ${r.rangedShare} | ${r.levelsPct} | ${r.symmetry} | ${r.keys} | ${r.secrets} | ${r.ambushes} | ${r.botMin ?? '-'} | ${r.tier} | ${r.flags.join(', ')} |`);
    L.push('', 'Tally: ' + Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(', '), '', '## The rules', '```json', JSON.stringify(RULES, null, 1), '```', 'Declared set pieces: ' + [...SETPIECES].join(', ') + '. Named exemplars: ' + EXEMPLARS.join(', ') + '.', '');
    fs.writeFileSync(path.join(ROOT, 'design', 'DIRECTOR_AUDIT.md'), L.join('\n')); console.log('wrote design/DIRECTOR_AUDIT.md');
  }
}
