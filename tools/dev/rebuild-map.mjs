// THE LEVEL A PASS FOR ONE MAP, AUTOMATED (PT-052, R2/R7 of the Director's Plan): plan the roster change from the Director's laws, add the scripted ambushes and the secret room the kit can build, keep the most ambitious version the OLD bot's gates accept, write it into the
// map source as a block `PT-052 R2 ... end PT-052`, compile, make the secret route, run every gate (verify-map) and the cheap per-map checks (map-check), raise the floor. If nothing passes, everything is restored and the reason is printed. Node only.
//   node tools/dev/rebuild-map.mjs <ID> [--dry] [--force] [--no-secret] [--shooters=bellhand,gill]
// What it does NOT do: change geometry beyond a secret room (that is Level B and the exemplars), choose creatures by taste (the plan is arithmetic: the commonest kind gives up creatures to shooters first, then to the kinds with room), write text.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { auditMap, laws, readFloor, FLOOR_FILE } from './director-audit.mjs';
import { ENEMIES } from '../../src/engine/defs.js';

const root = path.resolve(import.meta.dirname, '../..');
const args = process.argv.slice(2), id = args.find((a) => /^C\d/.test(a)), flag = (n) => args.includes('--' + n), opt = (n) => args.find((a) => a.startsWith('--' + n + '='))?.split('=')[1];
if (!id) { console.error('usage: rebuild-map.mjs <ID> [--dry] [--force] [--no-secret] [--shooters=a,b]'); process.exit(2); }
const P = (...p) => path.join(root, ...p), node = (a, env = {}) => spawnSync(process.execPath, a, { cwd: root, env: { ...process.env, ...env }, encoding: 'utf8', maxBuffer: 1 << 26 });
const srcFile = P('maps-src', id + '.level.mjs'), mapFile = P('maps', id + '.json'), say = (...m) => console.log(`[${id}]`, ...m);
const original = fs.readFileSync(srcFile, 'utf8');
if (original.includes('PT-052 R2')) { say('already has its PT-052 block: nothing to do'); process.exit(0); }
const map = JSON.parse(fs.readFileSync(mapFile, 'utf8')), row0 = auditMap(map);
if ((row0.boss || row0.setpiece) && !flag('force')) { say('a boss arena or a set piece: judged by play (use --force to plan it anyway)'); process.exit(0); }
if (!row0.enemies) { say('no combat'); process.exit(0); }
if (!fs.existsSync(P('maps-src', 'lanes', id + '.json'))) { const r = node(['tools/dev/lane-of.mjs', id]); say('lane file made:', (r.stdout || '').trim().split('\n').pop()); }

