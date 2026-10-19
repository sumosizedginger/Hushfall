// THE DIRECTOR'S AUDIT (PT-052, 2026-10-18; the first piece of P1 "Measure" in the Director's Plan, workstream B "tools to build first"): one row per shipped map of the numbers a level designer asks first, and a triage of what each map needs.
// Read-only, deterministic, node only, no browser. It measures; the triage is a SUGGESTION from named rules, not a verdict (the owner's play outranks it).
//   node tools/dev/director-audit.mjs                 print the table
//   node tools/dev/director-audit.mjs --write         also write design/DIRECTOR_AUDIT.md (the table, the rules, the flags)
//   node tools/dev/director-audit.mjs --json          the rows as JSON
//   node tools/dev/director-audit.mjs --routes       also replay each map's main route (normal, seed 1) for the bot seconds, the first fight, the share of time under threat and the LONGEST WALK WITH NO FIGHT (slow: node only)
//   node tools/dev/director-audit.mjs --ratchet      write design/director-floor.json: the numbers no map may fall below (a floor only ever rises); tests/director-ratchet.test.js holds every map to it and every REBUILT map to the laws
// Loops are the blocks of solid (20 cells or more) a player can walk all the way round (roomgraph.mjs); the room-graph cycle rank is reported beside it. Both and the empty rooms are REPORTED and do not move the tier (the plan page's triage of 2026-10-18 predates them).
// NOT YET MEASURED: rewards off the lane, secret KINDS (the engine has one kind, the panel; the catalogue of eight is the plan's).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMap } from '../../src/engine/mapformat.js';
import { ENEMIES, TICK } from '../../src/engine/defs.js';
import { mapFeel } from './map-feel.mjs';
import { roomGraph } from './roomgraph.mjs';
import { loadMapFile, loadRouteFile, runRoute } from '../../src/engine/harness.js';

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
  const secrets = (map.secrets ?? []).length, sym = mirror(map, walk), rg = roomGraph(map);
  let botMin = null; try { const v = JSON.parse(fs.readFileSync(path.join(ROOT, 'validation', 'maps', map.id + '.json'), 'utf8')); botMin = v.canonicalRoute ? +(v.canonicalRoute.ticks * TICK / 60).toFixed(1) : null; } catch { /* no evidence file */ }
  const row = { id: map.id, name: map.name, walk: feel.walkable, enemies: total, density: feel.walkable ? Math.round(1000 * total / feel.walkable) : 0, kinds: Object.keys(kinds).length, topKind: top[0], topShare: total ? Math.round(100 * top[1] / total) : 0, rangedShare: total ? Math.round(100 * ranged / total) : 0,
    levelsPct, floors: heights.size, symmetry: +sym.toFixed(2), keys, secrets, triggers, switches: switches.length, ambushes, botMin, boss, setpiece: SETPIECES.has(map.id), rooms: rg.rooms.length, loops: rg.loops, roomLoops: rg.roomLoops, emptyRooms: rg.emptyRooms.length };
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
  if (total && !row.boss && !row.setpiece && row.rooms >= 3 && row.loops === 0 && row.roomLoops === 0) f.push('no loop');
  if (row.emptyRooms >= 1) f.push(row.emptyRooms + ' empty room' + (row.emptyRooms > 1 ? 's' : ''));
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

// ---- the route replay (slow; `--routes`): what the bot's main route is like to walk ----------------------------------------------------------------------------------------------------------------
const THREAT_M = 25;                                                // a creature that is awake and within this many metres is a fight
export function routeStats(id) {
  const rf = path.join(ROOT, 'routes', id + '.main.route.json'); if (!fs.existsSync(rf)) return null;
  const map = loadMapFile(path.join(ROOT, 'maps', id + '.json')); let px = null, pz = null, run = 0, best = 0, threat = 0, ticks = 0, first = null;
  runRoute(map, loadRouteFile(rf), { seed: 1, difficulty: 'normal', onTick: (w, t) => {
    ticks++; const p = w.player, dm = px == null ? 0 : Math.hypot(p.x - px, p.z - pz); px = p.x; pz = p.z; let f = false;
    for (const e of w.enemies) { if (e.state === 'idle' || e.state === 'dead') continue; const d = ENEMIES[e.kind]; if (d?.peaceful || d?.node) continue; if (Math.hypot(e.x - p.x, e.z - p.z) < THREAT_M) { f = true; break; } }
    if (f) { threat++; if (first == null) first = t * TICK; run = 0; } else { run += dm; if (run > best) best = run; }
  } });
  return { botSeconds: +(ticks * TICK).toFixed(0), firstFightS: first == null ? null : +first.toFixed(0), threatPct: ticks ? Math.round(100 * threat / ticks) : 0, longestWalkM: Math.round(best) };
}

