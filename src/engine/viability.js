// Level viability and quality: what a map must demonstrate before it can be called AGENT_VERIFIED. Shared by tools/verify-map.mjs and the tests,
// so the gate the tools apply and the gate the tests apply cannot drift apart. Pure: maps and routes in, plain data out.
import { runRoute } from './harness.js';
import { analyseReach } from './reach.js';
import { WALL_SKINS, FLOOR_SKINS } from './defs.js';

const DIFFS = ['easy', 'normal', 'hard'];

/** run the main route with a perfect fighter and a passive runner on every difficulty */
export function evaluateViability(map, mainRoute, { seed = 1 } = {}) {
  const out = {};
  for (const difficulty of DIFFS) {
    const runner = runRoute(map, mainRoute, { seed, difficulty, fights: false }), fighter = runRoute(map, mainRoute, { seed, difficulty });
    const seeds = [seed, seed + 1, seed + 2], meanDamage = Math.round(seeds.reduce((a, sd) => a + (sd === seed ? fighter : runRoute(map, mainRoute, { seed: sd, difficulty })).world.stats.damageTaken, 0) / seeds.length);      // damage is noisy per seed: ordering is judged on the mean of three
    out[difficulty] = {
      runner: { result: runner.result, damage: runner.world.stats.damageTaken, hpLeft: runner.world.player.hp },
      fighter: { result: fighter.result, damage: fighter.world.stats.damageTaken, meanDamage, seconds: +(fighter.ticks / 60).toFixed(1), kills: fighter.world.stats.kills, failure: fighter.failure },
    };
  }
  return out;
}

/** objective checks of a viability result: [{name, ok, detail}] */
export function viabilityChecks(v, par, { safe = false } = {}) {
  const c = [];
  // a safe room (quality.safe: no enemies by design) only has to be completable; there is nothing to survive, so the runner/damage gates do not apply
  if (safe) { for (const d of DIFFS) c.push({ name: `safe room ${d}: the route completes`, ok: v[d].fighter.result === 'complete', detail: v[d].fighter.failure || v[d].fighter.result }); return c; }
  for (const d of DIFFS) c.push({ name: `viability ${d}: a passive runner does not walk through (${v[d].runner.result}, ${v[d].runner.damage} damage)`, ok: v[d].runner.result !== 'complete' || v[d].runner.damage >= 60, detail: '' });
  for (const d of DIFFS) c.push({ name: `viability ${d}: a perfect fighter completes the level`, ok: v[d].fighter.result === 'complete', detail: v[d].fighter.failure || v[d].fighter.result });
  c.push({ name: 'viability: a perfect fighter takes real damage on normal and hard (>= 10 / >= 25)', ok: v.normal.fighter.meanDamage >= 10 && v.hard.fighter.meanDamage >= 25, detail: JSON.stringify({ normal: v.normal.fighter.meanDamage, hard: v.hard.fighter.meanDamage }) });
  c.push({ name: 'viability: damage rises with difficulty (easy < normal, easy < hard, hard >= 80% of normal: a deterministic bot takes a handful of hits, so hit counts jitter)', ok: v.easy.fighter.meanDamage < v.normal.fighter.meanDamage && v.easy.fighter.meanDamage < v.hard.fighter.meanDamage && v.hard.fighter.meanDamage >= 0.8 * v.normal.fighter.meanDamage, detail: [v.easy, v.normal, v.hard].map((x) => x.fighter.meanDamage).join(' < ') + ' (mean of 3 seeds)' });
  if (par) { const ratio = par / v.normal.fighter.seconds; c.push({ name: `par time is 2x-8x the bot's time (${ratio.toFixed(1)}x; placeholder until a human plays it)`, ok: ratio >= 2 && ratio <= 8, detail: '' }); }
  return c;
}

/** structural facts a level's `quality` block can be checked against */
export function levelFacts(map) {
  const kinds = {}; for (const e of map.entities) if (e.type === 'enemy') kinds[e.kind] = (kinds[e.kind] || 0) + 1;
  const keys = new Set(map.entities.filter((e) => e.type === 'pickup' && e.kind.startsWith('key_')).map((e) => e.kind));
  const wallSkins = new Set(), floorSkins = new Set();
  for (let z = 0; z < map.h; z++) for (let x = 0; x < map.w; x++) { const c = map.tile(x, z); if (c in WALL_SKINS) wallSkins.add(c); else if (c in FLOOR_SKINS) floorSkins.add(c); }
  let maxFloor = 0; if (!map.flat) for (let z = 0; z < map.h; z++) for (let x = 0; x < map.w; x++) if (map.kind(x, z) !== 'wall') maxFloor = Math.max(maxFloor, map.floor(x, z));
  let fx = 0; if (map.fxRows) for (let z = 0; z < map.h; z++) for (let x = 0; x < map.w; x++) if (map.fx(x, z)) fx++;
  return {
    enemies: map.entities.filter((e) => e.type === 'enemy').length, enemyKinds: kinds, keys: keys.size, closets: [...map.doors.values()].filter((d) => d.closet).length, triggers: map.triggers.length, switches: map.switches.length,
    sectors: map.sectors.length, heights: !map.flat && maxFloor > 0, maxFloor, fxCells: fx, skins: wallSkins.size + floorSkins.size, wallSkins: [...wallSkins], floorSkins: [...floorSkins],
    props: map.entities.filter((e) => e.type === 'prop').length, secrets: map.secrets.length, cells: map.w * map.h,
  };
}

/** check a map's declared `quality` contract against its facts and its measured bot time: [{name, ok, detail}] */
export function qualityChecks(map, q, facts, botSeconds) {
  if (!q) return [];
  const c = [], add = (name, ok, detail = '') => c.push({ name: 'quality: ' + name, ok: !!ok, detail });
  if (q.enemies) add(`enemy count in [${q.enemies}]`, facts.enemies >= q.enemies[0] && facts.enemies <= q.enemies[1], facts.enemies);
  if (q.botSeconds) add(`perfect-bot time in [${q.botSeconds}] s`, botSeconds >= q.botSeconds[0] && botSeconds <= q.botSeconds[1], botSeconds + ' s');
  if (q.skins) add(`uses at least ${q.skins} distinct wall/floor skins`, facts.skins >= q.skins, facts.skins);
  for (const m of q.mechanics || []) {
    const need = m.startsWith('keys>=') ? [facts.keys >= Number(m.slice(6)), 'keys ' + facts.keys] : { heights: [facts.heights, 'max floor ' + facts.maxFloor], closets: [facts.closets > 0, facts.closets + ' closets'], triggers: [facts.triggers > 0, facts.triggers + ' triggers'], switches: [facts.switches > 0, facts.switches + ' switches'], sectors: [facts.sectors > 0, facts.sectors + ' sectors'], hazards: [facts.fxCells > 0, facts.fxCells + ' hazard cells'], secret: [facts.secrets > 0, facts.secrets + ' secrets'] }[m];
    add(`uses mechanic '${m}'`, need?.[0], need?.[1] ?? 'unknown mechanic');
  }
  for (const [kind, n] of Object.entries(q.enemyKinds || {})) add(`has at least ${n} ${kind}`, (facts.enemyKinds[kind] || 0) >= n, facts.enemyKinds[kind] || 0);
  return c;
}

export { analyseReach };