// ---- 1. the roster plan (arithmetic from the laws) -----------------------------------------------------------------------------------------------------------------------------------------------
const counts = {}; for (const e of map.entities) if (e.type === 'enemy' && !ENEMIES[e.kind]?.peaceful) counts[e.kind] = (counts[e.kind] ?? 0) + 1;
const N = Object.values(counts).reduce((a, b) => a + b, 0), kinds = Object.keys(counts).length, cap = kinds >= 5 ? 35 : kinds === 4 ? 40 : 45, capCount = Math.floor(cap * N / 100);
const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0], excess = Math.max(0, counts[top] - capCount);
const shooters = Object.keys(counts).filter((k) => ENEMIES[k]?.ranged).reduce((a, k) => a + counts[k], 0), needShoot = Math.max(0, Math.ceil(0.2 * N) - shooters);
const ep = id.startsWith('C2') ? 'C2' : id.slice(0, 4), idx = +id.slice(-2);
const introduced = ep === 'C1E1' ? ['bellhand'] : ep === 'C1E2' ? ['bellhand', ...(idx >= 5 ? ['gill'] : [])] : ['bellhand', 'chorister', 'gill'];
const shooterKinds = (opt('shooters')?.split(',') ?? [...Object.keys(counts).filter((k) => ENEMIES[k]?.ranged && k !== top), ...introduced.filter((k) => !counts[k])]).filter((k, i, a) => a.indexOf(k) === i && k !== top);
const room = (k) => capCount - (counts[k] ?? 0), steps = [];
{ let left = needShoot, i = 0; const give = { }; while (left > 0 && shooterKinds.length && i < 400) { const k = shooterKinds[i++ % shooterKinds.length]; if (room(k) - (give[k] ?? 0) > 0) { give[k] = (give[k] ?? 0) + 1; left--; } }
  let more = Math.max(0, excess - needShoot); const light = (k) => ENEMIES[k] && !ENEMIES[k].peaceful && !ENEMIES[k].ranged && !ENEMIES[k].node && !ENEMIES[k].armor && !ENEMIES[k].support && !ENEMIES[k].summons && !ENEMIES[k].brood && !ENEMIES[k].pulse && ENEMIES[k].hp < 100, others = [...new Set(['gaunt', ...Object.keys(counts)])].filter((k) => k !== top && light(k));
  for (let j = 0; more > 0 && others.length && j < 400; j++) { const k = others[j % others.length]; if (room(k) - (give[k] ?? 0) > 0) { give[k] = (give[k] ?? 0) + 1; more--; } }
  for (const [k, n] of Object.entries(give)) steps.push({ from: top, to: k, n, pick: 'spread', shooter: !!ENEMIES[k]?.ranged }); }
const scaled = ([ss, so]) => steps.map((p) => ({ from: p.from, to: p.to, pick: p.pick, n: Math.round(p.n * (p.shooter ? ss : so)) })).filter((p) => p.n > 0);
const SCALES = [[1, 1], [1, 0.5], [0.75, 0.5], [0.75, 0.25], [0.5, 0.5], [0.5, 0], [0.25, 0.25], [0.25, 0], [0, 0]];
say(`${N} creatures ${JSON.stringify(counts)}; top ${top} ${counts[top]} (cap ${cap}% = ${capCount}), shooters ${shooters} (need ${Math.ceil(0.2 * N)}); plan ${JSON.stringify(steps.map((p) => `${p.n} ${p.from}->${p.to}`))}`);