// ---- the laws a REBUILT map must meet (the Director's Plan, section R) --------------------------------------------------------------------------------------------------------------------------
const FIRST_THREE = new Set(['C1E1M01', 'C1E1M02', 'C1E1M03']);          // the introduction maps: few kinds and one of them common is how the game starts
// A law that waits for Bot v2 (the Director's Plan, P2): the OLD stand-still bot is still the gate on Easy, Normal and Hard, and on some maps it dies before the law is met. The map keeps the most the old gate allows, the law is skipped and the reason is on the record: design/director-floor.json, key `waiting`: { ID: { skip: ['cap', 'shooters'], why } }.
export const waitingOf = (doc = readFloor()) => doc.waiting ?? {};
export function laws(r, waiting = waitingOf()) {
  const v = [], wait = waiting[r.id]?.skip ?? [];
  if (!r.enemies || r.boss) return v;                                  // a boss arena is judged by play, not by these numbers
  const cap = r.kinds >= 5 ? 35 : r.kinds === 4 ? 40 : 45;             // the cap scales with the variety there is: with three kinds a third each is the least possible, with four the two minor ones carry only a few creatures
  if (!FIRST_THREE.has(r.id) && r.topShare > cap && !wait.includes('cap')) v.push(`no kind over ${cap}% of a map (${r.topKind} is ${r.topShare}%)`);
  if (r.id !== 'C1E1M01' && r.id !== 'C1E1M02' && r.rangedShare < 20 && !wait.includes('shooters')) v.push(`at least 20% of the creatures shoot (${r.rangedShare}%)`);
  const need = FIRST_THREE.has(r.id) ? 0 : r.id === 'C1E1M04' ? 3 : 4;      // the Episode 1 introduction has three kinds until the Sexton arrives on map 5
  if (r.kinds < need) v.push(`at least ${need} kinds (${r.kinds})`);
  const amb = r.id === 'C1E1M01' ? 1 : 2; if (r.ambushes < amb) v.push(`at least ${amb} scripted ambush${amb > 1 ? 'es' : ''} (${r.ambushes})`);
  if (!r.setpiece && r.density < 18 && !wait.includes('density')) v.push(`at least 18 creatures per thousand cells (${r.density})`);
  if (r.secrets < 1 || r.secrets > 3) v.push(`one to three secrets (${r.secrets})`);
  return v;
}

