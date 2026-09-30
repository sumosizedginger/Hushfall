// R17: the balance gates judge the canonical route on ONE seed (seed 1; damage is averaged over seeds 1-3 but completion is only required for seed 1). How often does the same perfect stationary bot complete each map
// on each difficulty over seeds 1..N from the COLD start (entryLoadout, no carry)? A map that dies on a fifth of the seeds is on the edge for the bot itself, before any human factor.
// Run from repo root: node review/gate-2/reaudit/repro/r17_seed_completion_rates.mjs [N=8] [maps...]
import { loadMapFile, loadRouteFile, runRoute } from '../../../../src/engine/harness.js';
const N = Number(process.argv[2] || 8), ids = process.argv.slice(3).length ? process.argv.slice(3) : ['C1E1M02', 'C1E1M03', 'C1E1M04', 'C1E1M05', 'C1E1M06', 'C1E1M07', 'C1E1M08'];
for (const id of ids) {
  const map = loadMapFile(`maps/${id}.json`), route = loadRouteFile(`routes/${id}.main.route.json`);
  const row = ['easy', 'normal', 'hard'].map((d) => { let ok = 0, dead = 0, other = 0, dmg = []; for (let s = 1; s <= N; s++) { const r = runRoute(map, route, { seed: s, difficulty: d }); if (r.result === 'complete') ok++; else if (r.result === 'dead') dead++; else other++; dmg.push(r.world.stats.damageTaken); } return `${d} ${ok}/${N} complete${dead ? ', ' + dead + ' dead' : ''}${other ? ', ' + other + ' other' : ''} (damage ${Math.min(...dmg)}-${Math.max(...dmg)})`; });
  console.log(id, row.join(' | '));
}