// ---- 2. the kit calls: ambushes and a secret -----------------------------------------------------------------------------------------------------------------------------------------------------
const H = map.grid.length, W = map.grid[0].length, weapons = map.entities.filter((e) => e.type === 'pickup' && /^weapon_/.test(e.kind));
const laneAt = (fr) => { const r = node(['tools/dev/lane-cells.mjs', id, ...fr.map(String)]), out = {}; for (const m of (r.stdout || '').matchAll(/fraction ([\d.]+) path at cell \d+,\d+ -> box at (\d+),(\d+)/g)) out[m[1]] = [+m[2], +m[3]]; return out; };
const lane = laneAt([0.3, 0.45, 0.6, 0.75]), needAmb = Math.max(0, (id === 'C1E1M01' ? 1 : 2) - row0.ambushes);
const anchors = []; for (const w of weapons.slice(0, 1)) anchors.push({ cage: w.at }); for (const f of ['0.3', '0.6', '0.45', '0.75']) if (lane[f]) anchors.push({ drop: lane[f] });
const secretNeeded = row0.secrets < 1 && !flag('no-secret');
const kitLines = (nAmb, which) => {
  const L = []; let used = 0;
  for (const a of which) { if (used >= nAmb) break; if (a.cage) L.push(`ENC.cage({ at: [${a.cage}], radius: 1.5, cells: ENC.around([${a.cage}], { n: 3, min: 4, max: 8 }), kind: 'g' });`); else L.push(`ENC.dropIn({ at: [${a.drop}], radius: 2, cells: ENC.around([${a.drop}], { n: 3, min: 6, max: 10 }), kind: 'g' });`); used++; }
  if (secretNeeded) L.push(`ENC.secretRoom({ id: 'hidden-cache', search: { region: [2, 2, ${W - 3}, ${H - 3}], prefer: [${Math.round(W / 2)}, ${Math.round(H / 2)}], lane: laneOf('${id}') }, rewards: ['v', 'H', 'a'] });`);
  return L;
};
const edit = (lines, plan) => {
  let s = original; const hasLane = /\blaneOf\b/.test(s);
  s = s.replace(/^(import \{ Level[^}]*\} from '\.\.\/tools\/mapkit\/builder\.mjs';)$/m, (m) => m + "\nimport { Encounters } from '../tools/mapkit/encounters.mjs';" + (hasLane ? '' : "\nimport { laneOf } from '../tools/mapkit/shape.mjs';"));
  if (!s.includes("encounters.mjs")) throw new Error('no builder import line to hang the imports on');
  const a = s.search(/^const (layers|MAP) = /m); if (a < 0) throw new Error('no `const layers` or `const MAP` line');
  const blockA = `// ---- PT-052 R2 (the Director's Plan, design/ROADMAP.md 0.12): the scripted ambushes and the secret the kit builds (tools/mapkit/encounters.mjs; planned by tools/dev/rebuild-map.mjs; the rules: design/DIRECTOR_AUDIT.md) ----\nconst ENC = new Encounters(L);\n${lines.join('\n')}\n// ---- end PT-052 ----\n\n`;
  s = s.slice(0, a) + blockA + s.slice(a);
  const e = s.lastIndexOf('export default MAP;'); if (e < 0) throw new Error('no export default MAP');
  const blockB = `// ---- PT-052 R2: which kinds stand where (applied by the compiler, tools/mapkit/roster.mjs) and what the kit built join the map ----\nMAP.roster = { id: '${id}', lane: [...(laneOf('${id}') ?? [])], keep: [], plan: ${JSON.stringify(plan)} };\nENC.apply(MAP);\n\n`;
  return s.slice(0, e) + blockB + s.slice(e);
};
const backups = new Map(); for (const f of [srcFile, mapFile, P('validation', 'maps', id + '.json')]) if (fs.existsSync(f)) backups.set(f, fs.readFileSync(f));
const newFiles = []; const restore = () => { for (const [f, b] of backups) fs.writeFileSync(f, b); for (const f of newFiles) fs.rmSync(f, { force: true }); };
const compileDry = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'rb-')); const r = node(['tools/mapkit/compile.mjs', id], { MAP_OUT: d }); fs.rmSync(d, { recursive: true, force: true }); return { ok: r.status === 0, msg: ((r.stderr || '') + (r.stdout || '')).split('\n').filter((l) => /FAIL|rror|wanted|around|secretRoom/.test(l)).slice(0, 2).join(' | ') }; };

