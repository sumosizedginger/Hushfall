// THE CAMPAIGN SWAPS PLANNER (2026-11-18, step 3 of the playtest list): for each map, a swap list (maps-src/roster-swaps.json) that brings the
// kinds the campaign has already introduced into the regular mix, tried against the same gates verify-map plays (tools/dev/tune-roster.mjs) and
// kept only when every gate passes. Node only, deterministic. Nobody moves and the enemy count stays the same.
// The aim, per map (not a boss arena, at least 15 creatures, after the first three maps): no kind over a third, the two commonest under 60%.
// How: Tollbearers become Sextons (once met, C1E1M05) and Choristers (C1E3M01); Gaunts become Gills (C1E2M05) and then Zealots (C2M09); Bellhands,
// the shooters, are never taken away. Then ONE heavier creature where the game has met it (a Bulwark, an Acolyte, a Wardengraft, a Resonant, a
// Mender in a pack, a Marksman on a long sightline), kept only if the gates still pass. Fewer swaps are tried when the full list fails.
//   node tools/dev/plan-swaps.mjs [--write] ID [ID ...]     (--write merges the passing lists into maps-src/roster-swaps.json)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadMapFile, runRouteEither } from '../../src/engine/harness.js';
import { evaluateViability, viabilityChecks, levelFacts, qualityChecks } from '../../src/engine/viability.js';
import { ENEMIES } from '../../src/engine/defs.js';
import { auditMap, laws } from './director-audit.mjs';

const root = path.resolve(import.meta.dirname, '../..'),
  args = process.argv.slice(2),
  WRITE = args.includes('--write'),
  ids = args.filter((a) => !a.startsWith('--'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'CAMPAIGN_MANIFEST.json'), 'utf8')).maps.map((m) => m.id);
// the first map each kind stands on (it is introduced there; a swap only uses a kind on a LATER map)
const firstOn = {};
for (const id of manifest) {
  const f = path.join(root, 'maps', id + '.json');
  if (!fs.existsSync(f)) continue;
  for (const e of JSON.parse(fs.readFileSync(f, 'utf8')).entities) if (e.type === 'enemy' && !(e.kind in firstOn)) firstOn[e.kind] = id;
}
const met = (kind, id) => kind in firstOn && manifest.indexOf(firstOn[kind]) < manifest.indexOf(id);

