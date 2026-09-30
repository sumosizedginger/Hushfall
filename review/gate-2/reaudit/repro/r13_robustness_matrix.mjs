// R13: the full degraded-player matrix on the repaired sim, to check the author's own statement of what is still fragile (known-defects A04 'remaining').
// A strafing (weave) fighter through the harness options tremor (aim error) and ammoScale (ammo pickups worth less), on normal and hard, every canonical main route M02..M08 (+M01).
// Variants: aim 0.03 rad; pickups x0.75 (the gate's own); pickups x0.7; both aim 0.03 and pickups x0.75. Prints result/damage; FAIL rows are the ones that do not complete.
// Run from repo root: node review/gate-2/reaudit/repro/r13_robustness_matrix.mjs
import { loadMapFile, loadRouteFile, runRoute } from '../../../../src/engine/harness.js';
const variants = { 'aim0.03': { tremor: 0.03 }, 'ammo x0.75': { ammoScale: 0.75 }, 'ammo x0.7': { ammoScale: 0.7 }, 'aim+ammo': { tremor: 0.03, ammoScale: 0.75 } };
const fails = [];
for (const id of ['C1E1M01', 'C1E1M02', 'C1E1M03', 'C1E1M04', 'C1E1M05', 'C1E1M06', 'C1E1M07', 'C1E1M08']) {
  const map = loadMapFile(`maps/${id}.json`), route = loadRouteFile(`routes/${id}.main.route.json`);
  for (const difficulty of ['normal', 'hard']) {
    const cells = Object.entries(variants).map(([n, o]) => { const r = runRoute(map, route, { seed: 1, difficulty, weave: true, ...o }); const ok = r.result === 'complete'; if (!ok) fails.push(`${id} ${difficulty} ${n}: ${r.result}${r.failure ? ' (' + r.failure.slice(0, 40) + ')' : ''}`); return `${n}:${ok ? 'ok' : 'FAIL(' + r.result + ')'}/${r.world.stats.damageTaken}`; });
    console.log(id, difficulty.padEnd(6), cells.join('  '));
  }
}
console.log('\nnon-completing runs (' + fails.length + '):'); for (const f of fails) console.log('  ' + f);
