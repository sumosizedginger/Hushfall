// The encounter half of the level floors, for one map (PT-083 L2, L4; D2): it writes maps-src/skill/<ID>.json, compiles the map and holds the result to every node gate, backing off until they pass.
//   all   creatures on every difficulty: enough to reach the density floor, and two near the middle of a long walk with nothing awake
//   hard  a quarter more creatures on Hard only (appended last, so no id on Easy or Normal moves)
//   easy  about one in seven left out on Easy (they keep their ids)
//   node tools/dev/level-pass.mjs <ID> [--no-all] [--no-skill] [--jobs-note]    prints one line: what it kept. Run it from a checkout nobody is editing.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadMapFile, loadRouteFile, runRoute } from '../../src/engine/harness.js';
import { ENEMIES } from '../../src/engine/defs.js';
import { sidecarFile, readSidecar } from '../mapkit/skill.mjs';
import { auditAll } from './director-audit.mjs';
import { readFloorDoc } from './floors.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const id = process.argv[2],
  flags = process.argv.slice(3);
if (!id) throw new Error('usage: level-pass.mjs <ID>');
const compileNow = () => {
  if (fs.existsSync(path.join(root, 'maps-src', id + '.level.mjs')))
    execFileSync(process.execPath, ['tools/mapkit/compile.mjs', id], { cwd: root, stdio: 'ignore' });
  else execFileSync(process.execPath, ['tools/mapkit/skill.mjs', id], { cwd: root, stdio: 'ignore' });
};
const writeSide = (s) => {
  fs.mkdirSync(path.dirname(sidecarFile(id)), { recursive: true });
  fs.writeFileSync(sidecarFile(id), JSON.stringify(s, null, 1) + '\n');
};
const base = readSidecar(id) ?? {},
  ambushOnly = flags.includes('--ambush');
if (!ambushOnly) {
  writeSide({ ...base, all: [], hard: [], easy: [] });
  compileNow();
} else {
  writeSide({ ...base, ambush: [] });
  compileNow();
}

const row = auditAll().find((r) => r.id === id),
  doc = readFloorDoc(),
  ex = doc.excused?.[id] ?? {};
const map = loadMapFile(path.join(root, 'maps', id + '.json')),
  src = JSON.parse(fs.readFileSync(path.join(root, 'maps', id + '.json'), 'utf8')),
  S = map.cell;

// the lane: where the player walked on the main route, in order, and how long the walks with nothing awake were
const lane = [],
  seen = new Set();
let px = null,
  pz = null,
  run = 0,
  bestRun = 0,
  runCells = [],
  bestCells = [];
runRoute(map, loadRouteFile(path.join(root, 'routes', id + '.main.route.json')), {
  seed: 1,
  difficulty: 'normal',
  onTick: (w) => {
    const p = w.player,
      c = [Math.floor(p.x / S), Math.floor(p.z / S)],
      k = c.join(',');
    if (!seen.has(k)) {
      seen.add(k);
      lane.push(c);
    }
    const dm = px == null ? 0 : Math.hypot(p.x - px, p.z - pz);
    px = p.x;
    pz = p.z;
    const hot = w.enemies.some(
      (e) => e.state !== 'idle' && e.state !== 'dead' && !ENEMIES[e.kind]?.peaceful && !ENEMIES[e.kind]?.node && Math.hypot(e.x - p.x, e.z - p.z) < 25,
    );
    if (hot) {
      run = 0;
      runCells = [];
    } else {
      run += dm;
      runCells.push(c);
      if (run > bestRun) {
        bestRun = run;
        bestCells = [...runCells];
      }
    }
  },
});