/** compile `id` with `swaps` into a scratch folder and play every gate; { ok, bad, counts, row } */
export function trySwaps(id, swaps) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'swaps-'));
  try {
    const r = spawnSync(process.execPath, [path.join(root, 'tools/mapkit/compile.mjs'), id], {
      cwd: root,
      env: { ...process.env, MAP_OUT: dir, ROSTER_ID: id, ROSTER_SWAPS: JSON.stringify(swaps) },
      encoding: 'utf8',
    });
    if (r.status !== 0) return { ok: false, bad: ['compile: ' + (r.stderr || r.stdout).slice(0, 160)] };
    const file = path.join(dir, id + '.json'),
      src = JSON.parse(fs.readFileSync(file, 'utf8')),
      map = loadMapFile(file),
      main = JSON.parse(fs.readFileSync(path.join(root, 'routes', id + '.main.route.json'), 'utf8'));
    const v = evaluateViability(map, main),
      checks = viabilityChecks(v, src.par?.time, { safe: !!src.quality?.safe });
    for (const c of qualityChecks(map, src.quality, levelFacts(map), v.normal.fighter.seconds)) checks.push(c);
    for (const rf of fs.readdirSync(path.join(root, 'routes')).filter((q) => q.startsWith(id + '.') && q.endsWith('.route.json')))
      for (const d of ['easy', 'normal', 'hard'])
        for (const seed of d === 'hard' ? [1, 2] : [1]) {
          const rr = runRouteEither(map, JSON.parse(fs.readFileSync(path.join(root, 'routes', rf), 'utf8')), { seed, difficulty: d });
          checks.push({ name: `${rf.replace('.route.json', '')} ${d} ${seed}`, ok: rr.result === 'complete', detail: rr.failure || rr.result });
        }
    const counts = {};
    for (const e of src.entities) if (e.type === 'enemy') counts[e.kind] = (counts[e.kind] ?? 0) + 1;
    const row = auditMap(src);
    return { ok: checks.every((c) => c.ok), bad: checks.filter((c) => !c.ok).map((c) => c.name.slice(0, 60)), counts, row, laws: laws(row) };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** the swap list a map would need to meet the aim, from its current counts (only kinds already met) */
export function proposal(id, counts, scale = 1) {
  const N = Object.values(counts).reduce((a, b) => a + b, 0),
    plan = [];
  const t = counts.tollbearer ?? 0,
    g = counts.gaunt ?? 0;
  let tOver = Math.max(0, t - Math.floor(N / 3)),
    gOver = Math.max(0, g - Math.floor(N * 0.27));
  tOver = Math.round(tOver * scale);
  gOver = Math.round(gOver * scale);
  // a Sexton raises the fallen (twice each): one for every sixteen creatures at most, or a room of them turns a fight into a war of attrition.
  // The rest of the Tollbearers that are too many become the shooters the map has met: Choristers, else Gills
  const gTo = ['gill', 'zealot'].filter((k) => met(k, id));
  if (tOver) {
    const sex = met("sexton", id) ? Math.min(tOver, Math.max(1, Math.round(Math.max(1, Math.floor(N / 16)) * scale)) - (counts.sexton ?? 0)) : 0;
    if (sex > 0) {
      plan.push({ from: 'tollbearer', to: 'sexton', n: sex, pick: 'spread' });
      tOver -= sex;
    }
    const shooter = met('chorister', id) ? 'chorister' : met('gill', id) ? 'gill' : null;
    if (tOver > 0 && shooter) plan.push({ from: 'tollbearer', to: shooter, n: tOver, pick: 'range' });
  }
  if (gOver && gTo.length) {
    const share = Math.ceil(gOver / gTo.length);
    for (const k of gTo) {
      const n = Math.min(share, gOver);
      if (n > 0) plan.push({ from: 'gaunt', to: k, n, pick: k === 'gill' ? 'range' : 'spread' });
      gOver -= n;
    }
  }
  return plan;
}
const HEAVIES = [
  ['bulwark', 'tollbearer', 'spread'],
  ['acolyte', 'tollbearer', 'spread'],
  ['resonant', 'tollbearer', 'spread'],
  ['wardengraft', 'tollbearer', 'spread'],
  ['mender', 'gaunt', 'spread'],
  ['marksman', 'tollbearer', 'range'],
];

const BOSSY = (counts) => Object.keys(counts).some((k) => ENEMIES[k]?.boss);
const out = {};
for (const id of ids) {
  const file = path.join(root, 'maps', id + '.json');
  if (!fs.existsSync(path.join(root, 'maps-src', id + '.level.mjs'))) {
    console.log(id, 'no source: left alone');
    continue;
  }
  const src = JSON.parse(fs.readFileSync(file, 'utf8')),
    counts = {};
  for (const e of src.entities) if (e.type === 'enemy' && !ENEMIES[e.kind]?.node && !ENEMIES[e.kind]?.peaceful) counts[e.kind] = (counts[e.kind] ?? 0) + 1;
  const N = Object.values(counts).reduce((a, b) => a + b, 0);
  if (BOSSY(counts) || N < 15) {
    console.log(id, BOSSY(counts) ? 'a boss arena: step 5' : `${N} creatures: left alone`);
    continue;
  }
  const t0 = Date.now();
  let best = null;
  for (const scale of [1, 0.66, 0.4, 0.2]) {
    const plan = proposal(id, counts, scale);
    if (!plan.length) break;
    const r = trySwaps(id, plan);
    console.log(id, 'scale', scale, JSON.stringify(plan), r.ok ? 'PASS' : 'fail ' + r.bad.slice(0, 3).join(' | '));
    if (r.ok) {
      best = { plan, r };
      break;
    }
  }
  const base = best?.plan ?? [];
  for (const [kind, from, pick] of HEAVIES) {
    if (!met(kind, id)) continue;
    const left = (counts[from] ?? 0) - base.filter((s) => s.from === from).reduce((a, s) => a + s.n, 0);
    if (left < 4) continue;
    const plan = [...base, { from, to: kind, n: 1, pick }],
      r = trySwaps(id, plan);
    console.log(id, '+', kind, r.ok ? 'PASS' : 'fail ' + r.bad.slice(0, 2).join(' | '));
    if (r.ok) {
      best = { plan, r };
      break;
    }
  }
  if (best) {
    out[id] = best.plan.map((s) => ({ ...s, why: 'the campaign mix (2026-11-18 playtest list, step 3)' }));
    const c = best.r.counts,
      M = Object.values(c).reduce((a, b) => a + b, 0),
      s = Object.values(c).sort((a, b) => b - a);
    console.log(
      `${id} KEPT ${JSON.stringify(c)} top ${Math.round((100 * s[0]) / M)}% top two ${Math.round((100 * (s[0] + (s[1] ?? 0))) / M)}% laws: ${best.r.laws.join('; ') || 'met'} (${Math.round((Date.now() - t0) / 1000)} s)`,
    );
  } else console.log(id, 'NOTHING PASSED: left as it is');
}
if (WRITE && Object.keys(out).length) {
  const f = path.join(root, 'maps-src', 'roster-swaps.json'),
    cur = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
  Object.assign(cur, out);
  const sorted = Object.fromEntries(Object.keys(cur).sort((a, b) => manifest.indexOf(a) - manifest.indexOf(b)).map((k) => [k, cur[k]]));
  fs.writeFileSync(f, JSON.stringify(sorted, null, 1) + '\n');
  console.log('wrote', Object.keys(out).length, 'maps into maps-src/roster-swaps.json');
}