// ---- the floor: the numbers no map may fall below; it only ever rises ----------------------------------------------------------------------------------------------------------------------------------
export const FLOOR_FILE = path.join(ROOT, 'design', 'director-floor.json');
export const HIGHER = ['density', 'rangedShare', 'ambushes', 'kinds', 'loops'], LOWER = ['topShare', 'symmetry', 'walk'];
export const TOLERANCE = { symmetry: 0.02, walk: 25, density: 1 };          // a secret room adds a few walkable cells and so takes a point off the density of a map nothing else changed on
export const readFloor = () => (fs.existsSync(FLOOR_FILE) ? JSON.parse(fs.readFileSync(FLOOR_FILE, 'utf8')) : { rebuilt: [], floor: {}, routes: {} });
export function raiseFloor(rows, floorDoc = readFloor()) {
  const out = { ...floorDoc, floor: { ...floorDoc.floor } };
  for (const r of rows) {
    if (!r.enemies) continue; const old = out.floor[r.id] ?? {}, now = {};
    for (const k of HIGHER) now[k] = old[k] == null ? r[k] : Math.max(old[k], r[k]);
    for (const k of LOWER) now[k] = old[k] == null ? r[k] : Math.min(old[k], r[k]);
    out.floor[r.id] = now;
  }
  return out;
}
export function belowFloor(rows, floorDoc = readFloor()) {
  const bad = [];
  for (const r of rows) {
    const f = floorDoc.floor[r.id]; if (!f) continue;
    for (const k of HIGHER) if (r[k] < f[k] - (TOLERANCE[k] ?? 0)) bad.push(`${r.id} ${k} ${r[k]} is below its floor ${f[k]}`);
    for (const k of LOWER) if (r[k] > f[k] + (TOLERANCE[k] ?? 0)) bad.push(`${r.id} ${k} ${r[k]} is above its ceiling ${f[k]}`);
  }
  return bad;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rows = auditAll(), args = process.argv.slice(2);
  let doc = readFloor();
  if (args.includes('--routes')) {
    doc.routes = {}; for (const r of rows) if (r.enemies) { try { const s = routeStats(r.id); if (s) { doc.routes[r.id] = s; console.log('route', r.id, JSON.stringify(s)); } } catch (e) { console.log('route', r.id, 'FAILED', String(e.message).slice(0, 80)); } }
    fs.writeFileSync(FLOOR_FILE, JSON.stringify(doc, null, 1)); console.log('wrote the route numbers into design/director-floor.json');
  }
  if (args.includes('--ratchet')) { doc = raiseFloor(rows, doc); doc.updated = new Date().toISOString().slice(0, 10); fs.writeFileSync(FLOOR_FILE, JSON.stringify(doc, null, 1)); console.log('raised design/director-floor.json (' + Object.keys(doc.floor).length + ' maps)'); }
  if (args.includes('--json')) { console.log(JSON.stringify(rows, null, 1)); process.exit(0); }
  if (args.includes('--laws')) {                                                 // node tools/dev/director-audit.mjs --laws ID [ID ...]: the numbers and the laws, one map per line
    for (const id of args.filter((a) => /^C\d/.test(a))) { const r = rows.find((x) => x.id === id); if (!r) { console.log(id, 'no such map'); continue; }
      const src = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', id + '.json'), 'utf8')), k = {}; for (const e of src.entities) if (e.type === 'enemy') k[e.kind] = (k[e.kind] ?? 0) + 1;
      const v = laws(r); console.log(`${id} ${r.name}: ${r.enemies} creatures ${JSON.stringify(k)}, top ${r.topKind} ${r.topShare}%, shoot ${r.rangedShare}%, ${r.kinds} kinds, ${r.ambushes} ambushes, ${r.secrets} secrets, ${r.density} per 1000, ${r.walk} cells, loops ${r.loops}, empty rooms ${r.emptyRooms}\n   -> ${v.length ? 'BREAKS: ' + v.join('; ') : 'meets the laws'}`); }
    process.exit(0);
  }
  const cols = ['id', 'walk', 'enemies', 'density', 'kinds', 'topShare', 'rangedShare', 'levelsPct', 'symmetry', 'loops', 'keys', 'secrets', 'ambushes', 'botMin'];
  console.log(cols.map((c) => c.padEnd(c === 'id' ? 9 : 10)).join('') + 'tier / flags');
  for (const r of rows) console.log(cols.map((c) => String(r[c] ?? '-').padEnd(c === 'id' ? 9 : 10)).join('') + r.tier + (r.flags.length ? ' | ' + r.flags.join(', ') : ''));
  const tally = {}; for (const r of rows) tally[r.tier] = (tally[r.tier] ?? 0) + 1; console.log('\n' + Object.entries(tally).map(([k, v]) => `${k}: ${v}`).join('   '));
  const bad = belowFloor(rows, doc); if (bad.length) console.log('\nBELOW THE FLOOR:\n' + bad.join('\n'));
  for (const id of doc.rebuilt ?? []) { const r = rows.find((x) => x.id === id), v = r ? laws(r) : ['no such map']; console.log(id + ' (rebuilt): ' + (v.length ? v.join('; ') : 'meets the laws')); }
  if (args.includes('--write')) {
    const rt = doc.routes ?? {};
    const L = ['# THE DIRECTOR\'S AUDIT (generated by `node tools/dev/director-audit.mjs --write`, ' + new Date().toISOString().slice(0, 10) + ')', '',
      'One row per shipped map. It measures; the tier is a suggestion from the named rules at the top of the tool, not a verdict. Not yet measured: rewards off the lane, secret kinds (the engine has one: the panel).', '',
      'Columns: walk = walkable cells; density = enemies per 1000 walkable cells; top% = the commonest kind\'s share of the roster; rng% = share of creatures that shoot at range; lvl% = share of walkable cells off the commonest floor height; sym = mirror overlap (1 = a perfect mirror); loops = blocks of solid (20 cells or more) you can walk all the way round; empty = rooms with nothing in them; botMin = minutes of the canonical bot route (a person takes several times as long); gap = the longest walk in metres with no awake creature within 25 m, on the bot\'s main route (normal, seed 1); first = seconds to the first fight.', '',
      '| map | name | walk | enemies | dens | kinds | top% | rng% | lvl% | sym | loops | empty | keys | secr | ambush | botMin | first | gap | tier | flags |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|'];
    for (const r of rows) { const q = rt[r.id]; L.push(`| ${r.id} | ${r.name} | ${r.walk} | ${r.enemies} | ${r.density} | ${r.kinds} | ${r.topShare} | ${r.rangedShare} | ${r.levelsPct} | ${r.symmetry} | ${r.loops} | ${r.emptyRooms} | ${r.keys} | ${r.secrets} | ${r.ambushes} | ${r.botMin ?? '-'} | ${q?.firstFightS ?? '-'} | ${q?.longestWalkM ?? '-'} | ${r.tier} | ${r.flags.join(', ')} |`); }
    L.push('', 'Tally: ' + Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(', '), '', '## The rules', '```json', JSON.stringify(RULES, null, 1), '```', 'Declared set pieces: ' + [...SETPIECES].join(', ') + '. Named exemplars: ' + EXEMPLARS.join(', ') + '.', '',
      '## The laws a rebuilt map must meet (`laws()` in the tool; the maps listed in `design/director-floor.json` under `rebuilt` are held to them by `tests/director-ratchet.test.js`)', '', 'no kind over 35% of a map (after the first three maps) · at least 20% of the creatures shoot (from the third map) · at least four kinds (after the first three maps) · at least two scripted ambushes · at least 18 creatures per thousand cells (a set piece or a boss names its own number) · one to three secrets.', '');
    fs.writeFileSync(path.join(ROOT, 'design', 'DIRECTOR_AUDIT.md'), L.join('\n')); console.log('wrote design/DIRECTOR_AUDIT.md');
  }
}