// where a creature may stand: open floor off the lane, near it, in sight of it, away from anything else that stands, not behind a secret, not on a hazard
const taken = new Set(src.entities.map((e) => e.at.join(',')));
for (const d of src.doors ?? []) taken.add(d.at.join(','));
const secretCells = new Set((map.secrets ?? []).flatMap((s) => s.cells.map((c) => c.join(','))));
const spawn = [Math.floor(map.spawn.x / S), Math.floor(map.spawn.z / S)];
const openFloor = (x, z) => {
  const k = map.kind(x, z);
  if (k !== 'floor' && k !== 'outdoor') return false;
  const fx = map.fx?.(x, z);
  if (fx && fx !== '.') return false;
  return map.sectorAt(x, z) < 0;
};
const sees = (a, b) => {
  const n = Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) * 2;
  for (let i = 1; i < n; i++) {
    const x = Math.floor(a[0] + 0.5 + ((b[0] - a[0]) * i) / n),
      z = Math.floor(a[1] + 0.5 + ((b[1] - a[1]) * i) / n);
    if (!openFloor(x, z) && map.kind(x, z) === 'wall') return false;
  }
  return true;
};
const near = (c, r) => {
  for (let z = c[1] - r; z <= c[1] + r; z++) for (let x = c[0] - r; x <= c[0] + r; x++) if (taken.has(x + ',' + z)) return true;
  return false;
};
function spotNear(c, chosen, minD = 3, maxD = 9) {
  let best = null,
    bestScore = -1;
  for (let dz = -maxD; dz <= maxD; dz++)
    for (let dx = -maxD; dx <= maxD; dx++) {
      const x = c[0] + dx,
        z = c[1] + dz,
        d = Math.hypot(dx, dz),
        k = x + ',' + z;
      if (d < minD || d > maxD || x < 1 || z < 1 || x >= map.w - 1 || z >= map.h - 1) continue;
      if (!openFloor(x, z) || seen.has(k) || secretCells.has(k) || near([x, z], 1)) continue;
      if (Math.hypot(x - spawn[0], z - spawn[1]) < 8 || !sees([x, z], c)) continue;
      if (chosen.some((q) => Math.hypot(q[0] - x, q[1] - z) < 2.5)) continue;
      const score = 10 - Math.abs(d - 6);
      if (score > bestScore) {
        bestScore = score;
        best = [x, z];
      }
    }
  return best;
}

// the kinds this map already fights with: only the ordinary ones, the rarer more often than their share so a reinforcement is not all of the commonest
const roster = {};
for (const e of src.entities) {
  if (e.type !== 'enemy' || e.skill) continue;
  const d = ENEMIES[e.kind];
  if (!d || d.boss || d.node || d.peaceful || d.spawner || d.brood || d.support || d.armor || d.ward || e.hold) continue;
  roster[e.kind] = (roster[e.kind] ?? 0) + 1;
}
const kinds = Object.keys(roster).sort((a, b) => roster[b] - roster[a]);
if (!kinds.length) kinds.push('tollbearer');
const shooters = kinds.filter((k) => ENEMIES[k].ranged);
let kn = 0;
const nextKind = () => {
  kn++;
  if (shooters.length && kn % 3 === 0) return shooters[kn % shooters.length];
  return kinds[kn % kinds.length];
};
const faceTo = (from, to) => Math.atan2(to[0] - from[0], to[1] - from[1]);

function place(n, around, chosen) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const c = around(i);
    if (!c) continue;
    const s = spotNear(c, chosen);
    if (!s) continue;
    chosen.push(s);
    taken.add(s.join(','));
    out.push({ kind: nextKind(), at: s, facing: +faceTo(s, c).toFixed(3) });
  }
  return out;
}
const alongLane =
  (n, a = 0.1, b = 0.95) =>
  (i) =>
    lane[Math.floor(lane.length * (a + ((b - a) * (i + 0.5)) / n))];
const even = (n) => Math.max(0, n - (n % 2));

const chosen = [];
let all = [];
if (!flags.includes('--no-all')) {
  if (bestRun > 90 && !ex.quiet && bestCells.length) {
    const mid = bestCells[Math.floor(bestCells.length * 0.45)],
      mid2 = bestCells[Math.floor(bestCells.length * 0.7)];
    all.push(...place(2, (i) => (i ? mid2 : mid), chosen));
    if (bestRun > 150) all.push(...place(2, (i) => bestCells[Math.floor(bestCells.length * (i ? 0.85 : 0.25))], chosen));
  }
  if (!ex.density && !row.boss) {
    const want = even(Math.ceil((18.5 * row.walk) / 1000) - row.enemies - all.length + 1);
    if (want > 0) all.push(...place(want, alongLane(want), chosen));
  }
  if (all.length % 2) all = all.slice(0, -1);
}
const skillOn = !flags.includes('--no-skill') && !row.boss && row.enemies > 0;
let hard = skillOn
  ? place(even(Math.round(0.25 * (row.enemies + all.length))), alongLane(even(Math.round(0.25 * (row.enemies + all.length))), 0.05, 0.98), chosen)
  : [];