// ---- 3. find kit calls that compile, then the biggest roster the gates accept -----------------------------------------------------------------------------------------------------------------------
let chosen = null;
try {
  for (let nAmb = Math.min(needAmb, 2); nAmb >= 0 && !chosen; nAmb--) {
    let lines = null;
    for (let skip = 0; skip <= anchors.length && !lines; skip++) { const which = anchors.slice(skip); const l = kitLines(nAmb, which); fs.writeFileSync(srcFile, edit(l, [])); const c = compileDry(); if (c.ok) lines = l; else if (skip === anchors.length) say(`kit calls do not compile at ${nAmb} ambushes: ${c.msg}`); }
    if (!lines) continue;
    fs.writeFileSync(srcFile, edit(lines, []));
    say(`tuning with ${nAmb} added ambush(es), secret ${secretNeeded}`);
    const seen = new Set();
    for (const sc of steps.length ? SCALES : [[0, 0]]) {
      const plan = scaled(sc), key = JSON.stringify(plan); if (seen.has(key)) continue; seen.add(key);
      const r = node(['tools/dev/tune-roster.mjs', id, key]), out = (r.stdout || '').split(String.fromCharCode(10)), li = out.findIndex((l) => l.startsWith('plan 1:')), gates = out[li + 2] ?? '', laws0 = out[li + 1] ?? '';
      say(`  shooters x${sc[0]}, others x${sc[1]}: ${gates.includes('all pass') ? 'GATES PASS' : (gates.trim().slice(0, 120) || (r.stderr || 'no output').slice(0, 120))} ${laws0.includes('laws: met') ? '(laws met)' : ''}`);
      if (gates.includes('all pass')) { chosen = { lines, plan, nAmb, scale: sc }; break; }
    }
  }
  if (!chosen) { restore(); say('NOTHING PASSES the old bot\'s gates: restored. Needs a hand (or Bot v2).'); process.exit(1); }
  if (flag('dry')) { restore(); say('dry run: would write', JSON.stringify(chosen.plan), 'with', chosen.nAmb, 'ambushes'); process.exit(0); }
  fs.writeFileSync(srcFile, edit(chosen.lines, chosen.plan));
  let r = node(['tools/mapkit/compile.mjs', id]); if (r.status !== 0) throw new Error('final compile failed: ' + (r.stderr || r.stdout).slice(0, 300));
  const m2 = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
  if (secretNeeded && m2.secrets.length) { const sid = m2.secrets.at(-1).id, rf = P('routes', id + '.secret.route.json'); if (!fs.existsSync(rf)) newFiles.push(rf); r = node(['tools/dev/add-secret-route.mjs', id, sid, '--force']); if (r.status !== 0) throw new Error('secret route: ' + (r.stderr || r.stdout).slice(0, 300)); say(r.stdout.trim().split('\n')[0]); }
  r = node(['tools/verify-map.mjs', id]); const bad = (r.stdout || '').split('\n').filter((l) => l.startsWith('FAIL') && !/real-game evidence|shared browser check|THIS engine/.test(l));
  const mc = node(['tools/dev/map-check.mjs', id]), badMc = (mc.stdout || '').split('\n').filter((l) => l.startsWith('FAIL'));
  if (bad.length || badMc.length) throw new Error('GATES FAIL after the final compile: ' + [...bad, ...badMc].join(' | ').slice(0, 400));
  const row = auditMap(m2), v = laws(row), kk = {}; for (const e of m2.entities) if (e.type === 'enemy') kk[e.kind] = (kk[e.kind] ?? 0) + 1;
  say(`DONE ${row.enemies} creatures ${JSON.stringify(kk)} top ${row.topShare}% shoot ${row.rangedShare}% ambushes ${row.ambushes} secrets ${row.secrets} density ${row.density}; ${v.length ? 'laws NOT met: ' + v.join('; ') : 'laws met'}`);
  { const doc = readFloor(); doc.rebuilt = [...new Set([...(doc.rebuilt ?? []), id])].sort(); const wait = v.map((x) => (/kind over/.test(x) ? 'cap' : /shoot/.test(x) ? 'shooters' : /per thousand/.test(x) ? 'density' : null)).filter(Boolean), other = v.filter((x) => !/kind over|shoot|per thousand/.test(x));
    if (wait.length && !other.length) { (doc.waiting ??= {})[id] = { skip: wait, why: `the old stand-still bot's gates accept only part of the roster change (shooters x${chosen.scale[0]}, others x${chosen.scale[1]} of the plan); the rest waits for Bot v2` }; }
    if (other.length) doc.rebuilt = doc.rebuilt.filter((x) => x !== id);
    fs.writeFileSync(FLOOR_FILE, JSON.stringify(doc, null, 1)); node(['tools/dev/director-audit.mjs', '--ratchet']); }
  console.log(`RESULT ${JSON.stringify({ id, laws: v, topShare: row.topShare, shoot: row.rangedShare, ambushes: row.ambushes, secrets: row.secrets, plan: chosen.plan, scale: chosen.scale })}`);
} catch (e) { restore(); say('FAILED and restored:', String(e.message ?? e).slice(0, 400)); process.exit(1); }