// the ones left out on Easy: spread over the map, never one a script or a door names
const plain = src.entities.filter(
  (e) => e.type === 'enemy' && !e.group && !e.hold && !ENEMIES[e.kind]?.boss && !ENEMIES[e.kind]?.node && !ENEMIES[e.kind]?.peaceful,
);
let easy = [];
if (skillOn) {
  const n = Math.round(row.enemies * 0.15);
  for (let i = 0; i < n && plain.length; i++) easy.push(plain[Math.floor(((i + 0.5) * plain.length) / n)].at);
}

function gates(strict = false) {
  let out = '';
  try {
    out = execFileSync(process.execPath, ['tools/dev/fun-gates.mjs', id], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...(strict ? {} : { NO_STRICT: '1' }) },
    });
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: String(e.stdout ?? '') + String(e.stderr ?? '') };
  }
}
// where two creatures can come from: open floor, out of sight of the place they are called from, not far by the floor
function hiddenNear(c, chosen) {
  let best = null,
    bestScore = -1;
  for (let dz = -16; dz <= 16; dz++)
    for (let dx = -16; dx <= 16; dx++) {
      const x = c[0] + dx,
        z = c[1] + dz,
        d = Math.hypot(dx, dz);
      if (d < 7 || d > 16 || x < 1 || z < 1 || x >= map.w - 1 || z >= map.h - 1) continue;
      if (!openFloor(x, z) || secretCells.has(x + ',' + z) || near([x, z], 1) || sees([x, z], c)) continue;
      if (chosen.some((q) => Math.hypot(q[0] - x, q[1] - z) < 2.5)) continue;
      const score = 16 - d;
      if (score > bestScore) {
        bestScore = score;
        best = [x, z];
      }
    }
  return best;
}
let ambush = [];
if (ambushOnly && bestRun > 90 && bestCells.length) {
  const stops = bestRun > 150 ? [0.3, 0.65] : [0.45];
  for (const f of stops) {
    const c = bestCells[Math.floor(bestCells.length * f)],
      spawn = [];
    for (let i = 0; i < 3; i++) {
      const s = hiddenNear(c, chosen);
      if (!s) break;
      chosen.push(s);
      spawn.push({ kind: nextKind(), at: s });
    }
    if (spawn.length) ambush.push({ at: c, radius: 3, spawn });
  }
}
const apply = () => {
  if (ambushOnly) writeSide({ ...base, ambush });
  else writeSide({ ...base, all, hard, easy });
  compileNow();
};
if (ambushOnly) {
  all = [];
  hard = [];
  easy = [];
}
apply();
let g = gates(),
  tries = 0;
// the quick gates first; the strict per-map tests only on a set that passes them
if (g.ok) g = gates(true);
while (!g.ok && tries < 9) {
  tries++;
  const text = g.out,
    easyBad = /\beasy\b/i.test(text),
    hardBad = /\bhard\b/i.test(text);
  // back off what the failure names; when it names nothing (a normal run, a placement), what is new on every difficulty goes first
  if (ambushOnly) {
    const last = ambush.at(-1);
    if (!last) break;
    if (last.spawn.length > 1) last.spawn.pop();
    else ambush.pop();
  } else if (hardBad && hard.length) hard = hard.slice(0, even(hard.length - 2));
  else if (easyBad && easy.length) easy = easy.slice(0, Math.floor(easy.length * 0.6));
  else if (all.length) all = all.slice(0, even(all.length - 2));
  else if (hard.length) hard = hard.slice(0, even(hard.length - 2));
  else if (easy.length) easy = [];
  else break;
  apply();
  g = gates();
  if (g.ok) g = gates(true);
}
if (!g.ok) {
  all = [];
  hard = [];
  easy = [];
  ambush = [];
  apply();
  g = gates(true);
}
console.log(
  `${g.ok ? 'PASS' : 'FAIL'} ${id}: walk ${row.walk}, ${row.enemies} creatures, quiet ${Math.round(bestRun)} m; kept all ${all.length}, hard ${hard.length}, easy ${easy.length}, ambush ${ambush.map((a) => a.spawn.length).join('+') || 0} (${tries} back-offs)`,
);
if (!g.ok)
  console.log(
    g.out
      .split('\n')
      .filter((l) => /FAIL|^\s{3}/.test(l))
      .slice(0, 6)
      .join('\n'),
  );
process.exit(g.ok ? 0 : 1);
